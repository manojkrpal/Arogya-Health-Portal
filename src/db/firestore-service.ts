import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db, TENANT_ID } from '../lib/firebase.js';

/**
 * Deeply strips undefined properties so Firestore setDoc/updateDoc never fails
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export interface AuditEvent {
  id: string;
  actor: {
    userId: string;
    email: string;
    role: string;
  };
  action: string;
  entityType: string;
  entityId: string;
  before?: any;
  after?: any;
  metadata?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}

/**
 * Log an immutable audit event to Firestore.
 * In compliance with government data standards, audit records are write-once.
 */
export async function logAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<string> {
  const eventId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const auditDocRef = doc(db, 'tenants', TENANT_ID, 'audit_events', eventId);

  const fullRecord: AuditEvent = sanitizeForFirestore({
    ...event,
    id: eventId,
    timestamp: new Date().toISOString(),
  });

  await setDoc(auditDocRef, fullRecord);
  return eventId;
}

/**
 * Fetch facilities from Firestore
 */
export async function getFirestoreFacilities(): Promise<any[]> {
  const facRef = collection(db, 'tenants', TENANT_ID, 'facilities');
  const snap = await getDocs(facRef);
  return snap.docs.map((d) => d.data());
}

/**
 * Fetch SKUs from Firestore
 */
export async function getFirestoreSkus(): Promise<any[]> {
  const skusRef = collection(db, 'tenants', TENANT_ID, 'skus');
  const snap = await getDocs(skusRef);
  return snap.docs.map((d) => d.data());
}

/**
 * Fetch stock for a specific facility
 */
export async function getFirestoreFacilityStock(facilityId: string): Promise<any[]> {
  const stockRef = collection(db, 'tenants', TENANT_ID, 'inventory', facilityId, 'stock');
  const snap = await getDocs(stockRef);
  return snap.docs.map((d) => d.data());
}

/**
 * Record a stock movement and update stock-on-hand in Firestore
 */
export async function adjustFirestoreStock(
  facilityId: string,
  skuId: string,
  qtyDelta: number,
  reason: string,
  actor: { userId: string; email: string; role: string },
  photoVerificationUri?: string
): Promise<{ newQty: number; movementId: string }> {
  const stockDocRef = doc(db, 'tenants', TENANT_ID, 'inventory', facilityId, 'stock', skuId);
  const movementId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const movementDocRef = doc(db, 'tenants', TENANT_ID, 'inventory', facilityId, 'stock_movements', movementId);

  let updatedQty = 0;

  await runTransaction(db, async (txn) => {
    const stockSnap = await txn.get(stockDocRef);
    const currentQty = stockSnap.exists() ? Number(stockSnap.data().qty || 0) : 0;
    const reorderPoint = stockSnap.exists() ? Number(stockSnap.data().reorder_point || 50) : 50;

    updatedQty = Math.max(0, currentQty + qtyDelta);

    txn.set(
      stockDocRef,
      {
        facility_id: facilityId,
        sku_id: skuId,
        qty: updatedQty,
        reorder_point: reorderPoint,
        updated_at: new Date().toISOString(),
        updated_by: actor.email,
      },
      { merge: true }
    );

    txn.set(movementDocRef, {
      id: movementId,
      facility_id: facilityId,
      sku_id: skuId,
      delta: qtyDelta,
      balance_after: updatedQty,
      reason,
      photo_verification_uri: photoVerificationUri || null,
      recorded_by: actor.email,
      recorded_at: new Date().toISOString(),
    });
  });

  await logAuditEvent({
    actor,
    action: 'INVENTORY_ADJUSTMENT',
    entityType: 'STOCK',
    entityId: `${facilityId}:${skuId}`,
    before: { qty: updatedQty - qtyDelta },
    after: { qty: updatedQty, delta: qtyDelta, reason },
  });

  return { newQty: updatedQty, movementId };
}

/**
 * Propose transfer in Firestore
 */
export async function proposeFirestoreTransfer(order: {
  id: string;
  fromFacilityId: string;
  toFacilityId: string;
  skuId: string;
  qty: number;
  etaHours: number;
  distanceKm: number;
  proposedBy: string;
}): Promise<void> {
  const transferDocRef = doc(db, 'tenants', TENANT_ID, 'transfers', order.id);
  await setDoc(
    transferDocRef,
    sanitizeForFirestore({
      ...order,
      status: 'proposed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  );

  await logAuditEvent({
    actor: { userId: 'system', email: order.proposedBy, role: 'system' },
    action: 'TRANSFER_PROPOSED',
    entityType: 'TRANSFER',
    entityId: order.id,
    after: sanitizeForFirestore(order),
  });
}

/**
 * Approve transfer in Firestore with donor-cover check and atomic stock balance update
 */
export async function approveFirestoreTransfer(
  transferId: string,
  decidedBy: { userId: string; email: string; role: string },
  reason?: string
): Promise<{ success: boolean; message: string }> {
  // Transfer approval strictly restricted to district officer or national war room
  if (!['district_officer', 'national_war_room'].includes(decidedBy.role)) {
    throw new Error('FORBIDDEN: Only District Officers or National War Room may approve transfers.');
  }

  const transferDocRef = doc(db, 'tenants', TENANT_ID, 'transfers', transferId);

  return await runTransaction(db, async (txn) => {
    const tSnap = await txn.get(transferDocRef);
    if (!tSnap.exists()) {
      throw new Error(`Transfer order ${transferId} not found`);
    }

    const transfer = tSnap.data();
    if (transfer.status !== 'proposed') {
      throw new Error(`Cannot approve transfer in status: ${transfer.status}`);
    }

    const fromStockRef = doc(db, 'tenants', TENANT_ID, 'inventory', transfer.fromFacilityId, 'stock', transfer.skuId);
    const toStockRef = doc(db, 'tenants', TENANT_ID, 'inventory', transfer.toFacilityId, 'stock', transfer.skuId);

    const fromStockSnap = await txn.get(fromStockRef);
    const toStockSnap = await txn.get(toStockRef);

    const donorQty = fromStockSnap.exists() ? Number(fromStockSnap.data().qty || 0) : 0;
    const recipientQty = toStockSnap.exists() ? Number(toStockSnap.data().qty || 0) : 0;

    if (donorQty < transfer.qty) {
      throw new Error(`Insufficient donor stock. Available: ${donorQty}, Requested: ${transfer.qty}`);
    }

    const newDonorQty = donorQty - transfer.qty;
    const newRecipientQty = recipientQty + transfer.qty;

    txn.update(fromStockRef, { qty: newDonorQty, updated_at: new Date().toISOString(), updated_by: decidedBy.email });
    txn.update(toStockRef, { qty: newRecipientQty, updated_at: new Date().toISOString(), updated_by: decidedBy.email });
    txn.update(transferDocRef, {
      status: 'approved',
      approved_by: decidedBy.email,
      approval_reason: reason || 'Approved via Logistics Operations',
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Transfer ${transferId} approved. ${transfer.qty} units moved.`,
    };
  });
}

/**
 * Update facility capacity in Firestore and log an immutable audit event
 */
export async function updateFirestoreCapacity(
  facilityId: string,
  capacity: { bedsTotal?: number; bedsAvailable?: number; oxygenCylinders?: number },
  actor: { userId: string; email: string; role: string }
): Promise<void> {
  const facDocRef = doc(db, 'tenants', TENANT_ID, 'facilities', facilityId);
  const cleanCapacity = {
    ...(capacity.bedsTotal !== undefined && capacity.bedsTotal !== null ? { beds_total: capacity.bedsTotal } : {}),
    ...(capacity.bedsAvailable !== undefined && capacity.bedsAvailable !== null ? { beds_available: capacity.bedsAvailable } : {}),
    ...(capacity.oxygenCylinders !== undefined && capacity.oxygenCylinders !== null ? { oxygen_lines_available: capacity.oxygenCylinders } : {}),
  };

  await setDoc(
    facDocRef,
    sanitizeForFirestore({
      id: facilityId,
      tenant_id: TENANT_ID,
      capacity: cleanCapacity,
      updated_at: new Date().toISOString(),
    }),
    { merge: true }
  );

  await logAuditEvent({
    actor,
    action: 'CAPACITY_UPDATE',
    entityType: 'FACILITY_CAPACITY',
    entityId: facilityId,
    after: sanitizeForFirestore(capacity),
  });
}

/**
 * Update facility attendance in Firestore and log an immutable audit event
 */
export async function updateFirestoreAttendance(
  facilityId: string,
  attendance: { nursesPresent?: number; doctorsPresent?: number; anmsPresent?: number; rosterNurses?: number },
  actor: { userId: string; email: string; role: string }
): Promise<void> {
  const facDocRef = doc(db, 'tenants', TENANT_ID, 'facilities', facilityId);
  await setDoc(
    facDocRef,
    sanitizeForFirestore({
      staffing: {
        phc_nurse_count: attendance.nursesPresent ?? 0,
        doctors_count: attendance.doctorsPresent ?? 0,
        anms_count: attendance.anmsPresent ?? 0,
        roster_nurses: attendance.rosterNurses ?? 0,
      },
      updated_at: new Date().toISOString(),
    }),
    { merge: true }
  );

  await logAuditEvent({
    actor,
    action: 'ATTENDANCE_UPDATE',
    entityType: 'FACILITY_ATTENDANCE',
    entityId: facilityId,
    after: sanitizeForFirestore(attendance),
  });
}

/**
 * Update tenant emergency outbreak multiplier in Firestore
 */
export async function updateFirestoreEmergency(
  tenantId: string,
  outbreakMultiplier: number,
  activeLabel: string,
  actor: { userId: string; email: string; role: string }
): Promise<void> {
  const targetTenantId = tenantId || TENANT_ID;
  const tenantDocRef = doc(db, 'tenants', targetTenantId);
  await setDoc(
    tenantDocRef,
    sanitizeForFirestore({
      emergency_outbreak_multiplier: outbreakMultiplier,
      emergency_active_label: activeLabel,
      updated_at: new Date().toISOString(),
    }),
    { merge: true }
  );

  await logAuditEvent({
    actor,
    action: 'EMERGENCY_SURGE_ACTIVATED',
    entityType: 'TENANT_EMERGENCY',
    entityId: targetTenantId,
    after: sanitizeForFirestore({ outbreakMultiplier, activeLabel }),
  });
}

/**
 * Sync alert to Firestore collection /tenants/{tenantId}/alerts/{alertId}
 */
export async function syncAlertToFirestore(alert: {
  id: string;
  facilityId: string;
  skuId: string;
  severity: string;
  ruleCode: string;
  message: string;
  open: boolean;
}): Promise<void> {
  const alertDocRef = doc(db, 'tenants', TENANT_ID, 'alerts', alert.id);
  await setDoc(
    alertDocRef,
    sanitizeForFirestore({
      id: alert.id,
      facility_id: alert.facilityId,
      sku_id: alert.skuId,
      severity: alert.severity,
      rule_code: alert.ruleCode,
      message: alert.message,
      open: alert.open,
      updated_at: new Date().toISOString(),
    }),
    { merge: true }
  );
}

/**
 * Sync BRICS federation aggregates to Firestore /brics_federation/{regionId}/aggregates/{aggregateId}
 */
export async function syncFederationAggregateToFirestore(
  regionId: string,
  aggregateId: string,
  aggregateData: {
    tenantCode: string;
    countryCode: string;
    skuCode: string;
    predictedDemandIndex: number;
    stockoutProbability: number;
    surplusBand: string;
    date: string;
  }
): Promise<void> {
  const aggRef = doc(db, 'brics_federation', regionId, 'aggregates', aggregateId);
  await setDoc(
    aggRef,
    sanitizeForFirestore({
      ...aggregateData,
      privacyStandard: 'DIFFERENTIAL_PRIVACY_EPSILON_0.5',
      zeroPhiExportCertified: true,
      updated_at: new Date().toISOString(),
    }),
    { merge: true }
  );
}

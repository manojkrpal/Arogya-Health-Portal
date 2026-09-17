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

  const fullRecord: AuditEvent = {
    ...event,
    id: eventId,
    timestamp: new Date().toISOString(),
  };

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
  await setDoc(transferDocRef, {
    ...order,
    status: 'proposed',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await logAuditEvent({
    actor: { userId: 'system', email: order.proposedBy, role: 'system' },
    action: 'TRANSFER_PROPOSED',
    entityType: 'TRANSFER',
    entityId: order.id,
    after: order,
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

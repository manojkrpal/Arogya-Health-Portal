import { ProcurementPO } from '../types/client.js';
import { logAuditEvent } from '../db/firestore-service.js';

let PURCHASE_ORDERS: ProcurementPO[] = [
  {
    id: 'po-mh-2026-8801',
    poNumber: 'PO/MH/PHC/2026/8801',
    cdwHubName: 'Pune Central Drug Warehouse (CDW-MH-01)',
    supplierName: 'Haffkine Bio-Pharmaceutical Corporation Ltd.',
    skuCode: 'ORS-001',
    skuName: 'Oral Rehydration Salts WHO (1000 Box Consignment)',
    quantity: 12000,
    unitCostInr: 18.5,
    totalAmountInr: 222000,
    leadTimeDays: 4,
    deliveryType: 'bulk_consignment',
    status: 'ordered',
    orderedByEmail: 'procurement@maharashtra.gov.in',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    etaDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'po-mh-2026-8802',
    poNumber: 'PO/MH/PHC/2026/8802',
    cdwHubName: 'Pune Central Drug Warehouse (CDW-MH-01)',
    supplierName: 'Bharat Serums & Vaccines Ltd.',
    skuCode: 'INS-001',
    skuName: 'Human Insulin NPH 100IU/ml (Cold-Chain Expedited)',
    quantity: 800,
    unitCostInr: 145.0,
    totalAmountInr: 116000,
    leadTimeDays: 2,
    deliveryType: 'expedited_cold_courier',
    status: 'ordered',
    orderedByEmail: 'procurement@maharashtra.gov.in',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    etaDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
];

export async function getPurchaseOrders(): Promise<ProcurementPO[]> {
  return PURCHASE_ORDERS;
}

export async function createPurchaseOrder(params: {
  cdwHubName: string;
  supplierName: string;
  skuCode: string;
  skuName: string;
  quantity: number;
  unitCostInr: number;
  deliveryType: 'expedited_cold_courier' | 'bulk_consignment';
  actorEmail: string;
  actorRole: string;
  requestId: string;
}): Promise<ProcurementPO> {
  const leadTimeDays = params.deliveryType === 'expedited_cold_courier' ? 2 : 5;
  const poId = `po-mh-${Date.now()}`;
  const poNumber = `PO/MH/PHC/2026/${Math.floor(8800 + Math.random() * 1000)}`;
  const totalAmountInr = params.quantity * params.unitCostInr;
  const etaDate = new Date(Date.now() + leadTimeDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const newPO: ProcurementPO = {
    id: poId,
    poNumber,
    cdwHubName: params.cdwHubName || 'Pune Central Drug Warehouse (CDW-MH-01)',
    supplierName: params.supplierName,
    skuCode: params.skuCode,
    skuName: params.skuName,
    quantity: params.quantity,
    unitCostInr: params.unitCostInr,
    totalAmountInr,
    leadTimeDays,
    deliveryType: params.deliveryType,
    status: 'ordered',
    orderedByEmail: params.actorEmail,
    createdAt: new Date().toISOString(),
    etaDate,
  };

  PURCHASE_ORDERS.unshift(newPO);

  await logAuditEvent({
    actor: {
      userId: params.actorEmail,
      email: params.actorEmail,
      role: params.actorRole,
    },
    action: 'PURCHASE_ORDER_ISSUED',
    entityType: 'purchase_order',
    entityId: poId,
    metadata: {
      poNumber,
      skuCode: params.skuCode,
      quantity: params.quantity,
      totalAmountInr,
      deliveryType: params.deliveryType,
      requestId: params.requestId,
    },
  }).catch((err) => console.warn('[ProcurementAuditSync] Error logging PO:', err.message));

  return newPO;
}

export async function receivePurchaseOrder(params: {
  poId: string;
  actorEmail: string;
  actorRole: string;
  requestId: string;
}): Promise<ProcurementPO> {
  const po = PURCHASE_ORDERS.find((p) => p.id === params.poId);
  if (!po) {
    throw new Error(`Purchase order not found: ${params.poId}`);
  }

  po.status = 'received';

  await logAuditEvent({
    actor: {
      userId: params.actorEmail,
      email: params.actorEmail,
      role: params.actorRole,
    },
    action: 'PURCHASE_ORDER_CONSIGNMENT_RECEIVED',
    entityType: 'purchase_order',
    entityId: po.id,
    metadata: {
      poNumber: po.poNumber,
      skuCode: po.skuCode,
      quantityReceived: po.quantity,
      requestId: params.requestId,
    },
  }).catch((err) => console.warn('[ProcurementAuditSync] Error receiving PO:', err.message));

  return po;
}

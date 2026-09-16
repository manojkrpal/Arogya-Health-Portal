import { query } from '../db/db.js';

export interface ProposedTransferItem {
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  qty: number;
  distanceKm: number;
  etaHours: number;
  donorRemainingQty: number;
  donorRequiredCover: number;
}

// Great-circle Haversine formula
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Deterministic transfer optimizer
 * Only looks at candidate donors in the SAME tenant_id AND SAME country_code.
 * Enforces cold-chain rules, expiry checks, and the 7-day donor cover rule.
 */
export async function optimizeTransfersForShortage(
  recipientFacilityId: string,
  skuId: string,
  targetReplenishQty?: number
): Promise<ProposedTransferItem[]> {
  // 1. Fetch recipient facility details + tenant info
  const recipientRes = await query(
    `SELECT f.id, f.name, f.tenant_id, f.lat, f.lng, f.cold_chain_capable, t.country_code
     FROM facilities f
     JOIN tenants t ON t.id = f.tenant_id
     WHERE f.id = $1`,
    [recipientFacilityId]
  );
  if (recipientRes.rows.length === 0) {
    throw new Error(`Facility not found: ${recipientFacilityId}`);
  }
  const recipient = recipientRes.rows[0];

  // 2. Fetch SKU info
  const skuRes = await query(
    `SELECT id, code, name, cold_chain FROM skus WHERE id = $1`,
    [skuId]
  );
  if (skuRes.rows.length === 0) {
    throw new Error(`SKU not found: ${skuId}`);
  }
  const sku = skuRes.rows[0];

  // Rule 2 Check: Cold chain capability of destination facility
  if (sku.cold_chain && !recipient.cold_chain_capable) {
    throw new Error(
      `Cold-chain violation: SKU ${sku.code} requires cold storage, but ${recipient.name} is not cold-chain capable.`
    );
  }

  // 3. Fetch recipient stock and forecast to determine shortage needed
  const recipientStockRes = await query(
    `SELECT s.qty, s.reorder_point, COALESCE(fc.demand_qty_7d, 0) as demand_qty_7d
     FROM stock_on_hand s
     LEFT JOIN forecasts fc ON fc.facility_id = s.facility_id AND fc.sku_id = s.sku_id
     WHERE s.facility_id = $1 AND s.sku_id = $2`,
    [recipientFacilityId, skuId]
  );
  const curQty = recipientStockRes.rows[0]?.qty ?? 0;
  const demand7d = Number(recipientStockRes.rows[0]?.demand_qty_7d ?? 50);
  const reorderPoint = recipientStockRes.rows[0]?.reorder_point ?? 50;

  const neededQty =
    targetReplenishQty && targetReplenishQty > 0
      ? targetReplenishQty
      : Math.max(reorderPoint * 1.5 - curQty, demand7d - curQty, 20);

  if (neededQty <= 0) {
    return [];
  }

  // 4. Find candidate donor facilities
  // MUST have same tenant_id AND same country_code (Rule 1)
  // If cold chain, donor must be cold_chain_capable (Rule 2)
  const candidateDonorsRes = await query(
    `SELECT f.id, f.name, f.lat, f.lng, f.cold_chain_capable,
            COALESCE(s.qty, 0) as on_hand_qty,
            COALESCE(s.reorder_point, 0) as reorder_point,
            COALESCE(fc.demand_qty_7d, 0) as demand_qty_7d
     FROM facilities f
     JOIN tenants t ON t.id = f.tenant_id
     JOIN stock_on_hand s ON s.facility_id = f.id AND s.sku_id = $1
     LEFT JOIN forecasts fc ON fc.facility_id = f.id AND fc.sku_id = $1
     WHERE f.tenant_id = $2
       AND t.country_code = $3
       AND f.id <> $4
       ${sku.cold_chain ? 'AND f.cold_chain_capable = true' : ''}
     ORDER BY s.qty DESC`,
    [skuId, recipient.tenant_id, recipient.country_code, recipientFacilityId]
  );

  let remainingToTransfer = Math.ceil(neededQty);
  const proposedTransfers: ProposedTransferItem[] = [];

  for (const donor of candidateDonorsRes.rows) {
    if (remainingToTransfer <= 0) break;

    const donorQty = Number(donor.on_hand_qty);
    const donorDemand7d = Number(donor.demand_qty_7d);
    const donorReorder = Number(donor.reorder_point);

    // Rule 4: Donor cover rule:
    // After proposed transfer, donor remaining qty MUST be >= 7 * demand_qty_7d / 7 (i.e. demand_qty_7d)
    // If no forecast exists (0), fallback to reorder_point
    const requiredCover = donorDemand7d > 0 ? donorDemand7d : donorReorder;
    const maxSpareable = Math.max(0, donorQty - requiredCover);

    if (maxSpareable <= 0) {
      continue; // Donor cannot spare without violating 7-day cover
    }

    // Verify unexpired lots available at donor (Rule 3)
    const lotsRes = await query(
      `SELECT id, qty, expires_on
       FROM stock_lots
       WHERE facility_id = $1 AND sku_id = $2 AND expires_on >= CURRENT_DATE
       ORDER BY expires_on ASC`,
      [donor.id, skuId]
    );

    const totalValidLotQty = lotsRes.rows.reduce((sum: number, l: any) => sum + Number(l.qty), 0);
    const effectiveSpareable = Math.min(maxSpareable, totalValidLotQty);

    if (effectiveSpareable <= 0) continue;

    const transferQty = Math.min(remainingToTransfer, Math.floor(effectiveSpareable));
    if (transferQty <= 0) continue;

    const distanceKm = calculateHaversineDistance(
      donor.lat,
      donor.lng,
      recipient.lat,
      recipient.lng
    );
    // 40 km/h average rural road speed for ETA
    const etaHours = Math.max(0.5, Math.round((distanceKm / 40.0) * 10) / 10);

    proposedTransfers.push({
      fromFacilityId: donor.id,
      fromFacilityName: donor.name,
      toFacilityId: recipient.id,
      toFacilityName: recipient.name,
      skuId: sku.id,
      skuCode: sku.code,
      skuName: sku.name,
      qty: transferQty,
      distanceKm,
      etaHours,
      donorRemainingQty: donorQty - transferQty,
      donorRequiredCover: requiredCover,
    });

    remainingToTransfer -= transferQty;
  }

  return proposedTransfers;
}

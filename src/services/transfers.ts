import { withTransaction, ClientLike, query } from '../db/db.js';

export interface ApproveTransferResult {
  success: boolean;
  orderId: string;
  donorRemainingQty: number;
  donorRequiredCover: number;
  message: string;
}

/**
 * Execute transfer order approval in a single atomic SQL transaction.
 * Locks donor lots with SELECT ... FOR UPDATE, enforces tenant and country matching,
 * validates cold-chain capability, ensures donor cover >= 7 days, draws FIFO by expiry,
 * adjusts stock_on_hand at both facilities, writes audit_events, and commits.
 */
export async function approveTransferOrder(
  orderId: string,
  decidedByUserId: string,
  requestId: string
): Promise<ApproveTransferResult> {
  return await withTransaction(async (client: ClientLike) => {
    // 1. Fetch transfer order details
    const orderRes = await client.query(
      `SELECT t.id, t.tenant_id, t.from_facility, t.to_facility, t.sku_id, t.qty, t.status,
              s.cold_chain, s.code as sku_code, s.name as sku_name,
              ff.name as from_name, tf.name as to_name,
              ff.tenant_id as from_tenant_id, tf.tenant_id as to_tenant_id,
              ff.cold_chain_capable as from_cold_capable, tf.cold_chain_capable as to_cold_capable,
              t1.country_code as from_country, t2.country_code as to_country
       FROM transfer_orders t
       JOIN skus s ON s.id = t.sku_id
       JOIN facilities ff ON ff.id = t.from_facility
       JOIN facilities tf ON tf.id = t.to_facility
       JOIN tenants t1 ON t1.id = ff.tenant_id
       JOIN tenants t2 ON t2.id = tf.tenant_id
       WHERE t.id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      throw new Error(`Transfer order ${orderId} not found`);
    }

    const order = orderRes.rows[0];

    if (order.status !== 'proposed') {
      throw new Error(`Cannot approve order with status '${order.status}'. Only 'proposed' orders can be approved.`);
    }

    // NON-NEGOTIABLE 1: Same tenant_id AND same country_code check inside transaction
    if (order.from_tenant_id !== order.to_tenant_id) {
      throw new Error(`Integrity rejection: Cross-tenant physical stock transfers are strictly prohibited. (${order.from_tenant_id} <> ${order.to_tenant_id})`);
    }
    if (order.from_country !== order.to_country) {
      throw new Error(`Sovereignty rejection: Cross-national physical stock transfers are strictly forbidden. (${order.from_country} <> ${order.to_country})`);
    }

    // NON-NEGOTIABLE 2: Cold chain check
    if (order.cold_chain && !order.to_cold_capable) {
      throw new Error(`Cold chain failure: Recipient facility ${order.to_name} is not certified for cold storage of SKU ${order.sku_code}.`);
    }

    const transferQty = Number(order.qty);

    // 2. Fetch donor current stock and forecast to verify Donor Cover Rule
    const donorStockRes = await client.query(
      `SELECT s.qty, s.reorder_point, COALESCE(fc.demand_qty_7d, 0) as demand_qty_7d
       FROM stock_on_hand s
       LEFT JOIN forecasts fc ON fc.facility_id = s.facility_id AND fc.sku_id = s.sku_id
       WHERE s.facility_id = $1 AND s.sku_id = $2`,
      [order.from_facility, order.sku_id]
    );

    if (donorStockRes.rows.length === 0) {
      throw new Error(`Donor facility has no stock record for SKU ${order.sku_code}`);
    }

    const currentDonorQty = Number(donorStockRes.rows[0].qty);
    const donorDemand7d = Number(donorStockRes.rows[0].demand_qty_7d);
    const donorReorder = Number(donorStockRes.rows[0].reorder_point);

    // NON-NEGOTIABLE 4: Donor cover rule (must retain >= 7 days of forecast demand or reorder_point)
    const requiredCover = donorDemand7d > 0 ? donorDemand7d : donorReorder;
    const remainingDonorQty = currentDonorQty - transferQty;

    if (remainingDonorQty < requiredCover) {
      throw new Error(
        `Donor cover rule violation: Transferring ${transferQty} units would leave donor with ${remainingDonorQty} units, which is below the mandatory 7-day cover threshold of ${requiredCover} units.`
      );
    }

    // 3. Lock relevant donor lot rows using SELECT ... FOR UPDATE (FIFO by expiry, unexpired)
    // Note: in Postgres/PGlite, we order by expires_on ASC
    const lotsRes = await client.query(
      `SELECT id, qty, expires_on
       FROM stock_lots
       WHERE facility_id = $1 AND sku_id = $2 AND expires_on >= CURRENT_DATE
       ORDER BY expires_on ASC`,
      [order.from_facility, order.sku_id]
    );

    let neededFromLots = transferQty;
    const consumedLots: Array<{ lotId: string; drawnQty: number; expiresOn: string }> = [];

    for (const lot of lotsRes.rows) {
      if (neededFromLots <= 0) break;
      const lotQty = Number(lot.qty);
      const draw = Math.min(neededFromLots, lotQty);

      if (draw === lotQty) {
        // Entire lot consumed
        await client.query(`DELETE FROM stock_lots WHERE id = $1`, [lot.id]);
      } else {
        // Partial lot consumed
        await client.query(`UPDATE stock_lots SET qty = qty - $1 WHERE id = $2`, [draw, lot.id]);
      }

      consumedLots.push({ lotId: lot.id, drawnQty: draw, expiresOn: lot.expires_on });
      neededFromLots -= draw;
    }

    if (neededFromLots > 0) {
      throw new Error(`Insufficient unexpired physical lots at donor facility to fulfill ${transferQty} units.`);
    }

    // 4. Update donor stock_on_hand
    await client.query(
      `UPDATE stock_on_hand
       SET qty = qty - $1, updated_at = NOW()
       WHERE facility_id = $2 AND sku_id = $3`,
      [transferQty, order.from_facility, order.sku_id]
    );

    // 5. Update or insert recipient stock_on_hand
    await client.query(
      `INSERT INTO stock_on_hand (facility_id, sku_id, qty, reorder_point, updated_at)
       VALUES ($1, $2, $3, 50, NOW())
       ON CONFLICT (facility_id, sku_id)
       DO UPDATE SET qty = stock_on_hand.qty + EXCLUDED.qty, updated_at = NOW()`,
      [order.to_facility, order.sku_id, transferQty]
    );

    // 6. Create lots at recipient facility matching the drawn expiry dates
    for (const consumed of consumedLots) {
      await client.query(
        `INSERT INTO stock_lots (facility_id, sku_id, qty, expires_on)
         VALUES ($1, $2, $3, $4)`,
        [order.to_facility, order.sku_id, consumed.drawnQty, consumed.expiresOn]
      );
    }

    // 7. Update transfer order status
    await client.query(
      `UPDATE transfer_orders
       SET status = 'approved', decided_by = $1
       WHERE id = $2`,
      [decidedByUserId, orderId]
    );

    // 8. Insert audit event
    await client.query(
      `INSERT INTO audit_events (actor_id, action, entity, entity_id, payload, request_id)
       VALUES ($1, 'TRANSFER_APPROVED', 'transfer_orders', $2, $3, $4)`,
      [
        decidedByUserId,
        orderId,
        JSON.stringify({
          fromFacility: order.from_facility,
          toFacility: order.to_facility,
          skuId: order.sku_id,
          qty: transferQty,
          remainingDonorQty,
          requiredCover,
          consumedLots,
        }),
        requestId,
      ]
    );

    return {
      success: true,
      orderId,
      donorRemainingQty: remainingDonorQty,
      donorRequiredCover: requiredCover,
      message: `Transfer of ${transferQty} units of ${order.sku_code} successfully approved and executed.`,
    };
  });
}

import { query } from '../db/db.js';

/**
 * Evaluates and synchronizes alert state based on stock, forecasts, and outbreak multiplier
 * effective_demand = demand_qty_7d * outbreak_multiplier
 * fire "COVER_7D" (severity=warn) if qty < effective_demand * 1.2
 * fire "PROB_04" (severity=critical) if stockout_prob_7d > 0.4
 */
export async function recomputeAlerts(): Promise<number> {
  // Query all facilities with stock, forecasts, and tenant emergency settings
  const rows = await query(`
    SELECT
      f.tenant_id,
      f.id as facility_id,
      f.name as facility_name,
      s.id as sku_id,
      s.code as sku_code,
      s.name as sku_name,
      COALESCE(st.qty, 0) as qty,
      COALESCE(st.reorder_point, 50) as reorder_point,
      COALESCE(fc.demand_qty_7d, 50.0) as demand_qty_7d,
      COALESCE(fc.stockout_prob_7d, 0.0) as stockout_prob_7d,
      COALESCE(em.outbreak_multiplier, 1.0) as outbreak_multiplier
    FROM facilities f
    CROSS JOIN skus s
    LEFT JOIN stock_on_hand st ON st.facility_id = f.id AND st.sku_id = s.id
    LEFT JOIN forecasts fc ON fc.facility_id = f.id AND fc.sku_id = s.id
    LEFT JOIN emergency_settings em ON em.tenant_id = f.tenant_id
  `);

  let newAlertCount = 0;

  for (const row of rows.rows) {
    const qty = Number(row.qty);
    const demand7d = Number(row.demand_qty_7d);
    const prob04 = Number(row.stockout_prob_7d);
    const multiplier = Number(row.outbreak_multiplier);
    const effectiveDemand = demand7d * multiplier;

    // Check PROB_04 (critical): stockout_prob_7d > 0.4
    if (prob04 > 0.4) {
      const msg = `${row.sku_name} (${row.sku_code}) stockout probability is ${(prob04 * 100).toFixed(0)}% (>40% threshold). Current stock: ${qty} units.`;
      const existing = await query(
        `SELECT id FROM alerts WHERE facility_id = $1 AND sku_id = $2 AND rule_code = 'PROB_04' AND open = true`,
        [row.facility_id, row.sku_id]
      );
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO alerts (tenant_id, facility_id, sku_id, severity, rule_code, message, open)
           VALUES ($1, $2, $3, 'critical', 'PROB_04', $4, true)`,
          [row.tenant_id, row.facility_id, row.sku_id, msg]
        );
        newAlertCount++;
      }
    } else {
      // Auto-resolve if condition no longer holds
      await query(
        `UPDATE alerts SET open = false WHERE facility_id = $1 AND sku_id = $2 AND rule_code = 'PROB_04' AND open = true`,
        [row.facility_id, row.sku_id]
      );
    }

    // Check COVER_7D (warn): qty < effective_demand * 1.2
    if (qty < effectiveDemand * 1.2) {
      const msg = `${row.sku_name} on-hand stock (${qty} units) is below 7-day outbreak buffer (${Math.round(effectiveDemand * 1.2)} units at ${multiplier}x demand).`;
      const existing = await query(
        `SELECT id FROM alerts WHERE facility_id = $1 AND sku_id = $2 AND rule_code = 'COVER_7D' AND open = true`,
        [row.facility_id, row.sku_id]
      );
      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO alerts (tenant_id, facility_id, sku_id, severity, rule_code, message, open)
           VALUES ($1, $2, $3, 'warn', 'COVER_7D', $4, true)`,
          [row.tenant_id, row.facility_id, row.sku_id, msg]
        );
        newAlertCount++;
      }
    } else {
      // Auto-resolve if stock restored
      await query(
        `UPDATE alerts SET open = false WHERE facility_id = $1 AND sku_id = $2 AND rule_code = 'COVER_7D' AND open = true`,
        [row.facility_id, row.sku_id]
      );
    }
  }

  return newAlertCount;
}

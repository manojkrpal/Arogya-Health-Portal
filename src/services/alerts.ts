import { query } from '../db/db.js';
import { syncAlertToFirestore } from '../db/firestore-service.js';

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
        const ins = await query(
          `INSERT INTO alerts (tenant_id, facility_id, sku_id, severity, rule_code, message, open)
           VALUES ($1, $2, $3, 'critical', 'PROB_04', $4, true)
           RETURNING id`,
          [row.tenant_id, row.facility_id, row.sku_id, msg]
        );
        newAlertCount++;
        syncAlertToFirestore({
          id: ins.rows[0].id,
          facilityId: row.facility_id,
          skuId: row.sku_id,
          severity: 'critical',
          ruleCode: 'PROB_04',
          message: msg,
          open: true,
        }).catch((err) => console.warn('[FirestoreAlertSync] Warning:', err.message));
      }
    } else {
      // Auto-resolve if condition no longer holds
      const resolved = await query(
        `UPDATE alerts SET open = false WHERE facility_id = $1 AND sku_id = $2 AND rule_code = 'PROB_04' AND open = true RETURNING id`,
        [row.facility_id, row.sku_id]
      );
      for (const resRow of resolved.rows) {
        syncAlertToFirestore({
          id: resRow.id,
          facilityId: row.facility_id,
          skuId: row.sku_id,
          severity: 'critical',
          ruleCode: 'PROB_04',
          message: 'Resolved: stockout risk cleared',
          open: false,
        }).catch((err) => console.warn('[FirestoreAlertSync] Warning:', err.message));
      }
    }

    // Check COVER_7D (warn): qty < effective_demand * 1.2
    if (qty < effectiveDemand * 1.2) {
      const msg = `${row.sku_name} on-hand stock (${qty} units) is below 7-day outbreak buffer (${Math.round(effectiveDemand * 1.2)} units at ${multiplier}x demand).`;
      const existing = await query(
        `SELECT id FROM alerts WHERE facility_id = $1 AND sku_id = $2 AND rule_code = 'COVER_7D' AND open = true`,
        [row.facility_id, row.sku_id]
      );
      if (existing.rows.length === 0) {
        const ins = await query(
          `INSERT INTO alerts (tenant_id, facility_id, sku_id, severity, rule_code, message, open)
           VALUES ($1, $2, $3, 'warn', 'COVER_7D', $4, true)
           RETURNING id`,
          [row.tenant_id, row.facility_id, row.sku_id, msg]
        );
        newAlertCount++;
        syncAlertToFirestore({
          id: ins.rows[0].id,
          facilityId: row.facility_id,
          skuId: row.sku_id,
          severity: 'warn',
          ruleCode: 'COVER_7D',
          message: msg,
          open: true,
        }).catch((err) => console.warn('[FirestoreAlertSync] Warning:', err.message));
      }
    } else {
      // Auto-resolve if stock restored
      const resolved = await query(
        `UPDATE alerts SET open = false WHERE facility_id = $1 AND sku_id = $2 AND rule_code = 'COVER_7D' AND open = true RETURNING id`,
        [row.facility_id, row.sku_id]
      );
      for (const resRow of resolved.rows) {
        syncAlertToFirestore({
          id: resRow.id,
          facilityId: row.facility_id,
          skuId: row.sku_id,
          severity: 'warn',
          ruleCode: 'COVER_7D',
          message: 'Resolved: stock restored above 7-day cover threshold',
          open: false,
        }).catch((err) => console.warn('[FirestoreAlertSync] Warning:', err.message));
      }
    }
  }

  // -------------------------------------------------------------
  // STAGE 5: EXPIRY_WARNING Alerts (Lots expiring in <= 30 days)
  // -------------------------------------------------------------
  try {
    const expiringLots = await query(`
      SELECT
        l.id as lot_id,
        l.facility_id,
        f.tenant_id,
        f.name as facility_name,
        l.sku_id,
        s.code as sku_code,
        s.name as sku_name,
        l.qty,
        l.expires_on,
        (l.expires_on - CURRENT_DATE) as days_left
      FROM stock_lots l
      JOIN facilities f ON f.id = l.facility_id
      JOIN skus s ON s.id = l.sku_id
      WHERE l.qty > 0 AND l.expires_on <= CURRENT_DATE + INTERVAL '30 days'
    `);

    // Keep track of which (facility_id, sku_id) currently have expiring lots
    const activeExpiringSet = new Set<string>();

    for (const lot of expiringLots.rows) {
      const pairKey = `${lot.facility_id}_${lot.sku_id}`;
      activeExpiringSet.add(pairKey);

      const daysLeft = Math.max(0, parseInt(lot.days_left, 10));
      const expDate = lot.expires_on instanceof Date ? lot.expires_on.toISOString().slice(0, 10) : String(lot.expires_on).slice(0, 10);
      const msg = `EXPIRY ALERT: ${lot.sku_name} lot (${lot.qty} units) expires in ${daysLeft} days (${expDate}). Immediate first-line distribution or transfer recommended.`;

      const existing = await query(
        `SELECT id FROM alerts WHERE facility_id = $1 AND sku_id = $2 AND rule_code = 'EXPIRY_WARNING' AND open = true`,
        [lot.facility_id, lot.sku_id]
      );

      if (existing.rows.length === 0) {
        const ins = await query(
          `INSERT INTO alerts (tenant_id, facility_id, sku_id, severity, rule_code, message, open)
           VALUES ($1, $2, $3, 'warn', 'EXPIRY_WARNING', $4, true)
           RETURNING id`,
          [lot.tenant_id, lot.facility_id, lot.sku_id, msg]
        );
        newAlertCount++;
        syncAlertToFirestore({
          id: ins.rows[0].id,
          facilityId: lot.facility_id,
          skuId: lot.sku_id,
          severity: 'warn',
          ruleCode: 'EXPIRY_WARNING',
          message: msg,
          open: true,
        }).catch((err) => console.warn('[FirestoreAlertSync] Expiry alert sync warning:', err.message));
      }
    }

    // Auto-resolve EXPIRY_WARNING alerts that no longer have lots expiring in <= 30d
    const openExpAlerts = await query(
      `SELECT id, facility_id, sku_id FROM alerts WHERE rule_code = 'EXPIRY_WARNING' AND open = true`
    );
    for (const a of openExpAlerts.rows) {
      const pairKey = `${a.facility_id}_${a.sku_id}`;
      if (!activeExpiringSet.has(pairKey)) {
        await query(`UPDATE alerts SET open = false WHERE id = $1`, [a.id]);
        syncAlertToFirestore({
          id: a.id,
          facilityId: a.facility_id,
          skuId: a.sku_id,
          severity: 'warn',
          ruleCode: 'EXPIRY_WARNING',
          message: 'Resolved: Expiring lot cleared/consumed',
          open: false,
        }).catch((err) => console.warn('[FirestoreAlertSync] Warning:', err.message));
      }
    }
  } catch (expErr: any) {
    console.warn('[Alerts] Expiry warning check warning:', expErr.message);
  }

  // -------------------------------------------------------------
  // STAGE 5: TEMP_EXCURSION Alerts (Cold Chain < 2.0°C or > 8.0°C)
  // -------------------------------------------------------------
  try {
    const telemetryRows = await query(`
      SELECT DISTINCT ON (t.facility_id)
        t.facility_id,
        f.tenant_id,
        f.name as facility_name,
        t.device_id,
        t.temperature,
        t.battery_pct,
        t.recorded_at
      FROM cold_chain_telemetry t
      JOIN facilities f ON f.id = t.facility_id
      WHERE f.cold_chain_capable = true
      ORDER BY t.facility_id, t.recorded_at DESC
    `);

    for (const tel of telemetryRows.rows) {
      const temp = parseFloat(tel.temperature);
      const isExcursion = temp < 2.0 || temp > 8.0;

      if (isExcursion) {
        const breachType = temp > 8.0 ? 'Heat Excursion' : 'Freezing Hazard';
        const msg = `CRITICAL COLD-CHAIN BREACH (${breachType}): Device ${tel.device_id} recorded ${temp.toFixed(1)}°C (Safe band: 2.0°C - 8.0°C). Immediate inspection required to protect potency of vaccines and insulin.`;

        const existing = await query(
          `SELECT id FROM alerts WHERE facility_id = $1 AND rule_code = 'TEMP_EXCURSION' AND open = true`,
          [tel.facility_id]
        );

        if (existing.rows.length === 0) {
          const ins = await query(
            `INSERT INTO alerts (tenant_id, facility_id, sku_id, severity, rule_code, message, open)
             VALUES ($1, $2, NULL, 'critical', 'TEMP_EXCURSION', $3, true)
             RETURNING id`,
            [tel.tenant_id, tel.facility_id, msg]
          );
          newAlertCount++;
          syncAlertToFirestore({
            id: ins.rows[0].id,
            facilityId: tel.facility_id,
            skuId: null,
            severity: 'critical',
            ruleCode: 'TEMP_EXCURSION',
            message: msg,
            open: true,
          }).catch((err) => console.warn('[FirestoreAlertSync] Telemetry alert sync warning:', err.message));
        }
      } else {
        // Temperature normalized, resolve any open TEMP_EXCURSION alerts
        const resolved = await query(
          `UPDATE alerts SET open = false WHERE facility_id = $1 AND rule_code = 'TEMP_EXCURSION' AND open = true RETURNING id` ,
          [tel.facility_id]
        );
        for (const resRow of resolved.rows) {
          syncAlertToFirestore({
            id: resRow.id,
            facilityId: tel.facility_id,
            skuId: null,
            severity: 'critical',
            ruleCode: 'TEMP_EXCURSION',
            message: 'Resolved: Cold-chain temperature restored within safe 2°C - 8°C range',
            open: false,
          }).catch((err) => console.warn('[FirestoreAlertSync] Warning:', err.message));
        }
      }
    }
  } catch (telErr: any) {
    console.warn('[Alerts] Telemetry excursion check warning:', telErr.message);
  }

  return newAlertCount;
}


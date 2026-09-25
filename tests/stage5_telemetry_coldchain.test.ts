import assert from 'assert';
import http from 'http';
import express from 'express';
import { apiRouter } from '../src/routes/api.js';
import { generateToken } from '../src/services/auth.js';
import { query, initDb } from '../src/db/db.js';
import { recomputeAlerts } from '../src/services/alerts.js';

async function main() {
  console.log('================================================================');
  console.log('   AROGYANET LEVEL 2 — STAGE 5 TELEMETRY & COLD-CHAIN SUITE     ');
  console.log('================================================================');

  await initDb();

  // Create test server
  const app = express();
  app.use(express.json());
  app.use('/v1', apiRouter);

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/v1`;

  // Fetch facilities and tenant
  const facRes = await query(`SELECT id, code, name FROM facilities WHERE code = 'PHC-SHIRUR'`);
  const shirurId = facRes.rows[0].id;

  const mancharRes = await query(`SELECT id, code, name FROM facilities WHERE code = 'CHC-MANCHAR'`);
  const mancharId = mancharRes.rows[0].id;

  const tenantRes = await query(`SELECT id, name FROM tenants WHERE code = 'MH-PUNE-RURAL'`);
  const tenantId = tenantRes.rows[0].id;

  const skuRes = await query(`SELECT id, code FROM skus WHERE code = 'INS-REG-40'`);
  const insulinId = skuRes.rows[0].id;

  // Fetch users for tokens
  const usersRes = await query('SELECT id, email, role, tenant_id, facility_id FROM users');
  const userMap = new Map<string, any>();
  usersRes.rows.forEach((u) => {
    userMap.set(u.role, u);
  });

  const officerUser = userMap.get('district_officer') || { id: '90000000-0000-0000-0000-000000000002', email: 'officer@pune.health.gov.in', tenant_id: tenantId, facility_id: null };
  const nurseUser = userMap.get('phc_nurse') || { id: '90000000-0000-0000-0000-000000000001', email: 'nurse@shirur.phc.gov.in', tenant_id: tenantId, facility_id: shirurId };
  const bricsUser = userMap.get('brics_analyst') || { id: '90000000-0000-0000-0000-000000000004', email: 'analyst@brics-health.org', tenant_id: tenantId, facility_id: null };
  const complianceUser = userMap.get('compliance_auditor') || { id: '90000000-0000-0000-0000-000000000007', email: 'auditor@mohfw.gov.in', tenant_id: tenantId, facility_id: null };

  // Tokens
  const officerToken = generateToken({
    userId: officerUser.id,
    email: officerUser.email,
    role: 'district_officer',
    tenantId: officerUser.tenant_id,
    facilityId: officerUser.facility_id,
  });

  const nurseToken = generateToken({
    userId: nurseUser.id,
    email: nurseUser.email,
    role: 'phc_nurse',
    tenantId: nurseUser.tenant_id,
    facilityId: nurseUser.facility_id || shirurId,
  });

  const bricsToken = generateToken({
    userId: bricsUser.id,
    email: bricsUser.email,
    role: 'brics_analyst',
    tenantId: bricsUser.tenant_id,
    facilityId: null,
  });

  const complianceToken = generateToken({
    userId: complianceUser.id,
    email: complianceUser.email,
    role: 'compliance_auditor' as any,
    tenantId: complianceUser.tenant_id,
    facilityId: null,
  });

  // Helper fetch
  async function apiFetch(path: string, options: any = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { rawText: text };
    }
    return { status: res.status, data: json };
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: GET /v1/telemetry/live - Returns Cold-Chain Sensor Telemetry
    // -------------------------------------------------------------
    console.log('[TEST 1] Testing live cold-chain IoT telemetry retrieval...');
    const telRes = await apiFetch('/telemetry/live', {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert.strictEqual(telRes.status, 200, 'District officer should receive 200 OK for telemetry');
    assert(Array.isArray(telRes.data.sensors), 'Should return sensors array');
    assert(telRes.data.sensors.length >= 2, 'Should have at least 2 cold-chain sensors');
    assert(telRes.data.summary.totalUnits >= 2, 'Summary total units should match sensors');
    assert(telRes.data.summary.coldChainCompliancePct >= 0, 'Should have compliance percentage');
    console.log(`  ✓ Retrieved ${telRes.data.sensors.length} cold-chain sensors with ${telRes.data.summary.coldChainCompliancePct}% compliance.`);

    // -------------------------------------------------------------
    // TEST 2: Sovereign Isolation - BRICS Analyst blocked with HTTP 403
    // -------------------------------------------------------------
    console.log('[TEST 2] Testing BRICS analyst isolation on telemetry & route endpoints...');
    const bricsTel = await apiFetch('/telemetry/live', {
      headers: { Authorization: `Bearer ${bricsToken}` },
    });
    assert.strictEqual(bricsTel.status, 403, 'BRICS analyst must be rejected from live telemetry (403)');

    const bricsRadar = await apiFetch('/expiry/radar', {
      headers: { Authorization: `Bearer ${bricsToken}` },
    });
    assert.strictEqual(bricsRadar.status, 403, 'BRICS analyst must be rejected from expiry radar (403)');

    const bricsRoute = await apiFetch('/routes/dispatch-plan', {
      headers: { Authorization: `Bearer ${bricsToken}` },
    });
    assert.strictEqual(bricsRoute.status, 403, 'BRICS analyst must be rejected from dispatch routes (403)');
    console.log('  ✓ BRICS analyst strictly rejected from all domestic telemetry & routing endpoints (403 Forbidden).');

    // -------------------------------------------------------------
    // TEST 3: Temperature Excursion Triggering TEMP_EXCURSION Alert
    // -------------------------------------------------------------
    console.log('[TEST 3] Ingesting heat excursion (9.8°C) and verifying TEMP_EXCURSION alert...');
    const ingestHeat = await apiFetch('/telemetry/ingest', {
      method: 'POST',
      headers: { Authorization: `Bearer ${nurseToken}` },
      body: JSON.stringify({
        facilityId: shirurId,
        deviceId: 'ILR-SHIRUR-01',
        temperature: 9.8,
        batteryPct: 85,
        doorOpen: true,
      }),
    });
    assert.strictEqual(ingestHeat.status, 200, 'Ingest should return 200 OK');
    assert.strictEqual(ingestHeat.data.excursion, true, 'Should mark excursion as true');

    // Check alerts in database
    const heatAlert = await query(
      `SELECT * FROM alerts WHERE facility_id = $1 AND rule_code = 'TEMP_EXCURSION' AND open = true`,
      [shirurId]
    );
    assert.strictEqual(heatAlert.rows.length, 1, 'Should create open TEMP_EXCURSION alert');
    assert.strictEqual(heatAlert.rows[0].severity, 'critical', 'Excursion alert must be critical severity');
    console.log(`  ✓ Heat excursion (9.8°C) triggered critical TEMP_EXCURSION alert: "${heatAlert.rows[0].message.slice(0, 60)}..."`);

    // Ingest normalized temperature (4.2°C) to verify auto-resolution
    const ingestNormal = await apiFetch('/telemetry/ingest', {
      method: 'POST',
      headers: { Authorization: `Bearer ${nurseToken}` },
      body: JSON.stringify({
        facilityId: shirurId,
        deviceId: 'ILR-SHIRUR-01',
        temperature: 4.2,
        batteryPct: 98,
        doorOpen: false,
      }),
    });
    assert.strictEqual(ingestNormal.data.excursion, false, 'Should mark excursion as false');

    const resolvedAlert = await query(
      `SELECT * FROM alerts WHERE facility_id = $1 AND rule_code = 'TEMP_EXCURSION' AND open = true`,
      [shirurId]
    );
    assert.strictEqual(resolvedAlert.rows.length, 0, 'TEMP_EXCURSION alert should auto-resolve when normal');
    console.log('  ✓ Normal temperature (4.2°C) automatically resolved TEMP_EXCURSION alert.');

    // -------------------------------------------------------------
    // TEST 4: Expiry Radar & EXPIRY_WARNING Alerts
    // -------------------------------------------------------------
    console.log('[TEST 4] Testing Expiry Radar & EXPIRY_WARNING alert trigger...');
    // Seed a lot expiring in 15 days at Shirur
    const expLot = await query(
      `INSERT INTO stock_lots (facility_id, sku_id, qty, expires_on)
       VALUES ($1, $2, 35, CURRENT_DATE + INTERVAL '15 days')
       RETURNING id`,
      [shirurId, insulinId]
    );
    const expLotId = expLot.rows[0].id;

    await recomputeAlerts();

    // Check expiry alert
    const expAlert = await query(
      `SELECT * FROM alerts WHERE facility_id = $1 AND sku_id = $2 AND rule_code = 'EXPIRY_WARNING' AND open = true`,
      [shirurId, insulinId]
    );
    assert.strictEqual(expAlert.rows.length, 1, 'Should trigger EXPIRY_WARNING alert');
    assert.strictEqual(expAlert.rows[0].severity, 'warn', 'Expiry alert severity should be warn');

    const radarRes = await apiFetch('/expiry/radar', {
      headers: { Authorization: `Bearer ${complianceToken}` },
    });
    assert.strictEqual(radarRes.status, 200, 'Compliance auditor should access radar');
    const matchedLot = radarRes.data.lots.find((l: any) => l.lotId === expLotId);
    assert(matchedLot, 'Radar should include newly added near-expiry lot');
    assert.strictEqual(matchedLot.urgency, 'critical', 'Lot expiring in 15 days should have critical urgency');
    console.log(`  ✓ Expiry Radar identified lot with ${matchedLot.daysToExpiry} days left and suggested action: "${matchedLot.recommendedAction}"`);

    // Clean up test lot
    await query(`DELETE FROM stock_lots WHERE id = $1`, [expLotId]);
    await recomputeAlerts();

    // -------------------------------------------------------------
    // TEST 5: Cold-Chain Dispatch Route Plans & Thermal Window
    // -------------------------------------------------------------
    console.log('[TEST 5] Testing Cold-Chain Dispatch Route Plans & Thermal Margins...');
    // Create an approved transfer order for Insulin
    const orderIns = await query(
      `INSERT INTO transfer_orders (tenant_id, from_facility, to_facility, sku_id, qty, status, distance_km, eta_hours)
       VALUES ($1, $2, $3, $4, 25, 'approved', 38.5, 1.2)
       RETURNING id`,
      [tenantId, mancharId, shirurId, insulinId]
    );
    const transferId = orderIns.rows[0].id;

    const routeRes = await apiFetch('/routes/dispatch-plan', {
      headers: { Authorization: `Bearer ${officerToken}` },
    });
    assert.strictEqual(routeRes.status, 200);
    const plannedRoute = routeRes.data.routes.find((r: any) => r.transferId === transferId);
    assert(plannedRoute, 'Should find planned route for transfer');
    assert.strictEqual(plannedRoute.coldChainRequired, true, 'Insulin route must require cold-chain');
    assert(plannedRoute.thermalSafetyMarginHours > 0, 'Thermal safety margin must be positive');
    assert(plannedRoute.checkpoints.length >= 3, 'Route must have dispatch, transit, and receipt checkpoints');
    console.log(`  ✓ Route planned: ETA=${plannedRoute.estimatedTransitHours}h, Thermal Margin=${plannedRoute.thermalSafetyMarginHours}h, Vehicle="${plannedRoute.vehicleType}"`);

    // -------------------------------------------------------------
    // TEST 6: Complete Dispatch Flow (start_dispatch -> complete_delivery)
    // -------------------------------------------------------------
    console.log('[TEST 6] Executing start_dispatch and complete_delivery actions...');
    const startDispatch = await apiFetch('/routes/dispatch-action', {
      method: 'POST',
      headers: { Authorization: `Bearer ${officerToken}` },
      body: JSON.stringify({
        transferId,
        action: 'start_dispatch',
        sealTemperature: 3.9,
      }),
    });
    assert.strictEqual(startDispatch.status, 200, 'Dispatch start should succeed');
    assert.strictEqual(startDispatch.data.status, 'in_transit');

    // Complete delivery
    const initialShirurStock = await query(
      `SELECT qty FROM stock_on_hand WHERE facility_id = $1 AND sku_id = $2`,
      [shirurId, insulinId]
    );
    const prevQty = initialShirurStock.rows.length > 0 ? Number(initialShirurStock.rows[0].qty) : 0;

    const completeDispatch = await apiFetch('/routes/dispatch-action', {
      method: 'POST',
      headers: { Authorization: `Bearer ${nurseToken}` },
      body: JSON.stringify({
        transferId,
        action: 'complete_delivery',
        receiptTemperature: 4.4,
      }),
    });
    assert.strictEqual(completeDispatch.status, 200, 'Delivery completion should succeed');
    assert.strictEqual(completeDispatch.data.status, 'completed');

    // Verify recipient stock balance increased by 25
    const postShirurStock = await query(
      `SELECT qty FROM stock_on_hand WHERE facility_id = $1 AND sku_id = $2`,
      [shirurId, insulinId]
    );
    const newQty = Number(postShirurStock.rows[0].qty);
    assert.strictEqual(newQty, prevQty + 25, `Recipient stock must increase by 25 units (was ${prevQty}, now ${newQty})`);

    // Verify Zero-PHI audit event for completion
    const auditRes = await query(
      `SELECT * FROM audit_events WHERE entity = 'transfer_orders' AND entity_id = $1 ORDER BY at DESC LIMIT 1`,
      [transferId]
    );
    assert.strictEqual(auditRes.rows.length, 1, 'Audit log event must be recorded');
    assert.strictEqual(auditRes.rows[0].action, 'TRANSFER_COMPLETED');
    console.log(`  ✓ Transfer delivered: Recipient stock updated from ${prevQty} to ${newQty}. Zero-PHI audit event logged.`);

    console.log('================================================================');
    console.log('   STAGE 5 RESULTS: 6/6 PASSED (100% SUCCESS)                   ');
    console.log('================================================================');
  } finally {
    server.close();
    setTimeout(() => process.exit(0), 200);
  }
}

main().catch((err) => {
  console.error('Stage 5 test failed:', err);
  process.exit(1);
});

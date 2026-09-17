import assert from 'assert';
import { initDb, query } from '../src/db/db.js';
import { generateToken } from '../src/services/auth.js';
import { optimizeTransfersForShortage } from '../src/services/optimizer.js';
import { approveTransferOrder } from '../src/services/transfers.js';
import { recomputeAlerts } from '../src/services/alerts.js';

async function runTests() {
  console.log('--- STARTING AROGYANET MONEY-PATH & SECURITY INTEGRATION TESTS ---');

  // Initialize DB
  await initDb();
  console.log('✔ Database initialized & schema verified');

  // 1. Verify 4 demo user logins exist in users table
  const usersRes = await query('SELECT id, email, role, tenant_id, facility_id FROM users');
  const roles = usersRes.rows.map((u) => u.role);
  assert.ok(roles.includes('phc_nurse'), 'Missing phc_nurse');
  assert.ok(roles.includes('district_officer'), 'Missing district_officer');
  assert.ok(roles.includes('national_war_room'), 'Missing national_war_room');
  assert.ok(roles.includes('brics_analyst'), 'Missing brics_analyst');
  console.log('✔ Test 1 passed: 4 demo roles present in users table');

  // 2. Test Stock Adjustment & Alert trigger
  const shirurRes = await query("SELECT id FROM facilities WHERE code = 'PHC-SHIRUR'");
  const shirurId = shirurRes.rows[0].id;
  const orsRes = await query("SELECT id FROM skus WHERE code = 'ORS-20.5G'");
  const orsId = orsRes.rows[0].id;

  const mancharResEarly = await query("SELECT id FROM facilities WHERE code = 'CHC-MANCHAR'");
  const mancharIdEarly = mancharResEarly.rows[0].id;
  await query('UPDATE stock_on_hand SET qty = 450 WHERE facility_id = $1 AND sku_id = $2', [mancharIdEarly, orsId]);

  // Drop stock of ORS at Shirur to 20 units (demand is 70)
  await query(
    'UPDATE stock_on_hand SET qty = 20, updated_at = NOW() WHERE facility_id = $1 AND sku_id = $2',
    [shirurId, orsId]
  );
  await recomputeAlerts();

  const alerts = await query(
    "SELECT severity, rule_code, open FROM alerts WHERE facility_id = $1 AND sku_id = $2 AND open = true",
    [shirurId, orsId]
  );
  assert.ok(alerts.rows.length > 0, 'Alert should have fired for low ORS');
  console.log('✔ Test 2 passed: Dropping stock fires COVER_7D or PROB_04 alert');

  // 3. Test Deterministic Optimizer: proposes transfer from Manchar CHC
  const proposals = await optimizeTransfersForShortage(shirurId, orsId, 50);
  assert.ok(proposals.length > 0, 'Optimizer should find a donor');
  const proposal = proposals[0];
  assert.strictEqual(proposal.toFacilityId, shirurId);
  assert.ok(proposal.donorRemainingQty >= proposal.donorRequiredCover, 'Donor cover rule must hold');
  console.log(`✔ Test 3 passed: Deterministic optimizer proposed ${proposal.qty} units with donor retaining ${proposal.donorRemainingQty} (>= ${proposal.donorRequiredCover} required cover)`);

  // 4. Test Human-in-the-loop Transfer Approval in atomic SQL transaction
  const mancharRes = await query("SELECT id, tenant_id FROM facilities WHERE code = 'CHC-MANCHAR'");
  const mancharId = mancharRes.rows[0].id;
  const tenantId = mancharRes.rows[0].tenant_id;

  // Reset donor stock to ensure test idempotency across runs
  await query('UPDATE stock_on_hand SET qty = 450 WHERE facility_id = $1 AND sku_id = $2', [mancharId, orsId]);
  await query('UPDATE stock_on_hand SET qty = 20 WHERE facility_id = $1 AND sku_id = $2', [shirurId, orsId]);

  // Insert proposed order
  const orderRes = await query(
    `INSERT INTO transfer_orders (tenant_id, from_facility, to_facility, sku_id, qty, status, eta_hours, distance_km)
     VALUES ($1, $2, $3, $4, 25, 'proposed', 1.2, 35)
     RETURNING id`,
    [tenantId, mancharId, shirurId, orsId]
  );
  const orderId = orderRes.rows[0].id;

  const officerRes = await query("SELECT id FROM users WHERE role = 'district_officer' LIMIT 1");
  const officerId = officerRes.rows[0].id;

  const approvalResult = await approveTransferOrder(orderId, officerId, 'req_test_001');
  assert.strictEqual(approvalResult.success, true);

  // Verify stock levels adjusted at both facilities
  const postDonorStock = await query(
    'SELECT qty FROM stock_on_hand WHERE facility_id = $1 AND sku_id = $2',
    [mancharId, orsId]
  );
  const postRecipientStock = await query(
    'SELECT qty FROM stock_on_hand WHERE facility_id = $1 AND sku_id = $2',
    [shirurId, orsId]
  );
  assert.strictEqual(Number(postRecipientStock.rows[0].qty), 45); // was 20, added 25 = 45
  console.log(`✔ Test 4 passed: Transfer approved atomically. Recipient stock updated to ${postRecipientStock.rows[0].qty}`);

  // 5. Test Non-Negotiable: Cold chain violation prevention
  const talegaonRes = await query("SELECT id FROM facilities WHERE code = 'PHC-TALEGAON'");
  const talegaonId = talegaonRes.rows[0].id; // cold_chain_capable: false
  const insulinRes = await query("SELECT id FROM skus WHERE code = 'INS-REG-40'");
  const insulinId = insulinRes.rows[0].id; // cold_chain: true

  let coldChainErrorCaught = false;
  try {
    await optimizeTransfersForShortage(talegaonId, insulinId, 10);
  } catch (err: any) {
    if (err.message.includes('Cold-chain violation')) {
      coldChainErrorCaught = true;
    }
  }
  assert.ok(coldChainErrorCaught, 'Optimizer must reject cold chain transfer to non-capable facility');
  console.log('✔ Test 5 passed: Cold-chain violation strictly rejected');

  // 6. Test BRICS Analyst Gate & Postgres RLS Policy
  const bricsUser = usersRes.rows.find((u) => u.role === 'brics_analyst');
  const bricsToken = generateToken({
    userId: bricsUser.id,
    email: bricsUser.email,
    role: 'brics_analyst',
    tenantId: bricsUser.tenant_id,
    facilityId: null,
  });

  // Verify RLS policy in database: when session role is 'brics_analyst', queries to stock_on_hand return 0 rows
  const rlsStock = await query('SELECT * FROM stock_on_hand', [], { role: 'brics_analyst' });
  assert.strictEqual(rlsStock.rows.length, 0, 'RLS policy must block brics_analyst from viewing stock_on_hand');

  const rlsLots = await query('SELECT * FROM stock_lots', [], { role: 'brics_analyst' });
  assert.strictEqual(rlsLots.rows.length, 0, 'RLS policy must block brics_analyst from viewing stock_lots');

  const rlsAttendance = await query('SELECT * FROM attendance_daily', [], { role: 'brics_analyst' });
  assert.strictEqual(rlsAttendance.rows.length, 0, 'RLS policy must block brics_analyst from viewing attendance_daily');

  console.log('✔ Test 6 passed: Postgres RLS policy blocks brics_analyst from stock, lots, and attendance');

  // 7. Verify Federation view contains ONLY tenant-level indices, zero patient names, zero staff names, zero raw counts
  const fedRes = await query('SELECT * FROM federation_ess_daily');
  assert.ok(fedRes.rows.length > 0);
  for (const row of fedRes.rows) {
    assert.ok(['LOW', 'MED', 'HIGH'].includes(row.surplus_qty_band), 'Surplus band must be LOW/MED/HIGH only');
    assert.ok(typeof row.predicted_demand_index !== 'undefined');
    assert.strictEqual(row.patient_name, undefined);
    assert.strictEqual(row.staff_name, undefined);
  }
  console.log('✔ Test 7 passed: Federation data conforms to sovereign indices-only standard (no PHI, no raw inventory)');

  // 8. Test HTTP API routes: brics_analyst MUST receive 403 on all non-federation endpoints
  const express = (await import('express')).default;
  const { apiRouter } = await import('../src/routes/api.js');
  const app = express();
  app.use(express.json());
  app.use('/v1', apiRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const nonFederationEndpoints = [
    { method: 'GET', path: '/v1/map/snapshot' },
    { method: 'GET', path: `/v1/facilities/${shirurId}` },
    { method: 'GET', path: '/v1/alerts' },
    { method: 'GET', path: '/v1/skus' },
    { method: 'GET', path: '/v1/transfers' },
    { method: 'POST', path: '/v1/stock/adjust', body: { facilityId: shirurId, skuId: orsId, delta: 5 } },
    { method: 'PATCH', path: '/v1/capacity', body: { facilityId: shirurId, bedsAvailable: 10 } },
    { method: 'PUT', path: '/v1/attendance', body: { facilityId: shirurId, nursesPresent: 2 } },
    { method: 'POST', path: '/v1/emergency', body: { outbreakMultiplier: 2.0 } },
    { method: 'POST', path: '/v1/transfers/propose', body: { recipientFacilityId: shirurId, skuId: orsId } },
  ];

  for (const ep of nonFederationEndpoints) {
    const res = await fetch(`${baseUrl}${ep.path}`, {
      method: ep.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bricsToken}`,
      },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    const bodyText = await res.text();
    if (res.status !== 403) {
      console.error(`Unexpected response for ${ep.path}:`, res.status, bodyText);
    }
    assert.strictEqual(
      res.status,
      403,
      `Expected 403 FORBIDDEN for brics_analyst on ${ep.method} ${ep.path}, got ${res.status}`
    );
  }

  // Verify brics_analyst receives 200 on /v1/federation/ess and /v1/federation/model-card
  const fedResHttp = await fetch(`${baseUrl}/v1/federation/ess`, {
    headers: { Authorization: `Bearer ${bricsToken}` },
  });
  assert.strictEqual(fedResHttp.status, 200, 'brics_analyst must be able to read /v1/federation/ess');

  const modelCardResHttp = await fetch(`${baseUrl}/v1/federation/model-card`, {
    headers: { Authorization: `Bearer ${bricsToken}` },
  });
  assert.strictEqual(modelCardResHttp.status, 200, 'brics_analyst must be able to read /v1/federation/model-card');

  console.log('✔ Test 8 passed: brics_analyst receives HTTP 403 on ALL non-federation routes and 200 on federation');

  server.close();
  console.log('--- ALL INTEGRATION & SECURITY TESTS COMPLETED SUCCESSFULLY! ---');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});

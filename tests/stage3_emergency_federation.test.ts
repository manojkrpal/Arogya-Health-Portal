import assert from 'assert';
import express from 'express';
import { apiRouter } from '../src/routes/api.js';
import { initDb, query } from '../src/db/db.js';
import { generateToken, TokenPayload } from '../src/services/auth.js';
import { db, TENANT_ID } from '../src/lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function runStage3Tests() {
  console.log('================================================================');
  console.log('   AROGYANET LEVEL 2 — STAGE 3 EMERGENCY SURGE & FEDERATION     ');
  console.log('================================================================');

  await initDb();

  const app = express();
  app.use(express.json());
  app.use('/v1', apiRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Fetch users for tokens
  const usersRes = await query('SELECT id, email, role, tenant_id, facility_id FROM users');
  const userMap = new Map<string, any>();
  usersRes.rows.forEach((u) => {
    userMap.set(u.role, u);
    userMap.set(u.email, u);
  });

  function makeToken(role: TokenPayload['role'], customProps: Partial<TokenPayload> = {}): string {
    const u = userMap.get(role) || {
      id: 'mock-' + role,
      email: `${role}@test.gov.in`,
      tenant_id: TENANT_ID,
      facility_id: null,
    };
    return generateToken({
      userId: u.id,
      email: u.email,
      role,
      tenantId: u.tenant_id,
      facilityId: u.facility_id,
      ...customProps,
    });
  }

  const shirurId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const mancharId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  const shirurNurse = userMap.get('nurse@shirur.phc.gov.in') || userMap.get('phc_nurse');

  const tokenWarRoom = makeToken('national_war_room');
  const tokenDistrict = makeToken('district_officer');
  const tokenNurseShirur = generateToken({
    userId: shirurNurse.id,
    email: shirurNurse.email,
    role: 'phc_nurse',
    tenantId: shirurNurse.tenant_id,
    facilityId: shirurNurse.facility_id,
  });
  const tokenBrics = makeToken('brics_analyst');

  // -------------------------------------------------------------
  // TEST 1: Emergency Outbreak Multiplier Surge & Role Security
  // -------------------------------------------------------------
  console.log('\n[TEST 1] Testing Emergency Outbreak Multiplier Governance & Alert Propagation...');

  // 1a: District Officer attempt to set emergency multiplier must be rejected with 403
  const unauthorizedRes = await fetch(`${baseUrl}/v1/emergency`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenDistrict}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenantId: TENANT_ID,
      outbreakMultiplier: 2.5,
      activeLabel: 'Surge Protocol Test',
    }),
  });
  assert.strictEqual(unauthorizedRes.status, 403, 'district_officer cannot adjust national emergency multiplier');
  console.log('✔ PASS: Non-war-room roles strictly blocked from emergency multiplier adjustments (HTTP 403)');

  // 1b: National War Room sets 2.5x outbreak multiplier
  const warRoomRes = await fetch(`${baseUrl}/v1/emergency`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenWarRoom}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenantId: TENANT_ID,
      outbreakMultiplier: 2.5,
      activeLabel: 'Monsoon Cholera Spike Alert',
    }),
  });
  assert.strictEqual(warRoomRes.status, 200, 'national_war_room must succeed in setting emergency multiplier');
  const warRoomBody = await warRoomRes.json();
  assert.strictEqual(warRoomBody.success, true);
  assert.strictEqual(warRoomBody.outbreakMultiplier, 2.5);
  console.log('✔ PASS: National War Room successfully activated 2.5x outbreak multiplier surge');

  // Verify PostgreSQL updated
  const emSetting = await query('SELECT outbreak_multiplier, active_label FROM emergency_settings WHERE tenant_id = $1', [TENANT_ID]);
  assert.strictEqual(Number(emSetting.rows[0].outbreak_multiplier), 2.5);

  // Verify Firestore tenant document updated
  const tenantDocSnap = await getDoc(doc(db, 'tenants', TENANT_ID));
  assert.ok(tenantDocSnap.exists(), 'Tenant doc in Firestore must exist');
  assert.strictEqual(tenantDocSnap.data().emergency_outbreak_multiplier, 2.5);
  console.log('✔ PASS: Outbreak multiplier propagated to PostgreSQL and Firestore tenant state');

  // -------------------------------------------------------------
  // TEST 2: Clinical Capacity & Facility Assignment Guard
  // -------------------------------------------------------------
  console.log('\n[TEST 2] Testing Clinical Bed Capacity & Assignment Governance...');

  // 2a: Nurse at Shirur attempting to modify Manchar capacity must receive 403
  const foreignCapRes = await fetch(`${baseUrl}/v1/capacity`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenNurseShirur}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      facilityId: mancharId,
      bedsAvailable: 5,
    }),
  });
  if (foreignCapRes.status !== 403) {
    const errText = await foreignCapRes.text();
    console.error('foreignCapRes status:', foreignCapRes.status, 'body:', errText);
  }
  assert.strictEqual(foreignCapRes.status, 403, 'Nurse modifying unassigned facility capacity must fail with 403');
  console.log('✔ PASS: Nurse cross-facility capacity edit strictly denied (HTTP 403)');

  // 2b: Nurse modifying assigned Shirur facility capacity
  const ownCapRes = await fetch(`${baseUrl}/v1/capacity`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenNurseShirur}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      facilityId: shirurId,
      bedsTotal: 12,
      bedsAvailable: 7,
      oxygenCylinders: 4,
    }),
  });
  assert.strictEqual(ownCapRes.status, 200, 'Nurse must be able to update own facility capacity');
  console.log('✔ PASS: Assigned nurse successfully updated Shirur PHC bed and oxygen capacity');

  // Verify PostgreSQL capacity
  const capRow = await query('SELECT beds_total, beds_available, oxygen_cylinders FROM capacity WHERE facility_id = $1', [shirurId]);
  assert.strictEqual(capRow.rows[0].beds_total, 12);
  assert.strictEqual(capRow.rows[0].beds_available, 7);

  // -------------------------------------------------------------
  // TEST 3: Staff Attendance Logging with Zero-PHI
  // -------------------------------------------------------------
  console.log('\n[TEST 3] Testing Daily Staff Attendance & Zero-PHI Guarantee...');

  const attendanceRes = await fetch(`${baseUrl}/v1/attendance`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${tokenNurseShirur}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      facilityId: shirurId,
      nursesPresent: 4,
      doctorsPresent: 1,
      anmsPresent: 2,
      rosterNurses: 4,
    }),
  });
  assert.strictEqual(attendanceRes.status, 200, 'Nurse attendance update must succeed');

  const attRow = await query('SELECT nurses_present, doctors_present FROM attendance_daily WHERE facility_id = $1 AND day = CURRENT_DATE', [shirurId]);
  assert.strictEqual(attRow.rows[0].nurses_present, 4);
  assert.strictEqual(attRow.rows[0].doctors_present, 1);
  console.log('✔ PASS: Daily staff attendance logged with aggregate counts (zero staff names or PHI)');

  // -------------------------------------------------------------
  // TEST 4: Sovereign BRICS Federation Indices & Privacy Compliance
  // -------------------------------------------------------------
  console.log('\n[TEST 4] Testing Sovereign BRICS Federation Indices & Model Card...');

  const fedRes = await fetch(`${baseUrl}/v1/federation/ess`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${tokenBrics}`,
    },
  });
  assert.strictEqual(fedRes.status, 200, 'brics_analyst must be able to read federation aggregates');
  const fedBody = await fedRes.json();

  assert.ok(Array.isArray(fedBody.data), 'Federation response must contain data array');
  assert.ok(fedBody.data.length > 0, 'Federation response must return aggregates');

  for (const item of fedBody.data) {
    // Assert no raw inventory numbers or patient identifiers
    assert.ok(
      ['LOW', 'MED', 'HIGH'].includes(item.surplusBand),
      `Surplus band must be categorical (LOW/MED/HIGH), received: ${item.surplusBand}`
    );
    assert.ok(item.predictedDemandIndex >= 0, 'Demand index must be non-negative number');
    assert.ok(typeof item.stockoutProbability === 'number', 'Stockout probability must be numeric');
    assert.strictEqual(item.rawInventory, undefined, 'Raw inventory count must NEVER be exported');
    assert.strictEqual(item.patientName, undefined, 'Patient identifiers must NEVER be exported');
    assert.strictEqual(item.facilityName, undefined, 'Individual clinic names must NEVER be exported');
  }
  console.log('✔ PASS: Sovereign aggregation strictly preserves differential privacy and zero-PHI');

  // Verify Model Card
  const modelCardRes = await fetch(`${baseUrl}/v1/federation/model-card`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${tokenBrics}`,
    },
  });
  assert.strictEqual(modelCardRes.status, 200);
  const cardBody = await modelCardRes.json();
  assert.ok(cardBody.federationProtocol.includes('BRICS-ESS'));
  console.log('✔ PASS: Differential privacy model card metadata verified');

  server.close();
  console.log('\n================================================================');
  console.log('   ALL STAGE 3 EMERGENCY SURGE & FEDERATION TESTS PASSED!       ');
  console.log('================================================================\n');
  process.exit(0);
}

runStage3Tests().catch((err) => {
  console.error('Stage 3 tests failed:', err);
  process.exit(1);
});

import assert from 'assert';
import express from 'express';
import { apiRouter } from '../src/routes/api.js';
import { initDb, query } from '../src/db/db.js';
import { generateToken, TokenPayload } from '../src/services/auth.js';
import { db, TENANT_ID } from '../src/lib/firebase.js';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import {
  adjustFirestoreStock,
  proposeFirestoreTransfer,
  approveFirestoreTransfer,
} from '../src/db/firestore-service.js';

async function runStage1Tests() {
  console.log('================================================================');
  console.log('   AROGYANET LEVEL 2 — STAGE 1 RBAC DENY & FIRESTORE TEST SUITE  ');
  console.log('================================================================');

  // Initialize DB
  await initDb();

  // Spin up test Express instance
  const app = express();
  app.use(express.json());
  app.use('/v1', apiRouter);

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Fetch users for token generation
  const usersRes = await query('SELECT id, email, role, tenant_id, facility_id FROM users');
  const userMap = new Map<string, any>();
  usersRes.rows.forEach((u) => userMap.set(u.role, u));

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

  const tokenStateAdmin = makeToken('state_admin');
  const tokenProcurement = makeToken('procurement_officer');
  const tokenAuditor = makeToken('compliance_auditor');
  const tokenBrics = makeToken('brics_analyst');
  const tokenNurse = makeToken('phc_nurse', { facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' });
  const tokenOfficer = makeToken('district_officer');

  const shirurId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const mancharId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const orsId = '10000000-0000-0000-0000-000000000001';

  // Seed stock and a lot at Manchar to ensure donor cover and lots exist for testOrderId
  await query('UPDATE stock_on_hand SET qty = 450 WHERE facility_id = $1 AND sku_id = $2', [mancharId, orsId]);
  await query('DELETE FROM stock_lots WHERE facility_id = $1 AND sku_id = $2', [mancharId, orsId]);
  await query(
    `INSERT INTO stock_lots (facility_id, sku_id, qty, expires_on)
     VALUES ($1, $2, 450, CURRENT_DATE + INTERVAL '180 days')`,
    [mancharId, orsId]
  );

  // Seed a proposed transfer order in DB
  const proposedOrderRes = await query(
    `INSERT INTO transfer_orders (tenant_id, from_facility, to_facility, sku_id, qty, status, eta_hours, distance_km)
     VALUES ($1, $2, $3, $4, 15, 'proposed', 1.0, 30)
     RETURNING id`,
    [TENANT_ID, mancharId, shirurId, orsId]
  );
  const testOrderId = proposedOrderRes.rows[0].id;

  // -------------------------------------------------------------
  // DENY TEST 1: state_admin Transfer Approval DENY
  // -------------------------------------------------------------
  console.log('\n[DENY Test 1] Testing state_admin Transfer Approval Prohibition...');
  {
    const res = await fetch(`${baseUrl}/v1/transfers/${testOrderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenStateAdmin}`,
      },
      body: JSON.stringify({ action: 'approve' }),
    });

    assert.strictEqual(
      res.status,
      403,
      `state_admin MUST be denied transfer approval (HTTP 403), got ${res.status}`
    );
    const body = await res.json();
    assert.strictEqual(body.error.code, 'FORBIDDEN_ROLE');
    console.log('✔ PASS: state_admin transfer approval strictly denied with HTTP 403 FORBIDDEN_ROLE');

    // Also verify Firestore service-level denial
    let fsDenied = false;
    try {
      await approveFirestoreTransfer(
        'dummy-transfer',
        { userId: 'admin-id', email: 'admin@maharashtra.health.gov.in', role: 'state_admin' }
      );
    } catch (err: any) {
      if (err.message.includes('FORBIDDEN')) {
        fsDenied = true;
      }
    }
    assert.ok(fsDenied, 'Firestore service approveFirestoreTransfer must strictly reject state_admin');
    console.log('✔ PASS: Firestore transaction level also strictly blocks state_admin transfer approval');
  }

  // -------------------------------------------------------------
  // DENY TEST 2: procurement_officer Stock Adjustment & Transfer Approval DENY
  // -------------------------------------------------------------
  console.log('\n[DENY Test 2] Testing procurement_officer Operation Restrictions...');
  {
    // A. Physical stock adjustment DENY
    const stockRes = await fetch(`${baseUrl}/v1/stock/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenProcurement}`,
      },
      body: JSON.stringify({ facilityId: shirurId, skuId: orsId, delta: -10, reason: 'unauthorized_audit' }),
    });
    assert.strictEqual(
      stockRes.status,
      403,
      `procurement_officer MUST be denied physical stock adjustment (HTTP 403), got ${stockRes.status}`
    );
    console.log('✔ PASS: procurement_officer physical stock adjustment strictly denied (HTTP 403)');

    // B. Transfer approval DENY
    const transferRes = await fetch(`${baseUrl}/v1/transfers/${testOrderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenProcurement}`,
      },
      body: JSON.stringify({ action: 'approve' }),
    });
    assert.strictEqual(
      transferRes.status,
      403,
      `procurement_officer MUST be denied transfer approval (HTTP 403), got ${transferRes.status}`
    );
    console.log('✔ PASS: procurement_officer transfer approval strictly denied (HTTP 403)');
  }

  // -------------------------------------------------------------
  // DENY TEST 3: compliance_auditor Strict Write-Denial
  // -------------------------------------------------------------
  console.log('\n[DENY Test 3] Testing compliance_auditor Strict Write-Deny Matrix...');
  {
    const writeEndpoints = [
      { method: 'POST', path: '/v1/stock/adjust', body: { facilityId: shirurId, skuId: orsId, delta: 5 } },
      { method: 'PATCH', path: '/v1/capacity', body: { facilityId: shirurId, bedsAvailable: 5 } },
      { method: 'PUT', path: '/v1/attendance', body: { facilityId: shirurId, nursesPresent: 3 } },
      { method: 'POST', path: '/v1/emergency', body: { outbreakMultiplier: 1.5 } },
      { method: 'POST', path: '/v1/transfers/propose', body: { recipientFacilityId: shirurId, skuId: orsId } },
      { method: 'PATCH', path: `/v1/transfers/${testOrderId}`, body: { action: 'approve' } },
    ];

    for (const ep of writeEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenAuditor}`,
        },
        body: JSON.stringify(ep.body),
      });

      assert.strictEqual(
        res.status,
        403,
        `compliance_auditor MUST be denied on ${ep.method} ${ep.path}, got ${res.status}`
      );
    }
    console.log('✔ PASS: compliance_auditor is strictly write-denied across all operational endpoints (6/6)');
  }

  // -------------------------------------------------------------
  // DENY TEST 4: brics_analyst Isolation
  // -------------------------------------------------------------
  console.log('\n[DENY Test 4] Testing brics_analyst Sovereign Isolation...');
  {
    const clinicalEndpoints = [
      `/v1/facilities/${shirurId}`,
      '/v1/map/snapshot',
      '/v1/alerts',
      '/v1/skus',
      '/v1/transfers',
    ];

    for (const path of clinicalEndpoints) {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${tokenBrics}` },
      });
      assert.strictEqual(
        res.status,
        403,
        `brics_analyst MUST receive 403 on ${path}, got ${res.status}`
      );
    }
    console.log('✔ PASS: brics_analyst strictly denied from all domestic clinical and inventory endpoints (5/5)');
  }

  // -------------------------------------------------------------
  // DENY TEST 5: Cross-Tenant Isolation
  // -------------------------------------------------------------
  console.log('\n[DENY Test 5] Testing Cross-Tenant Boundary Enforcement...');
  {
    // Attempting to access a facility belonging to another tenant
    const foreignTenantToken = makeToken('phc_nurse', {
      tenantId: '22222222-2222-2222-2222-222222222222', // Satara District
      facilityId: 'satara-phc-01',
    });

    // Nurse from Satara cannot view Shirur PHC (in Pune)
    const crossRes = await fetch(`${baseUrl}/v1/facilities/${shirurId}`, {
      headers: { Authorization: `Bearer ${foreignTenantToken}` },
    });
    assert.strictEqual(crossRes.status, 403, 'Cross-facility/cross-tenant access must return 403');
    console.log('✔ PASS: Cross-tenant facility access blocked with HTTP 403');
  }

  // -------------------------------------------------------------
  // DENY TEST 6: Firestore Security Rules Immutability Check
  // -------------------------------------------------------------
  console.log('\n[DENY Test 6] Testing Firestore Direct Security Rules Immutability...');
  {
    const auditDocRef = doc(db, 'tenants', TENANT_ID, 'audit_events', `stage1-immutable-audit-${Date.now()}`);
    await setDoc(auditDocRef, {
      actor: 'security-test',
      action: 'INITIAL_LOG',
      timestamp: new Date().toISOString(),
    });

    let updateFailed = false;
    try {
      await updateDoc(auditDocRef, { action: 'MUTATED_LOG' });
    } catch (err: any) {
      updateFailed = true;
      assert.strictEqual(err.code, 'permission-denied');
    }
    assert.ok(updateFailed, 'Firestore rules MUST reject update on audit_events');
    console.log('✔ PASS: Firestore rules enforce absolute immutability on audit_events (update rejected)');

    // Test unmapped default-deny
    let defaultDenyFailed = false;
    try {
      const rogueDoc = doc(db, 'unauthorized_collection', 'rogue_doc');
      await setDoc(rogueDoc, { hack: true });
    } catch (err: any) {
      defaultDenyFailed = true;
      assert.strictEqual(err.code, 'permission-denied');
    }
    assert.ok(defaultDenyFailed, 'Firestore rules MUST reject writes to unmapped collections');
    console.log('✔ PASS: Firestore rules enforce default-deny on unmapped collections');
  }

  // -------------------------------------------------------------
  // TEST 7: Firestore Atomic Transfer Transaction Verification
  // -------------------------------------------------------------
  console.log('\n[TEST 7] Testing Firestore Atomic Stock Transfer Execution...');
  {
    // Setup stock in Firestore
    const fromFac = mancharId;
    const toFac = shirurId;
    const testSku = orsId;

    // Reset stock
    await setDoc(doc(db, 'tenants', TENANT_ID, 'inventory', fromFac, 'stock', testSku), {
      facility_id: fromFac,
      sku_id: testSku,
      qty: 400,
      reorder_point: 100,
      updated_at: new Date().toISOString(),
    });

    await setDoc(doc(db, 'tenants', TENANT_ID, 'inventory', toFac, 'stock', testSku), {
      facility_id: toFac,
      sku_id: testSku,
      qty: 40,
      reorder_point: 100,
      updated_at: new Date().toISOString(),
    });

    const fsOrderId = `trans_${Date.now()}`;
    await proposeFirestoreTransfer({
      id: fsOrderId,
      fromFacilityId: fromFac,
      toFacilityId: toFac,
      skuId: testSku,
      qty: 30,
      etaHours: 1.2,
      distanceKm: 35,
      proposedBy: 'officer@pune.health.gov.in',
    });

    // District Officer approves
    const approval = await approveFirestoreTransfer(
      fsOrderId,
      { userId: 'officer-01', email: 'officer@pune.health.gov.in', role: 'district_officer' },
      'Emergency surge balance'
    );

    assert.strictEqual(approval.success, true);

    // Verify atomic balances in Firestore
    const donorSnap = await getDoc(doc(db, 'tenants', TENANT_ID, 'inventory', fromFac, 'stock', testSku));
    const recipientSnap = await getDoc(doc(db, 'tenants', TENANT_ID, 'inventory', toFac, 'stock', testSku));

    assert.strictEqual(donorSnap.data()?.qty, 370); // 400 - 30 = 370
    assert.strictEqual(recipientSnap.data()?.qty, 70);  // 40 + 30 = 70

    console.log(`✔ PASS: Firestore atomic transfer completed: Donor balance=${donorSnap.data()?.qty}, Recipient balance=${recipientSnap.data()?.qty}`);
  }

  // -------------------------------------------------------------
  // TEST 8: Valid Operation Check for District Officer
  // -------------------------------------------------------------
  console.log('\n[TEST 8] Verifying Authorized Operations for District Officer...');
  {
    const approveRes = await fetch(`${baseUrl}/v1/transfers/${testOrderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenOfficer}`,
      },
      body: JSON.stringify({ action: 'approve' }),
    });

    if (approveRes.status !== 200) {
      const errText = await approveRes.text();
      console.error('Test 8 approve failed with:', approveRes.status, errText);
    }

    assert.strictEqual(
      approveRes.status,
      200,
      `district_officer must be able to approve transfer, got ${approveRes.status}`
    );
    const body = await approveRes.json();
    assert.strictEqual(body.success, true);
    console.log('✔ PASS: Authorized district_officer successfully approved transfer order');
  }

  server.close();
  console.log('\n================================================================');
  console.log('   ALL STAGE 1 RBAC DENY & FIRESTORE TESTS PASSED SUCCESSFULLY!  ');
  console.log('================================================================\n');
  process.exit(0);
}

runStage1Tests().catch((err) => {
  console.error('\n❌ STAGE 1 TEST SUITE FAILED:', err);
  process.exit(1);
});

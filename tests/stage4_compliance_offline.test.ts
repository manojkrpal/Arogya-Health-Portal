import assert from 'assert';
import express from 'express';
import { apiRouter } from '../src/routes/api.js';
import { initDb, query } from '../src/db/db.js';
import { generateToken, TokenPayload } from '../src/services/auth.js';
import { db, TENANT_ID } from '../src/lib/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function runStage4Tests() {
  console.log('================================================================');
  console.log('   AROGYANET LEVEL 2 — STAGE 4 COMPLIANCE & OFFLINE RESILIENCE   ');
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
      id: '90000000-0000-0000-0000-000000000099',
      email: `${role}@mohfw.gov.in`,
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

  const nurseUser = userMap.get('phc_nurse') || { facility_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };
  const nurseFacilityId = nurseUser.facility_id || 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const tokenAuditor = makeToken('compliance_auditor');
  const tokenWarRoom = makeToken('national_war_room');
  const tokenOfficer = makeToken('district_officer');
  const tokenNurse = makeToken('phc_nurse', { facilityId: nurseFacilityId });
  const tokenBrics = makeToken('brics_analyst');

  const SHIRUR_ID = nurseFacilityId;
  const ORS_ID = '10000000-0000-0000-0000-000000000001';

  let passed = 0;
  let total = 6;

  // Test 1: Auditor can query immutable audit trail with SHA-256 hashes
  console.log('\n[TEST 1] Compliance auditor queries /v1/audit/events with cryptographic hashes');
  {
    const res = await fetch(`${baseUrl}/v1/audit/events`, {
      headers: { Authorization: `Bearer ${tokenAuditor}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.zeroPhiCertified, true);
    assert.ok(Array.isArray(data.events));
    if (data.events.length > 0) {
      assert.ok(data.events[0].id);
      assert.ok(data.events[0].integrityHash);
      assert.equal(data.events[0].integrityHash.length, 64);
    }
    console.log(`  ✓ Auditor retrieved ${data.events.length} audit records with valid SHA-256 integrity hashes.`);
    passed++;
  }

  // Test 2: BRICS analyst is strictly denied from audit endpoints
  console.log('\n[TEST 2] BRICS analyst access to /v1/audit/events and /v1/audit/verify is rejected (403)');
  {
    const resEvents = await fetch(`${baseUrl}/v1/audit/events`, {
      headers: { Authorization: `Bearer ${tokenBrics}` },
    });
    assert.equal(resEvents.status, 403, 'BRICS analyst must be rejected from /v1/audit/events with 403');

    const resVerify = await fetch(`${baseUrl}/v1/audit/verify`, {
      headers: { Authorization: `Bearer ${tokenBrics}` },
    });
    assert.equal(resVerify.status, 403, 'BRICS analyst must be rejected from /v1/audit/verify with 403');
    console.log('  ✓ BRICS Analyst strictly isolated with 403 Forbidden from national audit trails.');
    passed++;
  }

  // Test 3: Cryptographic Merkle chain validation & Zero-PHI certification
  console.log('\n[TEST 3] GET /v1/audit/verify validates Merkle chain digest and confirms Zero-PHI');
  {
    const res = await fetch(`${baseUrl}/v1/audit/verify`, {
      headers: { Authorization: `Bearer ${tokenAuditor}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.tamperEvidentStatus, 'SECURE_AND_VERIFIED');
    assert.equal(data.zeroPhiCertified, true);
    assert.ok(data.cumulativeDigest);
    assert.equal(data.cumulativeDigest.length, 64);
    console.log(`  ✓ Merkle chain verified across ${data.verifiedCount} historical transactions. Digest: ${data.cumulativeDigest.slice(0, 16)}...`);
    passed++;
  }

  // Test 4: Idempotency enforcement on operational routes
  console.log('\n[TEST 4] POST /v1/stock/adjust strictly enforces idempotency to prevent double-adjustments');
  {
    const idempKey = `idemp_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const curRes = await query('SELECT qty FROM stock_on_hand WHERE facility_id = $1 AND sku_id = $2', [SHIRUR_ID, ORS_ID]);
    const initQty = curRes.rows[0]?.qty ?? 50;

    // First adjustment attempt
    const res1 = await fetch(`${baseUrl}/v1/stock/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenNurse}`,
        'X-Idempotency-Key': idempKey,
      },
      body: JSON.stringify({
        facilityId: SHIRUR_ID,
        skuId: ORS_ID,
        delta: 10,
      }),
    });
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.success, true);
    assert.equal(data1.updatedQty, initQty + 10);

    // Duplicate replay attempt with same key
    const res2 = await fetch(`${baseUrl}/v1/stock/adjust`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenNurse}`,
        'X-Idempotency-Key': idempKey,
      },
      body: JSON.stringify({
        facilityId: SHIRUR_ID,
        skuId: ORS_ID,
        delta: 10,
      }),
    });
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.idempotent, true);

    // Check DB stock value
    const checkDb = await query('SELECT qty FROM stock_on_hand WHERE facility_id = $1 AND sku_id = $2', [SHIRUR_ID, ORS_ID]);
    assert.equal(checkDb.rows[0].qty, initQty + 10, 'Stock must only be modified once despite retry');
    console.log('  ✓ Idempotency protected: duplicate request handled safely without double increment.');
    passed++;
  }

  // Test 5: Offline batch replay endpoint
  console.log('\n[TEST 5] POST /v1/offline/sync-batch processes queued offline operations and deduplicates');
  {
    const key1 = `offline_stock_${Date.now()}`;
    const key2 = `offline_cap_${Date.now()}`;
    const key3 = `offline_att_${Date.now()}`;

    const batch = {
      items: [
        {
          idempotencyKey: key1,
          action: 'STOCK_ADJUST',
          facilityId: SHIRUR_ID,
          payload: { skuId: ORS_ID, newQty: 95 },
        },
        {
          idempotencyKey: key2,
          action: 'CAPACITY_UPDATE',
          facilityId: SHIRUR_ID,
          payload: { bedsTotal: 15, bedsAvailable: 7, oxygenCylinders: 8 },
        },
        {
          idempotencyKey: key3,
          action: 'ATTENDANCE_UPDATE',
          facilityId: SHIRUR_ID,
          payload: { nursesPresent: 5, doctorsPresent: 2, anmsPresent: 4, rosterNurses: 6 },
        },
      ],
    };

    const resBatch = await fetch(`${baseUrl}/v1/offline/sync-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenNurse}`,
      },
      body: JSON.stringify(batch),
    });
    assert.equal(resBatch.status, 200);
    const dataBatch = await resBatch.json();
    assert.equal(dataBatch.totalItems, 3);
    assert.equal(dataBatch.processedCount, 3);
    assert.equal(dataBatch.skippedDuplicateCount, 0);

    // Verify DB mutations
    const stockVerify = await query('SELECT qty FROM stock_on_hand WHERE facility_id = $1 AND sku_id = $2', [SHIRUR_ID, ORS_ID]);
    assert.equal(stockVerify.rows[0].qty, 95);

    // Replay duplicate batch
    const resDup = await fetch(`${baseUrl}/v1/offline/sync-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenNurse}`,
      },
      body: JSON.stringify(batch),
    });
    assert.equal(resDup.status, 200);
    const dataDup = await resDup.json();
    assert.equal(dataDup.processedCount, 0);
    assert.equal(dataDup.skippedDuplicateCount, 3);
    console.log('  ✓ Offline batch processed 3 items and safely skipped 3 duplicates upon replay.');
    passed++;
  }

  // Test 6: Zero-PHI guarantee in audit logs
  console.log('\n[TEST 6] Verify Zero-PHI guarantee across all audit log event payloads');
  {
    const res = await fetch(`${baseUrl}/v1/audit/events?limit=100`, {
      headers: { Authorization: `Bearer ${tokenAuditor}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    const forbidden = ['password_hash', 'patient_name', 'patientname', 'aadhaar', 'ssn'];

    for (const event of data.events) {
      const payloadStr = JSON.stringify(event.payload || {}).toLowerCase();
      for (const f of forbidden) {
        assert.ok(!payloadStr.includes(f), `Event ${event.id} contains forbidden PHI key: ${f}`);
      }
    }
    console.log(`  ✓ Verified ${data.events.length} audit records. Zero PHI or unredacted credentials found.`);
    passed++;
  }

  console.log('\n================================================================');
  console.log(`   STAGE 4 RESULTS: ${passed}/${total} PASSED (100% SUCCESS)        `);
  console.log('================================================================\n');

  server.close();
  setTimeout(() => process.exit(0), 200);
}

runStage4Tests().catch((err) => {
  console.error('STAGE 4 TEST RUN FAILED:', err);
  process.exit(1);
});

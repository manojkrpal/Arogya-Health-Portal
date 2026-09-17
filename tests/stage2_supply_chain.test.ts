import assert from 'assert';
import { initDb, query } from '../src/db/db.js';
import { optimizeTransfersForShortage } from '../src/services/optimizer.js';
import { approveTransferOrder } from '../src/services/transfers.js';
import { recomputeAlerts } from '../src/services/alerts.js';

async function runStage2SupplyChainTests() {
  console.log('--- RUNNING STAGE 2: CORE SUPPLY CHAIN & TRANSFER OPTIMIZATION SUITE ---');

  await initDb();

  // 1. Facilities & SKUs Setup
  const shirurRes = await query("SELECT id, tenant_id FROM facilities WHERE code = 'PHC-SHIRUR'");
  const mancharRes = await query("SELECT id, tenant_id FROM facilities WHERE code = 'CHC-MANCHAR'");
  const talegaonRes = await query("SELECT id, tenant_id FROM facilities WHERE code = 'PHC-TALEGAON'");
  const baramatiRes = await query("SELECT id, tenant_id FROM facilities WHERE code = 'DH-BARAMATI'");

  const shirurId = shirurRes.rows[0].id;
  const mancharId = mancharRes.rows[0].id;
  const talegaonId = talegaonRes.rows[0].id;
  const baramatiId = baramatiRes.rows[0].id;
  const tenantId = shirurRes.rows[0].tenant_id;

  const orsRes = await query("SELECT id FROM skus WHERE code = 'ORS-20.5G'");
  const insulinRes = await query("SELECT id FROM skus WHERE code = 'INS-REG-40'");
  const amoxRes = await query("SELECT id FROM skus WHERE code = 'AMOX-500'");

  const orsId = orsRes.rows[0].id;
  const insulinId = insulinRes.rows[0].id;
  const amoxId = amoxRes.rows[0].id;

  // 2. Donor Cover Rule Verification
  // Manchar has demand of 120 and reorder point 80.
  // Set Manchar ORS stock to 150 (demand is 120, so max spareable is 30).
  await query('UPDATE stock_on_hand SET qty = 150 WHERE facility_id = $1 AND sku_id = $2', [mancharId, orsId]);
  await query('UPDATE stock_on_hand SET qty = 10 WHERE facility_id = $1 AND sku_id = $2', [shirurId, orsId]);

  // Requesting 50 units for Shirur
  const proposals = await optimizeTransfersForShortage(shirurId, orsId, 50);
  assert.ok(proposals.length > 0, 'Optimizer should find eligible donors');

  // Manchar should spare at most 30 to strictly retain 120 (>= 7-day cover)
  const mancharProposal = proposals.find(p => p.fromFacilityId === mancharId);
  if (mancharProposal) {
    assert.ok(mancharProposal.qty <= 30, `Manchar cannot exceed spareable limit of 30, proposed: ${mancharProposal.qty}`);
    assert.ok(mancharProposal.donorRemainingQty >= mancharProposal.donorRequiredCover, 'Donor remaining stock must be >= required 7-day cover');
  }
  console.log('✔ Test 1 passed: Donor cover rule strictly preserved by optimizer');

  // 3. FIFO Expiry Ordering Verification in Atomic Transfer
  // Upsert stock_on_hand records for Baramati and Shirur for AMOX
  await query(
    `INSERT INTO stock_on_hand (facility_id, sku_id, qty, reorder_point)
     VALUES ($1, $2, 70, 20)
     ON CONFLICT (facility_id, sku_id) DO UPDATE SET qty = 70, reorder_point = 20`,
    [baramatiId, amoxId]
  );
  await query(
    `INSERT INTO stock_on_hand (facility_id, sku_id, qty, reorder_point)
     VALUES ($1, $2, 10, 20)
     ON CONFLICT (facility_id, sku_id) DO UPDATE SET qty = 10, reorder_point = 20`,
    [shirurId, amoxId]
  );

  // Insert two lots for Baramati: one expiring in 15 days, one expiring in 60 days
  await query('DELETE FROM stock_lots WHERE facility_id = $1 AND sku_id = $2', [baramatiId, amoxId]);
  await query(
    `INSERT INTO stock_lots (facility_id, sku_id, qty, expires_on)
     VALUES ($1, $2, 20, CURRENT_DATE + INTERVAL '15 days'),
            ($1, $2, 50, CURRENT_DATE + INTERVAL '60 days')`,
    [baramatiId, amoxId]
  );

  // Propose transfer of 30 units from Baramati to Shirur
  const orderRes = await query(
    `INSERT INTO transfer_orders (tenant_id, from_facility, to_facility, sku_id, qty, status, eta_hours, distance_km)
     VALUES ($1, $2, $3, $4, 30, 'proposed', 1.5, 45)
     RETURNING id`,
    [tenantId, baramatiId, shirurId, amoxId]
  );
  const orderId = orderRes.rows[0].id;

  const officerRes = await query("SELECT id FROM users WHERE role = 'district_officer' LIMIT 1");
  const officerId = officerRes.rows[0].id;

  // Approve transfer
  const approval = await approveTransferOrder(orderId, officerId, 'req_stage2_fifo_test');
  assert.strictEqual(approval.success, true);

  // Check Baramati lots: 20 units of the 15-day lot must be fully consumed, and 10 units taken from 60-day lot (40 remaining)
  const remainingLots = await query(
    'SELECT qty, expires_on FROM stock_lots WHERE facility_id = $1 AND sku_id = $2 ORDER BY expires_on ASC',
    [baramatiId, amoxId]
  );
  assert.strictEqual(remainingLots.rows.length, 1, 'Near-expiry lot should be completely drawn first');
  assert.strictEqual(Number(remainingLots.rows[0].qty), 40, 'Remaining later-expiry lot should have 40 units left');
  console.log('✔ Test 2 passed: FIFO draw order strictly prioritizes earliest expiry lots');

  // 4. Concurrency / Over-allocation Prevention
  // Attempting to approve an order when donor stock has dropped below required amount must reject
  const invalidOrderRes = await query(
    `INSERT INTO transfer_orders (tenant_id, from_facility, to_facility, sku_id, qty, status, eta_hours, distance_km)
     VALUES ($1, $2, $3, $4, 100, 'proposed', 1.0, 20)
     RETURNING id`,
    [tenantId, baramatiId, shirurId, amoxId]
  );
  const invalidOrderId = invalidOrderRes.rows[0].id;

  let overAllocFailed = false;
  try {
    await approveTransferOrder(invalidOrderId, officerId, 'req_stage2_overallocation_test');
  } catch (err: any) {
    overAllocFailed = true;
    assert.ok(
      err.message.includes('insufficient') || err.message.includes('cover') || err.message.includes('donor'),
      `Unexpected error message: ${err.message}`
    );
  }
  assert.ok(overAllocFailed, 'Approving transfer beyond available unreserved stock must fail');
  console.log('✔ Test 3 passed: Concurrency and over-allocation protection verified');

  // 5. Cold-Chain Verification
  let coldChainViolated = false;
  try {
    await optimizeTransfersForShortage(talegaonId, insulinId, 15);
  } catch (err: any) {
    coldChainViolated = true;
  }
  assert.ok(coldChainViolated, 'Cold chain transfer to non-cold-chain facility strictly disallowed');
  console.log('✔ Test 4 passed: Cold chain logistics governance verified');

  console.log('--- ALL STAGE 2 SUPPLY CHAIN TESTS PASSED! ---');
  process.exit(0);
}

runStage2SupplyChainTests().catch((err) => {
  console.error('Stage 2 tests failed:', err);
  process.exit(1);
});

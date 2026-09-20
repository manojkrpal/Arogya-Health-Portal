import assert from 'assert';
import { generateToken } from '../src/services/auth.js';
import {
  getDroneCorridors,
  getActiveDroneFlights,
  dispatchDroneFlight,
  completeDroneFlight,
} from '../src/services/droneLogistics.js';
import {
  getEpidemicForecasts,
  updateClimateTelemetry,
} from '../src/services/epidemicEngine.js';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
} from '../src/services/procurementService.js';
import { getNationalGridStates } from '../src/services/nationalGrid.js';
import { analyzeMultimodalTriageWithGemini } from '../src/services/gemini.js';

async function runLevel3TestSuite() {
  console.log('🚀 [Level 3 Test Suite] Starting Verification of Autonomous Logistics & Epidemic AI Grid...\n');

  // 1. Drone BVLoS Aerial Fleet Tests
  console.log('--- 1. Drone BVLoS Aerial Corridors & Sortie Lifecycle ---');
  const corridors = await getDroneCorridors();
  assert(corridors.length >= 3, 'Must have at least 3 certified BVLoS corridors');
  console.log(`✅ Verified ${corridors.length} active BVLoS low-altitude drone corridors.`);

  const initialFlights = await getActiveDroneFlights();
  console.log(`✅ Active drone sorties tracked: ${initialFlights.length}`);

  const dispatchedFlight = await dispatchDroneFlight({
    corridorId: corridors[0].id,
    skuCode: 'INS-001',
    skuName: 'Human Insulin NPH 100IU/ml',
    qty: 30,
    actorEmail: 'officer@pune.health.gov.in',
    actorRole: 'district_officer',
    requestId: 'req_test_drone_01',
  });

  assert.strictEqual(dispatchedFlight.status, 'in_flight');
  assert(dispatchedFlight.payloadTempC >= 2.0 && dispatchedFlight.payloadTempC <= 8.0, 'Payload temp must be within 2-8°C cold-chain');
  assert(dispatchedFlight.batteryPct > 50, 'Battery must be sufficient for BVLoS flight');
  console.log(`✅ Dispatched Emergency Drone Sortie ${dispatchedFlight.flightCode} with cold-chain temp ${dispatchedFlight.payloadTempC}°C.`);

  const landedFlight = await completeDroneFlight({
    flightId: dispatchedFlight.id,
    actorEmail: 'nurse@shirur.phc.gov.in',
    actorRole: 'phc_nurse',
    requestId: 'req_test_drone_02',
  });
  assert.strictEqual(landedFlight.status, 'landed');
  assert.strictEqual(landedFlight.progressPct, 100);
  console.log(`✅ Completed Landing & Handover for Sortie ${landedFlight.flightCode} at destination PHC.`);

  // 2. Epidemiological Forecasting & Climate Correlation Tests
  console.log('\n--- 2. Epidemiological Forecasting & IMD Climate Correlation ---');
  const forecasts = await getEpidemicForecasts();
  assert(forecasts.length >= 3, 'Must track Dengue, Cholera, and Malaria forecasts');
  console.log(`✅ Loaded ${forecasts.length} pathogen risk curves.`);

  const updatedForecasts = await updateClimateTelemetry({
    district: 'Pune District',
    rainfallMm: 195.0, // High monsoon flood runoff
    tempCelsius: 28.5,
    humidityPct: 88,
    actorEmail: 'warroom@mohfw.gov.in',
    actorRole: 'national_war_room',
    requestId: 'req_test_climate_01',
  });

  const dengueItem = updatedForecasts.find((f) => f.pathogen === 'Dengue');
  assert(dengueItem, 'Dengue forecast must exist');
  assert.strictEqual(dengueItem.alertLevel, 'outbreak_critical');
  assert(dengueItem.surgeMultiplier >= 2.0, 'Outbreak multiplier must escalate under extreme monsoon precipitation');
  console.log(`✅ Climate telemetry sync verified: Dengue Vector Risk escalated to ${dengueItem.weatherRiskIndex}/100, Surge Multiplier = ${dengueItem.surgeMultiplier}x.`);

  // 3. Central Drug Warehouse (CDW) Autonomous Procurement Tests
  console.log('\n--- 3. Central Drug Warehouse (CDW) Procurement Lifecycle ---');
  const existingPOs = await getPurchaseOrders();
  console.log(`✅ Current Active Purchase Orders in pipeline: ${existingPOs.length}`);

  const newPO = await createPurchaseOrder({
    cdwHubName: 'Pune Central Drug Warehouse (CDW-MH-01)',
    supplierName: 'Bharat Serums & Vaccines Ltd.',
    skuCode: 'INS-001',
    skuName: 'Human Insulin NPH 100IU/ml',
    quantity: 1200,
    unitCostInr: 145.0,
    deliveryType: 'expedited_cold_courier',
    actorEmail: 'procurement@maharashtra.gov.in',
    actorRole: 'procurement_officer',
    requestId: 'req_test_po_01',
  });

  assert.strictEqual(newPO.status, 'ordered');
  assert.strictEqual(newPO.leadTimeDays, 2);
  assert.strictEqual(newPO.totalAmountInr, 1200 * 145.0);
  console.log(`✅ Issued PO ${newPO.poNumber} (Total: ₹${newPO.totalAmountInr.toLocaleString()}, Expedited Lead Time: ${newPO.leadTimeDays}d).`);

  const receivedPO = await receivePurchaseOrder({
    poId: newPO.id,
    actorEmail: 'procurement@maharashtra.gov.in',
    actorRole: 'procurement_officer',
    requestId: 'req_test_po_02',
  });
  assert.strictEqual(receivedPO.status, 'received');
  console.log(`✅ Received consignment for PO ${receivedPO.poNumber} into CDW central inventory.`);

  // 4. National Multi-State Grid Tests
  console.log('\n--- 4. National Multi-State Health Grid (Zero-PHI) ---');
  const gridStates = await getNationalGridStates();
  assert.strictEqual(gridStates.length, 4, 'Must return MH, GJ, KA, KL states');
  const mhState = gridStates.find((s) => s.stateCode === 'MH');
  assert(mhState && mhState.readinessIndex > 80, 'Maharashtra grid readiness must be verified');
  console.log(`✅ Verified National Grid aggregation across ${gridStates.map((s) => s.stateCode).join(', ')}.`);

  // 5. Multimodal AI Clinical Triage Tests
  console.log('\n--- 5. Multimodal AI Clinical Triage Copilot ---');
  const triageEn = await analyzeMultimodalTriageWithGemini({
    facilityName: 'Shirur PHC',
    symptomText: 'Patient presents with severe dehydration and vomiting following flood runoff',
    preferredLang: 'en',
  });

  assert(triageEn.result.verified, 'Triage result must be verified');
  assert(triageEn.result.recommendedSkus.length > 0, 'Must recommend buffer SKUs');
  console.log(`✅ Multimodal Triage English output verified: Condition = "${triageEn.result.recognizedCondition}".`);

  const triageHi = await analyzeMultimodalTriageWithGemini({
    facilityName: 'Shirur PHC',
    symptomText: 'High fever and retro-orbital headache observed',
    preferredLang: 'hi',
  });
  assert(triageHi.result.language === 'hi', 'Language must be Hindi');
  console.log(`✅ Multimodal Triage Hindi output verified.`);

  console.log('\n🎉 ALL LEVEL 3 TESTS PASSED SUCCESSFULLY! Autonomous Logistics & Epidemic AI Grid is 100% verified.');
  process.exit(0);
}

runLevel3TestSuite().catch((err) => {
  console.error('❌ [Level 3 Test Suite] FAILED:', err);
  process.exit(1);
});

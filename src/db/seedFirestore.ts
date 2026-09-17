import { doc, setDoc, writeBatch } from 'firebase/firestore';
import { db, TENANT_ID } from '../lib/firebase.js';

export async function seedFirestoreData() {
  console.log('[Firestore Seed] Starting ArogyaNet Level 2 Firestore seeding...');

  // 1. Tenant metadata
  await setDoc(doc(db, 'tenants', TENANT_ID), {
    id: TENANT_ID,
    code: 'MH-PUNE-RURAL',
    name: 'Pune Rural District Health Authority',
    state: 'Maharashtra',
    country_code: 'IN',
    residency: 'India/IN-West',
    emergency_outbreak_multiplier: 1.0,
    emergency_active_label: 'Baseline Surveillance',
    updated_at: new Date().toISOString(),
  }, { merge: true });

  // 2. Facilities
  const facilities = [
    {
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      tenant_id: TENANT_ID,
      code: 'PHC-SHIRUR',
      name: 'Shirur Primary Health Centre',
      type: 'PHC',
      state: 'Maharashtra',
      district: 'Pune Rural',
      location: { latitude: 18.8288, longitude: 74.3789 },
      cold_chain_capable: true,
      capacity: {
        beds_total: 10,
        beds_available: 3,
        oxygen_lines_total: 4,
        oxygen_lines_available: 4,
        icu_capacity_total: 0,
        icu_capacity_available: 0,
      },
      staffing: {
        phc_nurse_count: 4,
        doctors_count: 1,
        anms_count: 2,
        district_officer_assigned: 'officer@pune.health.gov.in',
      },
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      tenant_id: TENANT_ID,
      code: 'PHC-TALEGAON',
      name: 'Talegaon Dabhade PHC',
      type: 'PHC',
      state: 'Maharashtra',
      district: 'Pune Rural',
      location: { latitude: 18.7307, longitude: 73.6738 },
      cold_chain_capable: false,
      capacity: {
        beds_total: 6,
        beds_available: 2,
        oxygen_lines_total: 2,
        oxygen_lines_available: 1,
        icu_capacity_total: 0,
        icu_capacity_available: 0,
      },
      staffing: {
        phc_nurse_count: 3,
        doctors_count: 1,
        anms_count: 1,
        district_officer_assigned: 'officer@pune.health.gov.in',
      },
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      tenant_id: TENANT_ID,
      code: 'CHC-MANCHAR',
      name: 'Manchar Community Health Centre',
      type: 'CHC',
      state: 'Maharashtra',
      district: 'Pune Rural',
      location: { latitude: 19.0068, longitude: 73.9431 },
      cold_chain_capable: true,
      capacity: {
        beds_total: 30,
        beds_available: 11,
        oxygen_lines_total: 14,
        oxygen_lines_available: 9,
        icu_capacity_total: 4,
        icu_capacity_available: 2,
      },
      staffing: {
        phc_nurse_count: 10,
        doctors_count: 3,
        anms_count: 5,
        district_officer_assigned: 'officer@pune.health.gov.in',
      },
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
      tenant_id: TENANT_ID,
      code: 'DH-BARAMATI',
      name: 'Baramati Sub-District Hospital',
      type: 'DH',
      state: 'Maharashtra',
      district: 'Pune Rural',
      location: { latitude: 18.1517, longitude: 74.5771 },
      cold_chain_capable: true,
      capacity: {
        beds_total: 100,
        beds_available: 24,
        oxygen_lines_total: 45,
        oxygen_lines_available: 18,
        icu_capacity_total: 12,
        icu_capacity_available: 4,
      },
      staffing: {
        phc_nurse_count: 30,
        doctors_count: 8,
        anms_count: 12,
        district_officer_assigned: 'officer@pune.health.gov.in',
      },
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  for (const fac of facilities) {
    await setDoc(doc(db, 'tenants', TENANT_ID, 'facilities', fac.id), fac, { merge: true });
  }

  // 3. SKUs
  const skus = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      tenant_id: TENANT_ID,
      code: 'ORS-20.5G',
      name: 'Oral Rehydration Salts (ORS) 20.5g',
      category: 'ESSENTIAL_DRUG',
      unit: 'packets',
      reorder_point: 100,
      safety_stock: 50,
      cold_chain_required: false,
      shelf_life_days: 730,
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      tenant_id: TENANT_ID,
      code: 'AMOX-500',
      name: 'Amoxicillin Capsules 500mg',
      category: 'ANTIBIOTIC',
      unit: 'strips (10s)',
      reorder_point: 80,
      safety_stock: 40,
      cold_chain_required: false,
      shelf_life_days: 1095,
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      tenant_id: TENANT_ID,
      code: 'PCM-500',
      name: 'Paracetamol Tablets 500mg',
      category: 'ESSENTIAL_DRUG',
      unit: 'strips (10s)',
      reorder_point: 150,
      safety_stock: 75,
      cold_chain_required: false,
      shelf_life_days: 1095,
    },
    {
      id: '10000000-0000-0000-0000-000000000004',
      tenant_id: TENANT_ID,
      code: 'INS-REG-40',
      name: 'Regular Insulin 40 IU/ml (Cold Chain)',
      category: 'ESSENTIAL_DRUG',
      unit: 'vials',
      reorder_point: 25,
      safety_stock: 15,
      cold_chain_required: true,
      shelf_life_days: 365,
    },
    {
      id: '10000000-0000-0000-0000-000000000005',
      tenant_id: TENANT_ID,
      code: 'RAB-VAX',
      name: 'Anti-Rabies Vaccine 0.5ml (Cold Chain)',
      category: 'VACCINE',
      unit: 'vials',
      reorder_point: 20,
      safety_stock: 10,
      cold_chain_required: true,
      shelf_life_days: 730,
    },
    {
      id: '10000000-0000-0000-0000-000000000006',
      tenant_id: TENANT_ID,
      code: 'OXY-10',
      name: 'Oxytocin Injection 10 IU/ml',
      category: 'MATERNAL_HEALTH',
      unit: 'ampoules',
      reorder_point: 30,
      safety_stock: 20,
      cold_chain_required: true,
      shelf_life_days: 540,
    },
  ];

  for (const sku of skus) {
    await setDoc(doc(db, 'tenants', TENANT_ID, 'skus', sku.id), sku, { merge: true });
  }

  // 4. Initial Stock on Hand
  const stockItems = [
    // Shirur PHC
    { facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', skuId: '10000000-0000-0000-0000-000000000001', qty: 45, reorder_point: 100 },
    { facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', skuId: '10000000-0000-0000-0000-000000000002', qty: 120, reorder_point: 80 },
    { facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', skuId: '10000000-0000-0000-0000-000000000003', qty: 300, reorder_point: 150 },
    { facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', skuId: '10000000-0000-0000-0000-000000000004', qty: 18, reorder_point: 25 },
    { facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', skuId: '10000000-0000-0000-0000-000000000005', qty: 30, reorder_point: 20 },
    { facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', skuId: '10000000-0000-0000-0000-000000000006', qty: 40, reorder_point: 30 },
    // Manchar CHC (Surplus Donor)
    { facilityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', skuId: '10000000-0000-0000-0000-000000000001', qty: 450, reorder_point: 100 },
    { facilityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', skuId: '10000000-0000-0000-0000-000000000002', qty: 350, reorder_point: 150 },
    { facilityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', skuId: '10000000-0000-0000-0000-000000000004', qty: 95, reorder_point: 30 },
    // Talegaon PHC
    { facilityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', skuId: '10000000-0000-0000-0000-000000000001', qty: 180, reorder_point: 80 },
    { facilityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', skuId: '10000000-0000-0000-0000-000000000002', qty: 90, reorder_point: 80 },
    // Baramati DH
    { facilityId: 'dddddddd-dddd-dddd-dddd-dddddddddddd', skuId: '10000000-0000-0000-0000-000000000001', qty: 900, reorder_point: 200 },
    { facilityId: 'dddddddd-dddd-dddd-dddd-dddddddddddd', skuId: '10000000-0000-0000-0000-000000000004', qty: 210, reorder_point: 50 },
  ];

  for (const s of stockItems) {
    await setDoc(doc(db, 'tenants', TENANT_ID, 'inventory', s.facilityId, 'stock', s.skuId), {
      facility_id: s.facilityId,
      sku_id: s.skuId,
      qty: s.qty,
      reorder_point: s.reorder_point,
      updated_at: new Date().toISOString(),
      updated_by: 'system_seed',
    }, { merge: true });
  }

  // 5. Forecasts
  const forecasts = [
    {
      sku_id: '10000000-0000-0000-0000-000000000001',
      facility_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      predicted_demand: 70.0,
      stockout_prob_7d: 0.65,
      confidence_95_upper: 85.0,
      confidence_95_lower: 55.0,
      model_version: 'bqml:v1',
      computed_at: new Date().toISOString(),
    },
    {
      sku_id: '10000000-0000-0000-0000-000000000004',
      facility_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      predicted_demand: 24.0,
      stockout_prob_7d: 0.48,
      confidence_95_upper: 30.0,
      confidence_95_lower: 18.0,
      model_version: 'bqml:v1',
      computed_at: new Date().toISOString(),
    },
    {
      sku_id: '10000000-0000-0000-0000-000000000001',
      facility_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      predicted_demand: 120.0,
      stockout_prob_7d: 0.05,
      confidence_95_upper: 140.0,
      confidence_95_lower: 100.0,
      model_version: 'bqml:v1',
      computed_at: new Date().toISOString(),
    },
    {
      sku_id: '10000000-0000-0000-0000-000000000001',
      facility_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      predicted_demand: 50.0,
      stockout_prob_7d: 0.08,
      confidence_95_upper: 60.0,
      confidence_95_lower: 40.0,
      model_version: 'bqml:v1',
      computed_at: new Date().toISOString(),
    },
  ];

  for (const f of forecasts) {
    await setDoc(doc(db, 'tenants', TENANT_ID, 'forecasts', f.sku_id, 'by_facility', f.facility_id), f, { merge: true });
  }

  // 6. Active Alerts
  const alerts = [
    {
      id: 'alert-ors-shirur-01',
      tenant_id: TENANT_ID,
      facility_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      sku_id: '10000000-0000-0000-0000-000000000001',
      severity: 'critical',
      type: 'PROB_04',
      message: 'Oral Rehydration Salts (ORS) stockout probability in 7 days is 65% (>40% threshold). Current stock: 45 pkts, 7-day demand: 70 pkts.',
      open: true,
      triggered_at: new Date().toISOString(),
      acknowledged_at: null,
      ack_by: null,
      sms_sent_at: new Date().toISOString(),
    },
    {
      id: 'alert-ins-shirur-01',
      tenant_id: TENANT_ID,
      facility_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      sku_id: '10000000-0000-0000-0000-000000000004',
      severity: 'critical',
      type: 'PROB_04',
      message: 'Regular Insulin (Cold Chain) stockout probability in 7 days is 48%. Current stock: 18 vials.',
      open: true,
      triggered_at: new Date().toISOString(),
      acknowledged_at: null,
      ack_by: null,
      sms_sent_at: new Date().toISOString(),
    },
  ];

  for (const a of alerts) {
    await setDoc(doc(db, 'tenants', TENANT_ID, 'alerts', a.id), a, { merge: true });
  }

  // 7. Users (All 7 Roles)
  const users = [
    {
      id: '90000000-0000-0000-0000-000000000001',
      tenant_id: TENANT_ID,
      email: 'nurse@shirur.phc.gov.in',
      phone: '+919822011001',
      name: 'Sunita Patil',
      role: 'phc_nurse',
      facility_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      state_id: 'MH',
      active: true,
      mfa_enabled: false,
      created_at: new Date().toISOString(),
    },
    {
      id: '90000000-0000-0000-0000-000000000005',
      tenant_id: TENANT_ID,
      email: 'nurse@manchar.chc.gov.in',
      phone: '+919822011005',
      name: 'Rekha Deshmukh',
      role: 'phc_nurse',
      facility_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      state_id: 'MH',
      active: true,
      mfa_enabled: false,
      created_at: new Date().toISOString(),
    },
    {
      id: '90000000-0000-0000-0000-000000000002',
      tenant_id: TENANT_ID,
      email: 'officer@pune.health.gov.in',
      phone: '+919822011002',
      name: 'Dr. Anand Kulkarni',
      role: 'district_officer',
      facility_id: null,
      state_id: 'MH',
      active: true,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '90000000-0000-0000-0000-000000000003',
      tenant_id: TENANT_ID,
      email: 'warroom@mohfw.gov.in',
      phone: '+919811000001',
      name: 'National Emergency Operations Command',
      role: 'national_war_room',
      facility_id: null,
      state_id: null,
      active: true,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '90000000-0000-0000-0000-000000000004',
      tenant_id: TENANT_ID,
      email: 'analyst@brics-health.org',
      phone: '+41227912111',
      name: 'Dr. Sergei Voronov',
      role: 'brics_analyst',
      facility_id: null,
      state_id: null,
      active: true,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
    },
    // New Stage 1 Roles:
    {
      id: '90000000-0000-0000-0000-000000000006',
      tenant_id: TENANT_ID,
      email: 'admin@maharashtra.health.gov.in',
      phone: '+919822011006',
      name: 'Vikram Joshi (State Admin)',
      role: 'state_admin',
      facility_id: null,
      state_id: 'MH',
      active: true,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
    },
    {
      id: '90000000-0000-0000-0000-000000000007',
      tenant_id: TENANT_ID,
      email: 'procurement@maharashtra.gov.in',
      phone: '+919822011007',
      name: 'Pooja Shinde (Procurement)',
      role: 'procurement_officer',
      facility_id: null,
      state_id: 'MH',
      active: true,
      mfa_enabled: false,
      created_at: new Date().toISOString(),
    },
    {
      id: '90000000-0000-0000-0000-000000000008',
      tenant_id: TENANT_ID,
      email: 'auditor@mohfw.gov.in',
      phone: '+919811000008',
      name: 'Rajesh Mehra (Compliance Audit)',
      role: 'compliance_auditor',
      facility_id: null,
      state_id: null,
      active: true,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
    },
  ];

  for (const u of users) {
    await setDoc(doc(db, 'tenants', TENANT_ID, 'users', u.id), u, { merge: true });
  }

  // 8. BRICS Federation Aggregates (Cross-border, Anonymized)
  const federationAggregates = [
    {
      id: 'in-west-agg-01',
      region_id: 'IN-WEST',
      country_code: 'IN',
      report_date: new Date().toISOString().split('T')[0],
      epidemic_severity_score: 1.45,
      aggregate_stockout_risk: 0.42,
      surveillance_indices: JSON.stringify({
        ors_stockout_p: 0.42,
        insulin_stockout_p: 0.38,
        surplus_band: 'MED',
      }),
      model_version: 'brics-ess-v1.2',
    },
    {
      id: 'br-sp-agg-01',
      region_id: 'BR-SP',
      country_code: 'BR',
      report_date: new Date().toISOString().split('T')[0],
      epidemic_severity_score: 1.05,
      aggregate_stockout_risk: 0.18,
      surveillance_indices: JSON.stringify({
        ors_stockout_p: 0.18,
        insulin_stockout_p: 0.14,
        surplus_band: 'HIGH',
      }),
      model_version: 'brics-ess-v1.2',
    },
  ];

  for (const agg of federationAggregates) {
    await setDoc(doc(db, 'brics_federation', agg.region_id, 'aggregates', agg.id), agg, { merge: true });
  }

  console.log('[Firestore Seed] Seeding completed successfully!');
}

if (process.argv[1]?.endsWith('seedFirestore.ts')) {
  seedFirestoreData()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to seed Firestore:', err);
      process.exit(1);
    });
}

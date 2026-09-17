-- ==========================================================
-- ArogyaNet Seed Data
-- ==========================================================

-- 1. Tenants
INSERT INTO tenants (id, code, name, country_code, residency) VALUES
('11111111-1111-1111-1111-111111111111', 'MH-PUNE-RURAL', 'Pune Rural District', 'IN', 'India/IN-West')
ON CONFLICT (code) DO NOTHING;

INSERT INTO tenants (id, code, name, country_code, residency) VALUES
('22222222-2222-2222-2222-222222222222', 'MH-SATARA-RURAL', 'Satara District Health Authority', 'IN', 'India/IN-West')
ON CONFLICT (code) DO NOTHING;

INSERT INTO tenants (id, code, name, country_code, residency) VALUES
('33333333-3333-3333-3333-333333333333', 'BR-SP-CENTRO', 'São Paulo State Health Directorate', 'BR', 'Brazil/BR-SE')
ON CONFLICT (code) DO NOTHING;

-- Emergency settings
INSERT INTO emergency_settings (tenant_id, outbreak_multiplier, active_label) VALUES
('11111111-1111-1111-1111-111111111111', 1.0, 'Baseline Surveillance')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO emergency_settings (tenant_id, outbreak_multiplier, active_label) VALUES
('22222222-2222-2222-2222-222222222222', 1.0, 'Baseline Surveillance')
ON CONFLICT (tenant_id) DO NOTHING;

-- 2. Facilities
INSERT INTO facilities (id, tenant_id, code, name, level, district, lat, lng, cold_chain_capable) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'PHC-SHIRUR', 'Shirur Primary Health Centre', 'PHC', 'Pune Rural', 18.8288, 74.3789, true),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'PHC-TALEGAON', 'Talegaon Dabhade PHC', 'PHC', 'Pune Rural', 18.7307, 73.6738, false),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'CHC-MANCHAR', 'Manchar Community Health Centre', 'CHC', 'Pune Rural', 19.0068, 73.9431, true),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'DH-BARAMATI', 'Baramati Sub-District Hospital', 'DH', 'Pune Rural', 18.1517, 74.5771, true)
ON CONFLICT (tenant_id, code) DO NOTHING;

-- 3. Users (Passwords: nurse123, officer123, warroom123, analyst123)
INSERT INTO users (id, tenant_id, email, password_hash, role, facility_id) VALUES
('90000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'nurse@shirur.phc.gov.in', '$2b$10$ahSZWIQcqkOMyLO/Jftj5.7Jls1IWcY6NVxBXnH/f70YS/EMXtMxS', 'phc_nurse', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
('90000000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'nurse@manchar.chc.gov.in', '$2b$10$ahSZWIQcqkOMyLO/Jftj5.7Jls1IWcY6NVxBXnH/f70YS/EMXtMxS', 'phc_nurse', 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
('90000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'officer@pune.health.gov.in', '$2b$10$hJn4S5RU8bdF.MLSnRaW1.F3Ttyfgu8hsOF52DTqjVGFCVe5N2.3y', 'district_officer', NULL),
('90000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'warroom@mohfw.gov.in', '$2b$10$h6wcLy7yBlG147J1aXD.4Ogf1V4wGeIMvdh2Wgdlk.zYdRO4i9rLK', 'national_war_room', NULL),
('90000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'analyst@brics-health.org', '$2b$10$/VLvVDSaW1/caHKcutzyl.WmIKtM7xIwjtU0hASa0AxuD3BPwMtai', 'brics_analyst', NULL)
ON CONFLICT (email) DO NOTHING;

-- 4. SKUs
INSERT INTO skus (id, code, name, unit, cold_chain) VALUES
('10000000-0000-0000-0000-000000000001', 'ORS-20.5G', 'Oral Rehydration Salts (ORS) 20.5g', 'packets', false),
('10000000-0000-0000-0000-000000000002', 'AMOX-500', 'Amoxicillin Capsules 500mg', 'strips (10s)', false),
('10000000-0000-0000-0000-000000000003', 'PCM-500', 'Paracetamol Tablets 500mg', 'strips (10s)', false),
('10000000-0000-0000-0000-000000000004', 'INS-REG-40', 'Regular Insulin 40 IU/ml (Cold Chain)', 'vials', true),
('10000000-0000-0000-0000-000000000005', 'RAB-VAX', 'Anti-Rabies Vaccine 0.5ml (Cold Chain)', 'vials', true),
('10000000-0000-0000-0000-000000000006', 'OXY-10', 'Oxytocin Injection 10 IU/ml', 'ampoules', true)
ON CONFLICT (code) DO NOTHING;

-- 5. Stock on Hand & Lots
-- Shirur PHC:
-- ORS currently at 45 (reorder 100, demand 7d = 70 => warning risk!)
-- AMOX at 120 (reorder 80, ok)
-- PCM at 300 (reorder 150, ok)
-- INSULIN at 18 (reorder 25, high stockout risk)
INSERT INTO stock_on_hand (facility_id, sku_id, qty, reorder_point) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 45, 100),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000002', 120, 80),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000003', 300, 150),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000004', 18, 25),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000005', 30, 20),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000006', 40, 30)
ON CONFLICT (facility_id, sku_id) DO UPDATE SET qty = EXCLUDED.qty, reorder_point = EXCLUDED.reorder_point;

-- Manchar CHC (Surplus Donor Facility):
-- ORS at 450 (reorder 100, demand 7d = 120 => donor can spare up to 450 - 120 = 330)
INSERT INTO stock_on_hand (facility_id, sku_id, qty, reorder_point) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '10000000-0000-0000-0000-000000000001', 450, 100),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '10000000-0000-0000-0000-000000000002', 350, 150),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '10000000-0000-0000-0000-000000000004', 95, 30)
ON CONFLICT (facility_id, sku_id) DO UPDATE SET qty = EXCLUDED.qty;

-- Talegaon PHC:
INSERT INTO stock_on_hand (facility_id, sku_id, qty, reorder_point) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10000000-0000-0000-0000-000000000001', 180, 80),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10000000-0000-0000-0000-000000000002', 90, 80)
ON CONFLICT (facility_id, sku_id) DO UPDATE SET qty = EXCLUDED.qty;

-- Baramati DH:
INSERT INTO stock_on_hand (facility_id, sku_id, qty, reorder_point) VALUES
('dddddddd-dddd-dddd-dddd-dddddddddddd', '10000000-0000-0000-0000-000000000001', 900, 200),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '10000000-0000-0000-0000-000000000004', 210, 50)
ON CONFLICT (facility_id, sku_id) DO UPDATE SET qty = EXCLUDED.qty;

-- Lots (FIFO by expiry)
-- Shirur lots
INSERT INTO stock_lots (facility_id, sku_id, qty, expires_on) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 20, CURRENT_DATE + INTERVAL '45 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 25, CURRENT_DATE + INTERVAL '120 days'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000004', 18, CURRENT_DATE + INTERVAL '60 days');

-- Manchar lots (Candidate Donor)
INSERT INTO stock_lots (facility_id, sku_id, qty, expires_on) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '10000000-0000-0000-0000-000000000001', 150, CURRENT_DATE + INTERVAL '35 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '10000000-0000-0000-0000-000000000001', 300, CURRENT_DATE + INTERVAL '180 days'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '10000000-0000-0000-0000-000000000004', 95, CURRENT_DATE + INTERVAL '90 days');

-- Capacity
INSERT INTO capacity (facility_id, beds_total, beds_available, oxygen_cylinders) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 10, 3, 4),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 6, 2, 2),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 30, 11, 14),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 100, 24, 45)
ON CONFLICT (facility_id) DO UPDATE SET beds_available = EXCLUDED.beds_available;

-- Daily Attendance (Count only, NO patient/staff names)
INSERT INTO attendance_daily (facility_id, day, nurses_present, doctors_present, anms_present, roster_nurses) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE, 3, 1, 2, 4),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE, 2, 1, 1, 3),
('cccccccc-cccc-cccc-cccc-cccccccccccc', CURRENT_DATE, 8, 3, 5, 10),
('dddddddd-dddd-dddd-dddd-dddddddddddd', CURRENT_DATE, 25, 8, 12, 30)
ON CONFLICT (facility_id, day) DO UPDATE SET nurses_present = EXCLUDED.nurses_present;

-- Daily Footfall
INSERT INTO footfall_daily (facility_id, day, opd_count) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE, 48),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE, 32),
('cccccccc-cccc-cccc-cccc-cccccccccccc', CURRENT_DATE, 142),
('dddddddd-dddd-dddd-dddd-dddddddddddd', CURRENT_DATE, 380)
ON CONFLICT (facility_id, day) DO UPDATE SET opd_count = EXCLUDED.opd_count;

-- Forecasts (labeled model: stub)
INSERT INTO forecasts (facility_id, sku_id, demand_qty_7d, stockout_prob_7d, model_version) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 70.0, 0.6500, 'stub:v0'),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000004', 24.0, 0.4800, 'stub:v0'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '10000000-0000-0000-0000-000000000001', 120.0, 0.0500, 'stub:v0'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '10000000-0000-0000-0000-000000000001', 50.0, 0.0800, 'stub:v0')
ON CONFLICT (facility_id, sku_id) DO UPDATE SET stockout_prob_7d = EXCLUDED.stockout_prob_7d;

-- Alerts (Initial)
INSERT INTO alerts (tenant_id, facility_id, sku_id, severity, rule_code, message, open) VALUES
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000001', 'critical', 'PROB_04', 'ORS 20.5g stockout probability in 7 days is 65% (>40% threshold). Current stock: 45 pkts, 7-day demand: 70 pkts.', true),
('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '10000000-0000-0000-0000-000000000004', 'critical', 'PROB_04', 'Regular Insulin stockout probability in 7 days is 48%. Current stock: 18 vials.', true)
ON CONFLICT DO NOTHING;

-- Federation Data (Indices only, NEVER raw counts)
INSERT INTO federation_ess_daily (tenant_id, sku_id, day, predicted_demand_index, stockout_p, surplus_qty_band) VALUES
('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, 1.4500, 0.4200, 'MED'),
('11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-000000000004', CURRENT_DATE, 1.1200, 0.3800, 'LOW'),
('22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, 0.9200, 0.1100, 'HIGH'),
('33333333-3333-3333-3333-333333333333', '10000000-0000-0000-0000-000000000001', CURRENT_DATE, 1.0500, 0.1800, 'HIGH')
ON CONFLICT (tenant_id, sku_id, day) DO NOTHING;

-- Federation Model Card
INSERT INTO federation_model_cards (version, prior_name, notes) VALUES
('brics-ess-v1.2', 'Bayesian Hierarchical Outbreak Prior (National + State + District)', 'Federated parameter averaging across sovereign health authorities. No individual health record or facility identifier leaves national boundaries.')
ON CONFLICT DO NOTHING;

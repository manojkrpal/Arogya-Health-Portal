-- ==========================================================
-- ArogyaNet Canonical PostgreSQL Schema
-- ==========================================================

-- Clean drop for idempotency in migrations/tests if needed
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('phc_nurse', 'district_officer', 'national_war_room', 'brics_analyst');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE facility_level AS ENUM ('PHC', 'CHC', 'DH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_status AS ENUM ('proposed', 'approved', 'rejected', 'in_transit', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warn', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Tenants (Districts / Jurisdictions)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  country_code CHAR(2) NOT NULL DEFAULT 'IN',
  residency VARCHAR(128) NOT NULL DEFAULT 'India/IN-South'
);

-- 2. Facilities
CREATE TABLE IF NOT EXISTS facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  code VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  level facility_level NOT NULL DEFAULT 'PHC',
  district VARCHAR(128) NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  cold_chain_capable BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(tenant_id, code)
);
CREATE INDEX IF NOT EXISTS idx_facilities_tenant ON facilities(tenant_id);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  facility_id UUID REFERENCES facilities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_facility ON users(facility_id);

-- 4. SKUs (Essential Medicines & Supplies)
CREATE TABLE IF NOT EXISTS skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  unit VARCHAR(32) NOT NULL DEFAULT 'units',
  cold_chain BOOLEAN NOT NULL DEFAULT false
);

-- 5. Stock On Hand
CREATE TABLE IF NOT EXISTS stock_on_hand (
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  qty INT NOT NULL CHECK (qty >= 0),
  reorder_point INT NOT NULL CHECK (reorder_point >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (facility_id, sku_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_on_hand_facility_sku ON stock_on_hand(facility_id, sku_id);

-- 6. Stock Lots (for FIFO expiry tracking)
CREATE TABLE IF NOT EXISTS stock_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  qty INT NOT NULL CHECK (qty > 0),
  expires_on DATE NOT NULL CHECK (expires_on >= CURRENT_DATE)
);
CREATE INDEX IF NOT EXISTS idx_stock_lots_facility_sku_exp ON stock_lots(facility_id, sku_id, expires_on ASC);

-- 7. Facility Capacity (Beds and Oxygen)
CREATE TABLE IF NOT EXISTS capacity (
  facility_id UUID PRIMARY KEY REFERENCES facilities(id) ON DELETE CASCADE,
  beds_total INT NOT NULL CHECK (beds_total >= 0),
  beds_available INT NOT NULL CHECK (beds_available >= 0),
  oxygen_cylinders INT NOT NULL DEFAULT 0,
  CHECK (beds_available <= beds_total)
);

-- 8. Daily Attendance (Counts only - NO names, NO PHI)
CREATE TABLE IF NOT EXISTS attendance_daily (
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  nurses_present INT NOT NULL DEFAULT 0,
  doctors_present INT NOT NULL DEFAULT 0,
  anms_present INT NOT NULL DEFAULT 0,
  roster_nurses INT NOT NULL DEFAULT 0,
  PRIMARY KEY (facility_id, day)
);

-- 9. Daily Footfall (Aggregated counts only)
CREATE TABLE IF NOT EXISTS footfall_daily (
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  opd_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (facility_id, day)
);

-- 10. Forecasts (Demand & Stockout Risk)
CREATE TABLE IF NOT EXISTS forecasts (
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  demand_qty_7d NUMERIC(12,2) NOT NULL DEFAULT 0,
  stockout_prob_7d NUMERIC(5,4) NOT NULL CHECK (stockout_prob_7d BETWEEN 0 AND 1),
  model_version TEXT NOT NULL DEFAULT 'stub:v0',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (facility_id, sku_id)
);

-- 11. Emergency Outbreak Multipliers
CREATE TABLE IF NOT EXISTS emergency_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  outbreak_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.0 CHECK (outbreak_multiplier > 0),
  active_label VARCHAR(128) NOT NULL DEFAULT 'Normal Baseline'
);

-- 12. Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  sku_id UUID REFERENCES skus(id) ON DELETE SET NULL,
  severity alert_severity NOT NULL,
  rule_code VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  open BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_status_severity ON alerts(open, severity);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant ON alerts(tenant_id);

-- 13. Transfer Orders (Human-in-the-loop: proposed -> approved)
CREATE TABLE IF NOT EXISTS transfer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  from_facility UUID NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  to_facility UUID NOT NULL REFERENCES facilities(id) ON DELETE RESTRICT,
  sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  qty INT NOT NULL CHECK (qty > 0),
  status transfer_status NOT NULL DEFAULT 'proposed',
  eta_hours NUMERIC(6,1) NOT NULL DEFAULT 2.0,
  distance_km NUMERIC(8,1) NOT NULL DEFAULT 25.0,
  gemini_plan_id TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (from_facility <> to_facility)
);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_status ON transfer_orders(status);
CREATE INDEX IF NOT EXISTS idx_transfer_orders_tenant ON transfer_orders(tenant_id);

-- 14. Audit Events (Immutable Log)
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(128) NOT NULL,
  entity VARCHAR(64) NOT NULL,
  entity_id VARCHAR(128) NOT NULL,
  payload JSONB DEFAULT '{}',
  request_id VARCHAR(128) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_events_at ON audit_events(at DESC);

-- 15. Federation ESS Daily (Strict tenant-level indices, NO raw counts)
CREATE TABLE IF NOT EXISTS federation_ess_daily (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku_id UUID NOT NULL REFERENCES skus(id) ON DELETE RESTRICT,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  predicted_demand_index NUMERIC(8,4) NOT NULL,
  stockout_p NUMERIC(5,4) NOT NULL,
  surplus_qty_band TEXT NOT NULL CHECK (surplus_qty_band IN ('LOW', 'MED', 'HIGH')),
  PRIMARY KEY (tenant_id, sku_id, day)
);

-- 16. Federation Model Cards
CREATE TABLE IF NOT EXISTS federation_model_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(64) NOT NULL,
  prior_name VARCHAR(128) NOT NULL,
  notes TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Defense in depth: brics_analyst has NO direct SELECT access to
-- stock_on_hand, stock_lots, attendance_daily, or transfer_orders.
-- ==========================================================
ALTER TABLE stock_on_hand ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_on_hand FORCE ROW LEVEL SECURITY;
ALTER TABLE stock_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_lots FORCE ROW LEVEL SECURITY;
ALTER TABLE attendance_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_daily FORCE ROW LEVEL SECURITY;
ALTER TABLE transfer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_orders FORCE ROW LEVEL SECURITY;

-- Note: We configure session variable 'app.current_user_role'
DROP POLICY IF EXISTS rls_stock_on_hand_analyst ON stock_on_hand;
CREATE POLICY rls_stock_on_hand_analyst ON stock_on_hand
  FOR ALL
  USING (COALESCE(current_setting('app.current_user_role', true), '') <> 'brics_analyst')
  WITH CHECK (COALESCE(current_setting('app.current_user_role', true), '') <> 'brics_analyst');

DROP POLICY IF EXISTS rls_stock_lots_analyst ON stock_lots;
CREATE POLICY rls_stock_lots_analyst ON stock_lots
  FOR ALL
  USING (COALESCE(current_setting('app.current_user_role', true), '') <> 'brics_analyst')
  WITH CHECK (COALESCE(current_setting('app.current_user_role', true), '') <> 'brics_analyst');

DROP POLICY IF EXISTS rls_attendance_daily_analyst ON attendance_daily;
CREATE POLICY rls_attendance_daily_analyst ON attendance_daily
  FOR ALL
  USING (COALESCE(current_setting('app.current_user_role', true), '') <> 'brics_analyst')
  WITH CHECK (COALESCE(current_setting('app.current_user_role', true), '') <> 'brics_analyst');

DROP POLICY IF EXISTS rls_transfer_orders_analyst ON transfer_orders;
CREATE POLICY rls_transfer_orders_analyst ON transfer_orders
  FOR ALL
  USING (COALESCE(current_setting('app.current_user_role', true), '') <> 'brics_analyst')
  WITH CHECK (COALESCE(current_setting('app.current_user_role', true), '') <> 'brics_analyst');

-- Create non-superuser role so Postgres RLS policies are strictly enforced
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOSUPERUSER;
  END IF;
END $$;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_user;


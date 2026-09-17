import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', [
  'phc_nurse',
  'district_officer',
  'national_war_room',
  'brics_analyst',
  'state_admin',
  'procurement_officer',
  'compliance_auditor',
]);

export const facilityLevelEnum = pgEnum('facility_level', ['PHC', 'CHC', 'DH']);

export const transferStatusEnum = pgEnum('transfer_status', [
  'proposed',
  'approved',
  'rejected',
  'in_transit',
  'completed',
]);

export const alertSeverityEnum = pgEnum('alert_severity', ['info', 'warn', 'critical']);

// 1. Tenants (Districts / Jurisdictions)
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  countryCode: varchar('country_code', { length: 2 }).notNull().default('IN'),
  residency: varchar('residency', { length: 128 }).notNull().default('India/IN-South'),
});

// 2. Facilities
export const facilities = pgTable('facilities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  code: varchar('code', { length: 64 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  level: facilityLevelEnum('level').notNull().default('PHC'),
  district: varchar('district', { length: 128 }).notNull(),
  lat: doublePrecision('lat').notNull(),
  lng: doublePrecision('lng').notNull(),
  coldChainCapable: boolean('cold_chain_capable').notNull().default(true),
});

// 3. Users
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  uid: text('uid').unique(), // Firebase Auth UID for Cloud SQL Auth integration
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  facilityId: uuid('facility_id').references(() => facilities.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 4. SKUs (Essential Medicines & Supplies)
export const skus = pgTable('skus', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 32 }).notNull().default('units'),
  coldChain: boolean('cold_chain').notNull().default(false),
});

// 5. Stock On Hand
export const stockOnHand = pgTable(
  'stock_on_hand',
  {
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    skuId: uuid('sku_id')
      .notNull()
      .references(() => skus.id),
    qty: integer('qty').notNull(),
    reorderPoint: integer('reorder_point').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.facilityId, table.skuId] }),
  ]
);

// 6. Stock Lots (for FIFO expiry tracking)
export const stockLots = pgTable('stock_lots', {
  id: uuid('id').primaryKey().defaultRandom(),
  facilityId: uuid('facility_id')
    .notNull()
    .references(() => facilities.id, { onDelete: 'cascade' }),
  skuId: uuid('sku_id')
    .notNull()
    .references(() => skus.id),
  qty: integer('qty').notNull(),
  expiresOn: date('expires_on').notNull(),
});

// 7. Facility Capacity (Beds and Oxygen)
export const capacity = pgTable('capacity', {
  facilityId: uuid('facility_id')
    .primaryKey()
    .references(() => facilities.id, { onDelete: 'cascade' }),
  bedsTotal: integer('beds_total').notNull(),
  bedsAvailable: integer('beds_available').notNull(),
  oxygenCylinders: integer('oxygen_cylinders').notNull().default(0),
});

// 8. Daily Attendance (Aggregated counts only - NO names, NO PHI)
export const attendanceDaily = pgTable(
  'attendance_daily',
  {
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    nursesPresent: integer('nurses_present').notNull().default(0),
    doctorsPresent: integer('doctors_present').notNull().default(0),
    anmsPresent: integer('anms_present').notNull().default(0),
    rosterNurses: integer('roster_nurses').notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.facilityId, table.day] }),
  ]
);

// 9. Daily Footfall (Aggregated counts only)
export const footfallDaily = pgTable(
  'footfall_daily',
  {
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    opdCount: integer('opd_count').notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.facilityId, table.day] }),
  ]
);

// 10. Forecasts (Demand & Stockout Risk)
export const forecasts = pgTable(
  'forecasts',
  {
    facilityId: uuid('facility_id')
      .notNull()
      .references(() => facilities.id, { onDelete: 'cascade' }),
    skuId: uuid('sku_id')
      .notNull()
      .references(() => skus.id),
    demandQty7d: doublePrecision('demand_qty_7d').notNull().default(0),
    stockoutProb7d: doublePrecision('stockout_prob_7d').notNull(),
    modelVersion: text('model_version').notNull().default('stub:v0'),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.facilityId, table.skuId] }),
  ]
);

// 11. Emergency Outbreak Multipliers
export const emergencySettings = pgTable('emergency_settings', {
  tenantId: uuid('tenant_id')
    .primaryKey()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  outbreakMultiplier: doublePrecision('outbreak_multiplier').notNull().default(1.0),
  activeLabel: varchar('active_label', { length: 128 }).notNull().default('Normal Baseline'),
});

// 12. Alerts
export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  facilityId: uuid('facility_id')
    .notNull()
    .references(() => facilities.id, { onDelete: 'cascade' }),
  skuId: uuid('sku_id').references(() => skus.id, { onDelete: 'set null' }),
  severity: alertSeverityEnum('severity').notNull(),
  ruleCode: varchar('rule_code', { length: 64 }).notNull(),
  message: text('message').notNull(),
  open: boolean('open').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 13. Transfer Orders (Human-in-the-loop: proposed -> approved)
export const transferOrders = pgTable('transfer_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  fromFacility: uuid('from_facility')
    .notNull()
    .references(() => facilities.id),
  toFacility: uuid('to_facility')
    .notNull()
    .references(() => facilities.id),
  skuId: uuid('sku_id')
    .notNull()
    .references(() => skus.id),
  qty: integer('qty').notNull(),
  status: transferStatusEnum('status').notNull().default('proposed'),
  etaHours: doublePrecision('eta_hours').notNull().default(2.0),
  distanceKm: doublePrecision('distance_km').notNull().default(25.0),
  geminiPlanId: text('gemini_plan_id'),
  createdBy: uuid('created_by').references(() => users.id),
  decidedBy: uuid('decided_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 14. Audit Events (Immutable Log)
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  actorId: uuid('actor_id').references(() => users.id),
  action: varchar('action', { length: 128 }).notNull(),
  entity: varchar('entity', { length: 64 }).notNull(),
  entityId: varchar('entity_id', { length: 128 }).notNull(),
  payload: jsonb('payload').default({}),
  requestId: varchar('request_id', { length: 128 }).notNull(),
});

// 15. Federation ESS Daily (Strict tenant-level indices, NO raw counts)
export const federationEssDaily = pgTable(
  'federation_ess_daily',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    skuId: uuid('sku_id')
      .notNull()
      .references(() => skus.id),
    day: date('day').notNull(),
    predictedDemandIndex: doublePrecision('predicted_demand_index').notNull(),
    stockoutP: doublePrecision('stockout_p').notNull(),
    surplusQtyBand: text('surplus_qty_band').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.skuId, table.day] }),
  ]
);

// 16. Federation Model Cards
export const federationModelCards = pgTable('federation_model_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: varchar('version', { length: 64 }).notNull(),
  priorName: varchar('prior_name', { length: 128 }).notNull(),
  notes: text('notes').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true }).notNull().defaultNow(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  facilities: many(facilities),
  users: many(users),
}));

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [facilities.tenantId],
    references: [tenants.id],
  }),
  users: many(users),
  stockOnHand: many(stockOnHand),
  stockLots: many(stockLots),
  capacity: one(capacity, {
    fields: [facilities.id],
    references: [capacity.facilityId],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
  facility: one(facilities, {
    fields: [users.facilityId],
    references: [facilities.id],
  }),
}));

export const transferOrdersRelations = relations(transferOrders, ({ one }) => ({
  fromFacilityRef: one(facilities, {
    fields: [transferOrders.fromFacility],
    references: [facilities.id],
  }),
  toFacilityRef: one(facilities, {
    fields: [transferOrders.toFacility],
    references: [facilities.id],
  }),
  skuRef: one(skus, {
    fields: [transferOrders.skuId],
    references: [skus.id],
  }),
}));

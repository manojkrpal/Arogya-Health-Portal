export type UserRole =
  | 'phc_nurse'
  | 'district_officer'
  | 'national_war_room'
  | 'brics_analyst'
  | 'state_admin'
  | 'procurement_officer'
  | 'compliance_auditor';

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantName: string;
  countryCode: string;
  facilityId: string | null;
  facilityName: string | null;
}

export interface FacilityCapacity {
  bedsTotal: number;
  bedsAvailable: number;
  bedsOccupied?: number;
  icuTotal?: number;
  icuAvailable?: number;
  icuOccupied?: number;
  oxygenCylinders: number;
}

export interface FacilityAttendance {
  nursesPresent: number;
  doctorsPresent: number;
  anmsPresent: number;
  rosterNurses: number;
  opdCount: number;
}

export interface FacilityRisk {
  criticalCount: number;
  warnCount: number;
  maxStockoutProb: number;
  highestRiskSku: string | null;
  modelNotice: string;
}

export interface FacilitySnapshot {
  id: string;
  code: string;
  name: string;
  level: 'PHC' | 'CHC' | 'DH';
  district: string;
  lat: number;
  lng: number;
  coldChainCapable: boolean;
  tenantId: string;
  tenantName: string;
  countryCode: string;
  status: 'healthy' | 'warning' | 'critical';
  capacity: FacilityCapacity;
  attendance: FacilityAttendance;
  risk: FacilityRisk;
}

export interface SkuItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  coldChain: boolean;
}

export interface StockItem {
  skuId: string;
  code: string;
  name: string;
  unit: string;
  coldChain: boolean;
  qty: number;
  reorderPoint: number;
  demand7d: number;
  stockoutProb7d: number;
  modelVersion: string;
  modelLabel: string;
  updatedAt: string;
  // Aliases and calculated helpers for nurse and inventory consoles
  quantity?: number;
  skuName?: string;
  skuCode?: string;
  safetyStockThreshold?: number;
  dailyBurnRate?: number;
  daysOfSupplyRemaining?: number;
  isCriticalStockout?: boolean;
}

export interface StockLot {
  id: string;
  skuId: string;
  skuCode: string;
  qty: number;
  expiresOn: string;
}

export interface AlertItem {
  id: string;
  facilityId: string;
  facilityName: string;
  district: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  coldChain: boolean;
  severity: 'critical' | 'warn' | 'info';
  ruleCode: string;
  message: string;
  open: boolean;
  currentQty: number;
  demand7d: number;
  stockoutProb7d: number;
  outbreakMultiplier: number;
  modelNotice: string;
  createdAt: string;
}

export interface ProposedTransferLine {
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  qty: number;
  distanceKm: number;
  etaHours: number;
  donorRemainingQty: number;
  donorRequiredCover: number;
}

export interface GeminiTransferPlan {
  explanation_en: string;
  explanation_hi: string;
  confidence: number;
  lines: Array<{
    fromFacilityId: string;
    toFacilityId: string;
    skuCode: string;
    qty: number;
    reason: string;
  }>;
}

export interface TransferOrder {
  id: string;
  tenantId: string;
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  unit: string;
  coldChain: boolean;
  qty: number;
  status: 'proposed' | 'approved' | 'rejected';
  etaHours: number;
  distanceKm: number;
  geminiPlanId: string | null;
  donorCurrentQty: number;
  donorDemand7d: number;
  createdByEmail: string | null;
  decidedByEmail: string | null;
  createdAt: string;
}

export interface FederationItem {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  countryCode: string;
  skuCode: string;
  skuName: string;
  date: string;
  predictedDemandIndex: number;
  stockoutProbability: number;
  surplusBand: 'LOW' | 'MED' | 'HIGH';
}

export interface FederationModelCard {
  id: string;
  version: string;
  prior_name: string;
  notes: string;
  applied_at: string;
}

export interface AuditEventItem {
  id: string;
  at: string;
  action: string;
  entity: string;
  entityId: string;
  actor: {
    id: string | null;
    email: string | null;
    role: string | null;
    name?: string | null;
  };
  payload: any;
  requestId: string | null;
  integrityHash: string;
}

export interface AuditVerifyResult {
  success: boolean;
  verifiedCount: number;
  cumulativeDigest: string;
  zeroPhiCertified: boolean;
  tamperEvidentStatus: 'SECURE_AND_VERIFIED' | 'TAMPER_DETECTED';
  checkedAt: string;
}

export interface QueuedOfflineItem {
  idempotencyKey: string;
  action: 'STOCK_ADJUST' | 'CAPACITY_UPDATE' | 'ATTENDANCE_UPDATE';
  facilityId: string;
  payload: any;
  timestamp: number;
}

export interface TelemetryDevice {
  id: string;
  facilityId: string;
  facilityName: string;
  facilityDistrict: string;
  level: string;
  deviceId: string;
  temperature: number;
  tempMinSafe: number;
  tempMaxSafe: number;
  status: 'optimal' | 'warning' | 'critical_excursion';
  batteryPct: number;
  powerSource: string;
  doorOpen: boolean;
  recordedAt: string;
  coldChainCapable: boolean;
}

export interface ExpiryRadarItem {
  lotId: string;
  facilityId: string;
  facilityName: string;
  district: string;
  skuId: string;
  skuCode: string;
  skuName: string;
  coldChain: boolean;
  qty: number;
  expiresOn: string;
  daysToExpiry: number;
  urgency: 'critical' | 'high' | 'moderate';
  recommendedAction: string;
  suggestedRecipient?: {
    facilityId: string;
    facilityName: string;
    distanceKm: number;
    dailyDemand: number;
  };
}

export interface DispatchRoutePlan {
  transferId: string;
  fromFacilityId: string;
  fromFacilityName: string;
  toFacilityId: string;
  toFacilityName: string;
  skuCode: string;
  skuName: string;
  qty: number;
  coldChainRequired: boolean;
  distanceKm: number;
  estimatedTransitHours: number;
  coldBoxPassiveWindowHours: number;
  thermalSafetyMarginHours: number;
  status: 'proposed' | 'approved' | 'in_transit' | 'completed';
  vehicleType: string;
  checkpoints: Array<{ name: string; lat: number; lng: number; etaMinutes: number }>;
  dispatchStartedAt?: string;
  dispatchedByEmail?: string;
  completedAt?: string;
}

export interface DroneCorridor {
  id: string;
  code: string;
  originFacilityId: string;
  originFacilityName: string;
  destinationFacilityId: string;
  destinationFacilityName: string;
  distanceKm: number;
  flightTimeMinutes: number;
  maxAltitudeMeters: number;
  status: 'active_corridor' | 'weather_hold' | 'scheduled';
  terrainType: 'Western Ghats Ridge' | 'Highland Plateau' | 'River Basin';
  batteryRequiredPct: number;
}

export interface DroneFlight {
  id: string;
  flightCode: string;
  corridorId: string;
  droneModel: string;
  originName: string;
  destinationName: string;
  skuCode: string;
  skuName: string;
  qty: number;
  status: 'standby' | 'in_flight' | 'landed' | 'aborted';
  altitudeMeters: number;
  airspeedKmh: number;
  batteryPct: number;
  payloadTempC: number;
  windSpeedKmh: number;
  progressPct: number;
  currentLat: number;
  currentLng: number;
  startedAt?: string;
  completedAt?: string;
  dispatchedByEmail?: string;
}

export interface EpidemicForecastItem {
  id: string;
  pathogen: 'Dengue' | 'Malaria' | 'Cholera / ADD' | 'Viral Respiratory (ILI)';
  district: string;
  currentActiveCases: number;
  predicted14dCases: number;
  r0Value: number;
  weatherRiskIndex: number; // 0 to 100
  monsoonRainfallMm: number;
  tempCelsius: number;
  humidityPct: number;
  alertLevel: 'watch' | 'warning' | 'outbreak_critical';
  surgeMultiplier: number;
  recommendedBufferPreAllocation: Array<{
    skuCode: string;
    skuName: string;
    recommendedUnits: number;
    urgency: 'high' | 'critical';
  }>;
  aiEpidemiologicalNote: string;
}

export interface ProcurementPO {
  id: string;
  poNumber: string;
  cdwHubName: string;
  supplierName: string;
  skuCode: string;
  skuName: string;
  quantity: number;
  unitCostInr: number;
  totalAmountInr: number;
  leadTimeDays: number;
  deliveryType: 'expedited_cold_courier' | 'bulk_consignment';
  status: 'draft' | 'ordered' | 'in_transit' | 'received';
  orderedByEmail: string | null;
  createdAt: string;
  etaDate: string;
}

export interface NationalGridState {
  stateCode: string;
  stateName: string;
  activeFacilities: number;
  totalBeds: number;
  bedsOccupied: number;
  occupancyPct: number;
  criticalAlertsCount: number;
  avgStockCoverageDays: number;
  coldChainCompliancePct: number;
  readinessIndex: number; // 0 to 100
  strategicBufferStatus: 'HEALTHY' | 'SURGE_WARNING' | 'EMERGENCY_MOBILIZATION';
}

export interface MultimodalTriageResult {
  verified: boolean;
  recognizedCondition: string;
  urgencyLevel: 'routine' | 'urgent' | 'emergency';
  clinicalSummary: string;
  recommendedSkus: Array<{ skuCode: string; skuName: string; recommendedQty: number }>;
  confidenceScore: number;
  detectedExpiry?: string;
  packagingIntegrity?: 'intact' | 'compromised';
  language: string;
}

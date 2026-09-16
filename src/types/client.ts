export type UserRole = 'phc_nurse' | 'district_officer' | 'national_war_room' | 'brics_analyst';

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

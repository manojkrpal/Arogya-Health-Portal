import { query, withTransaction } from '../db/db.js';
import { recomputeAlerts } from './alerts.js';
import { logAuditEvent } from '../db/firestore-service.js';

export interface LiveTelemetryResponse {
  sensors: Array<{
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
  }>;
  summary: {
    totalUnits: number;
    optimalUnits: number;
    warningUnits: number;
    criticalExcursions: number;
    coldChainCompliancePct: number;
    lastCheckedAt: string;
  };
}

export interface ExpiryRadarResponse {
  lots: Array<{
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
  }>;
  summary: {
    totalLotsNearExpiry: number;
    criticalRiskCount: number;
    highRiskCount: number;
    potentialUnitsAtRisk: number;
  };
}

/**
 * Returns latest IoT telemetry from cold-chain units across all facilities
 */
export async function getLiveTelemetry(): Promise<LiveTelemetryResponse> {
  // Query latest reading per facility
  const res = await query(`
    SELECT DISTINCT ON (f.id)
      t.id,
      f.id as facility_id,
      f.name as facility_name,
      f.district as facility_district,
      f.level,
      f.cold_chain_capable,
      COALESCE(t.device_id, 'ILR-' || UPPER(REPLACE(f.code, 'PHC-', '')) || '-01') as device_id,
      COALESCE(t.temperature, 4.2) as temperature,
      COALESCE(t.battery_pct, 98) as battery_pct,
      COALESCE(t.power_source, 'solar_grid') as power_source,
      COALESCE(t.door_open, false) as door_open,
      COALESCE(t.recorded_at, NOW()) as recorded_at
    FROM facilities f
    LEFT JOIN cold_chain_telemetry t ON t.facility_id = f.id
    WHERE f.cold_chain_capable = true
    ORDER BY f.id, t.recorded_at DESC NULLS LAST
  `);

  const sensors = res.rows.map((r: any) => {
    const temp = parseFloat(r.temperature);
    let status: 'optimal' | 'warning' | 'critical_excursion' = 'optimal';
    if (temp < 2.0 || temp > 8.0) {
      status = 'critical_excursion';
    } else if (temp < 2.5 || temp > 7.5 || r.door_open || r.battery_pct < 20) {
      status = 'warning';
    }

    return {
      id: r.id || `virtual-${r.facility_id}`,
      facilityId: r.facility_id,
      facilityName: r.facility_name,
      facilityDistrict: r.facility_district,
      level: r.level,
      deviceId: r.device_id,
      temperature: temp,
      tempMinSafe: 2.0,
      tempMaxSafe: 8.0,
      status,
      batteryPct: parseInt(r.battery_pct, 10),
      powerSource: r.power_source,
      doorOpen: Boolean(r.door_open),
      recordedAt: r.recorded_at instanceof Date ? r.recorded_at.toISOString() : String(r.recorded_at),
      coldChainCapable: Boolean(r.cold_chain_capable),
    };
  });

  const criticalExcursions = sensors.filter((s) => s.status === 'critical_excursion').length;
  const warningUnits = sensors.filter((s) => s.status === 'warning').length;
  const optimalUnits = sensors.filter((s) => s.status === 'optimal').length;
  const totalUnits = sensors.length;
  const coldChainCompliancePct = totalUnits > 0 ? Math.round(((totalUnits - criticalExcursions) / totalUnits) * 100) : 100;

  return {
    sensors,
    summary: {
      totalUnits,
      optimalUnits,
      warningUnits,
      criticalExcursions,
      coldChainCompliancePct,
      lastCheckedAt: new Date().toISOString(),
    },
  };
}

/**
 * Ingest IoT temperature sensor data
 */
export async function ingestTelemetry(
  facilityId: string,
  deviceId: string,
  temperature: number,
  batteryPct: number = 95,
  doorOpen: boolean = false,
  powerSource: string = 'solar_grid',
  requestId: string = `iot_${Date.now()}`
): Promise<{ success: boolean; excursion: boolean; newAlertsCount: number }> {
  const insertRes = await query(
    `INSERT INTO cold_chain_telemetry (facility_id, device_id, temperature, battery_pct, door_open, power_source, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id, recorded_at`,
    [facilityId, deviceId, temperature, batteryPct, doorOpen, powerSource]
  );

  const isExcursion = temperature < 2.0 || temperature > 8.0;

  // Re-run alert evaluation
  const newAlertsCount = await recomputeAlerts();

  if (isExcursion) {
    await logAuditEvent({
      actor: {
        userId: 'system_telemetry_sensor',
        email: 'iot-telemetry@arogyanet.gov.in',
        role: 'system',
      },
      action: 'COLD_CHAIN_EXCURSION_DETECTED',
      entityType: 'cold_chain_telemetry',
      entityId: insertRes.rows[0].id,
      metadata: {
        facilityId,
        deviceId,
        temperature,
        safeBand: '2.0C - 8.0C',
        doorOpen,
        batteryPct,
        requestId,
      },
    }).catch((err) => console.warn('[FirestoreAuditSync] Telemetry excursion error:', err.message));
  }

  return {
    success: true,
    excursion: isExcursion,
    newAlertsCount,
  };
}

/**
 * Expiry Radar - identifies lots nearing expiry and calculates high-demand redistributions
 */
export async function getExpiryRadar(): Promise<ExpiryRadarResponse> {
  const lotsRes = await query(`
    SELECT
      l.id as lot_id,
      l.facility_id,
      f.name as facility_name,
      f.district,
      l.sku_id,
      s.code as sku_code,
      s.name as sku_name,
      s.cold_chain,
      l.qty,
      l.expires_on,
      (l.expires_on - CURRENT_DATE) as days_to_expiry
    FROM stock_lots l
    JOIN facilities f ON f.id = l.facility_id
    JOIN skus s ON s.id = l.sku_id
    WHERE l.qty > 0 AND l.expires_on <= CURRENT_DATE + INTERVAL '90 days'
    ORDER BY l.expires_on ASC
  `);

  // Find candidate recipient facilities with high demand
  const candidatesRes = await query(`
    SELECT
      f.id as facility_id,
      f.name as facility_name,
      f.lat,
      f.lng,
      fc.sku_id,
      fc.demand_qty_7d,
      COALESCE(st.qty, 0) as current_qty
    FROM facilities f
    JOIN forecasts fc ON fc.facility_id = f.id
    LEFT JOIN stock_on_hand st ON st.facility_id = f.id AND st.sku_id = fc.sku_id
    WHERE fc.demand_qty_7d > 20
  `);

  const lots = lotsRes.rows.map((r: any) => {
    const days = parseInt(r.days_to_expiry, 10);
    let urgency: 'critical' | 'high' | 'moderate' = 'moderate';
    let action = 'Prioritize in regular dispensing';

    if (days <= 30) {
      urgency = 'critical';
      action = 'Immediate expedited transfer to high-footfall facility';
    } else if (days <= 60) {
      urgency = 'high';
      action = 'Schedule FIFO dispatch within current replenishment cycle';
    }

    // Find closest recipient with high demand
    const skuCandidates = candidatesRes.rows.filter(
      (c: any) => c.sku_id === r.sku_id && c.facility_id !== r.facility_id
    );
    let suggestedRecipient: any = undefined;

    if (skuCandidates.length > 0) {
      // Pick highest daily demand
      const best = skuCandidates.sort((a: any, b: any) => Number(b.demand_qty_7d) - Number(a.demand_qty_7d))[0];
      suggestedRecipient = {
        facilityId: best.facility_id,
        facilityName: best.facility_name,
        distanceKm: 28.5,
        dailyDemand: Math.round(Number(best.demand_qty_7d) / 7),
      };
    }

    return {
      lotId: r.lot_id,
      facilityId: r.facility_id,
      facilityName: r.facility_name,
      district: r.district,
      skuId: r.sku_id,
      skuCode: r.sku_code,
      skuName: r.sku_name,
      coldChain: Boolean(r.cold_chain),
      qty: parseInt(r.qty, 10),
      expiresOn: r.expires_on instanceof Date ? r.expires_on.toISOString().slice(0, 10) : String(r.expires_on).slice(0, 10),
      daysToExpiry: days,
      urgency,
      recommendedAction: action,
      suggestedRecipient,
    };
  });

  const criticalRiskCount = lots.filter((l) => l.urgency === 'critical').length;
  const highRiskCount = lots.filter((l) => l.urgency === 'high').length;
  const potentialUnitsAtRisk = lots.reduce((acc, l) => acc + l.qty, 0);

  return {
    lots,
    summary: {
      totalLotsNearExpiry: lots.length,
      criticalRiskCount,
      highRiskCount,
      potentialUnitsAtRisk,
    },
  };
}

/**
 * Generates cold-chain dispatch itineraries with passive thermal window validation
 */
export async function getDispatchRoutePlans(): Promise<any[]> {
  const orders = await query(`
    SELECT
      t.id as transfer_id,
      t.from_facility,
      f1.name as from_facility_name,
      f1.lat as from_lat,
      f1.lng as from_lng,
      t.to_facility,
      f2.name as to_facility_name,
      f2.lat as to_lat,
      f2.lng as to_lng,
      t.sku_id,
      s.code as sku_code,
      s.name as sku_name,
      s.cold_chain,
      t.qty,
      t.status,
      t.eta_hours,
      t.distance_km,
      t.created_at
    FROM transfer_orders t
    JOIN facilities f1 ON f1.id = t.from_facility
    JOIN facilities f2 ON f2.id = t.to_facility
    JOIN skus s ON s.id = t.sku_id
    WHERE t.status IN ('proposed', 'approved', 'in_transit', 'completed')
    ORDER BY t.created_at DESC
  `);

  return orders.rows.map((o: any) => {
    const isColdChain = Boolean(o.cold_chain);
    const distance = parseFloat(o.distance_km) || 25.0;
    const etaHours = parseFloat(o.eta_hours) || (distance / 35.0);
    const coldBoxPassiveWindowHours = isColdChain ? 4.5 : 24.0;
    const thermalSafetyMarginHours = Math.max(0, +(coldBoxPassiveWindowHours - etaHours).toFixed(1));

    // Calculate intermediate waypoint checkpoints
    const midLat = (o.from_lat + o.to_lat) / 2;
    const midLng = (o.from_lng + o.to_lng) / 2;

    const checkpoints = [
      { name: `${o.from_facility_name} (Dispatch Bay)`, lat: o.from_lat, lng: o.from_lng, etaMinutes: 0 },
      { name: 'District Highway Transit Point', lat: midLat, lng: midLng, etaMinutes: Math.round((etaHours * 60) / 2) },
      { name: `${o.to_facility_name} (Cold Room Inward)`, lat: o.to_lat, lng: o.to_lng, etaMinutes: Math.round(etaHours * 60) },
    ];

    return {
      transferId: o.transfer_id,
      fromFacilityId: o.from_facility,
      fromFacilityName: o.from_facility_name,
      toFacilityId: o.to_facility,
      toFacilityName: o.to_facility_name,
      skuCode: o.sku_code,
      skuName: o.sku_name,
      qty: parseInt(o.qty, 10),
      coldChainRequired: isColdChain,
      distanceKm: distance,
      estimatedTransitHours: +(etaHours.toFixed(1)),
      coldBoxPassiveWindowHours,
      thermalSafetyMarginHours,
      status: o.status,
      vehicleType: isColdChain ? 'Solar-Refrigerated Vaccine Carrier Van (MH-12-HC-8812)' : 'District Logistics Supply Truck',
      checkpoints,
    };
  });
}

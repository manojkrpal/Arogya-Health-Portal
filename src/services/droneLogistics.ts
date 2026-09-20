import { DroneCorridor, DroneFlight } from '../types/client.js';
import { logAuditEvent } from '../db/firestore-service.js';

// Pre-configured BVLoS Aerial Cold-Chain Corridors connecting CDW and District Hubs to remote hill PHCs
let CORRIDORS: DroneCorridor[] = [
  {
    id: 'corridor-pune-junnar-01',
    code: 'BVLoS-MH-PN01',
    originFacilityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', // Talegaon CHC / CDW Node
    originFacilityName: 'Talegaon CHC (CDW Node)',
    destinationFacilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Shirur PHC
    destinationFacilityName: 'Shirur PHC (Sub-District Remote)',
    distanceKm: 42.5,
    flightTimeMinutes: 24,
    maxAltitudeMeters: 120, // DGCA green zone limit (AGL)
    status: 'active_corridor',
    terrainType: 'Highland Plateau',
    batteryRequiredPct: 38,
  },
  {
    id: 'corridor-pune-manchar-02',
    code: 'BVLoS-MH-PN02',
    originFacilityId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    originFacilityName: 'Talegaon CHC (CDW Node)',
    destinationFacilityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', // Manchar CHC
    destinationFacilityName: 'Manchar CHC (Ghats Foothills)',
    distanceKm: 34.0,
    flightTimeMinutes: 19,
    maxAltitudeMeters: 140,
    status: 'active_corridor',
    terrainType: 'Western Ghats Ridge',
    batteryRequiredPct: 31,
  },
  {
    id: 'corridor-manchar-shirur-03',
    code: 'BVLoS-MH-PN03',
    originFacilityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    originFacilityName: 'Manchar CHC (Ghats Foothills)',
    destinationFacilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    destinationFacilityName: 'Shirur PHC (Sub-District Remote)',
    distanceKm: 28.2,
    flightTimeMinutes: 16,
    maxAltitudeMeters: 110,
    status: 'active_corridor',
    terrainType: 'River Basin',
    batteryRequiredPct: 24,
  },
];

let ACTIVE_FLIGHTS: DroneFlight[] = [
  {
    id: 'fl-drone-8821-active',
    flightCode: 'MED-AERO-8821',
    corridorId: 'corridor-pune-junnar-01',
    droneModel: 'SkyLark MedVulture V4 (Autonomous Cold-Box Quad)',
    originName: 'Talegaon CHC (CDW Node)',
    destinationName: 'Shirur PHC',
    skuCode: 'INS-001',
    skuName: 'Human Insulin NPH 100IU/ml',
    qty: 25,
    status: 'in_flight',
    altitudeMeters: 115,
    airspeedKmh: 74,
    batteryPct: 82,
    payloadTempC: 3.8, // strictly within 2-8°C
    windSpeedKmh: 14.2,
    progressPct: 62,
    currentLat: 18.7842,
    currentLng: 74.0215,
    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    dispatchedByEmail: 'officer@pune.health.gov.in',
  },
];

export async function getDroneCorridors(): Promise<DroneCorridor[]> {
  return CORRIDORS;
}

export async function getActiveDroneFlights(): Promise<DroneFlight[]> {
  return ACTIVE_FLIGHTS;
}

export async function dispatchDroneFlight(params: {
  corridorId: string;
  skuCode: string;
  skuName: string;
  qty: number;
  actorEmail: string;
  actorRole: string;
  requestId: string;
}): Promise<DroneFlight> {
  const corridor = CORRIDORS.find((c) => c.id === params.corridorId);
  if (!corridor) {
    throw new Error(`Invalid or unknown drone flight corridor: ${params.corridorId}`);
  }

  if (corridor.status === 'weather_hold') {
    throw new Error(`Corridor ${corridor.code} is currently on WEATHER_HOLD due to monsoon turbulence.`);
  }

  const flightId = `fl-drone-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const flightCode = `MED-AERO-${Math.floor(1000 + Math.random() * 9000)}`;

  const newFlight: DroneFlight = {
    id: flightId,
    flightCode,
    corridorId: corridor.id,
    droneModel: 'SkyLark MedVulture V4 (Autonomous Cold-Box Quad)',
    originName: corridor.originFacilityName,
    destinationName: corridor.destinationFacilityName,
    skuCode: params.skuCode,
    skuName: params.skuName,
    qty: params.qty,
    status: 'in_flight',
    altitudeMeters: corridor.maxAltitudeMeters - 10,
    airspeedKmh: 76,
    batteryPct: 98,
    payloadTempC: 4.1, // Active Peltier cooling
    windSpeedKmh: 12.0,
    progressPct: 5,
    currentLat: 18.7289,
    currentLng: 73.6845,
    startedAt: new Date().toISOString(),
    dispatchedByEmail: params.actorEmail,
  };

  ACTIVE_FLIGHTS.unshift(newFlight);

  // Log Zero-PHI Audit Event
  await logAuditEvent({
    actor: {
      userId: params.actorEmail,
      email: params.actorEmail,
      role: params.actorRole,
    },
    action: 'DRONE_EMERGENCY_FLIGHT_DISPATCHED',
    entityType: 'drone_flight',
    entityId: flightId,
    metadata: {
      flightCode,
      corridorCode: corridor.code,
      skuCode: params.skuCode,
      qty: params.qty,
      payloadTempC: 4.1,
      batteryPct: 98,
      requestId: params.requestId,
    },
  }).catch((err) => console.warn('[DroneAuditSync] Error logging flight:', err.message));

  return newFlight;
}

export async function completeDroneFlight(params: {
  flightId: string;
  actorEmail: string;
  actorRole: string;
  requestId: string;
}): Promise<DroneFlight> {
  const flight = ACTIVE_FLIGHTS.find((f) => f.id === params.flightId);
  if (!flight) {
    throw new Error(`Flight not found: ${params.flightId}`);
  }

  flight.status = 'landed';
  flight.progressPct = 100;
  flight.altitudeMeters = 0;
  flight.airspeedKmh = 0;
  flight.completedAt = new Date().toISOString();

  // Log Zero-PHI Audit Event
  await logAuditEvent({
    actor: {
      userId: params.actorEmail,
      email: params.actorEmail,
      role: params.actorRole,
    },
    action: 'DRONE_FLIGHT_DELIVERY_CONFIRMED',
    entityType: 'drone_flight',
    entityId: flight.id,
    metadata: {
      flightCode: flight.flightCode,
      destinationName: flight.destinationName,
      skuCode: flight.skuCode,
      qty: flight.qty,
      landingTempC: flight.payloadTempC,
      requestId: params.requestId,
    },
  }).catch((err) => console.warn('[DroneAuditSync] Error landing flight:', err.message));

  return flight;
}

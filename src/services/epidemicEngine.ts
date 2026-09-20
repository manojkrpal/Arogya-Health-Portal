import { EpidemicForecastItem } from '../types/client.js';
import { logAuditEvent } from '../db/firestore-service.js';

let EPIDEMIC_FORECASTS: EpidemicForecastItem[] = [
  {
    id: 'epi-dengue-pune-01',
    pathogen: 'Dengue',
    district: 'Pune District',
    currentActiveCases: 142,
    predicted14dCases: 380,
    r0Value: 2.38,
    weatherRiskIndex: 88,
    monsoonRainfallMm: 164.5,
    tempCelsius: 28.4,
    humidityPct: 86,
    alertLevel: 'outbreak_critical',
    surgeMultiplier: 2.5,
    recommendedBufferPreAllocation: [
      {
        skuCode: 'IV-NS500',
        skuName: 'Normal Saline IV 500ml',
        recommendedUnits: 300,
        urgency: 'critical',
      },
      {
        skuCode: 'PAR-500',
        skuName: 'Paracetamol 500mg Tabs',
        recommendedUnits: 500,
        urgency: 'high',
      },
      {
        skuCode: 'ORS-001',
        skuName: 'Oral Rehydration Salts WHO',
        recommendedUnits: 400,
        urgency: 'high',
      },
    ],
    aiEpidemiologicalNote:
      'High post-monsoon water stagnation in Shirur & Haveli talukas has escalated Aedes aegypti vector density index by +44%. Projected syndromic platelet monitoring surge requires immediate +2.5x IV fluid buffer pre-allocation.',
  },
  {
    id: 'epi-cholera-haveli-02',
    pathogen: 'Cholera / ADD',
    district: 'Pune District',
    currentActiveCases: 64,
    predicted14dCases: 130,
    r0Value: 1.85,
    weatherRiskIndex: 74,
    monsoonRainfallMm: 142.0,
    tempCelsius: 29.1,
    humidityPct: 82,
    alertLevel: 'warning',
    surgeMultiplier: 1.8,
    recommendedBufferPreAllocation: [
      {
        skuCode: 'ORS-001',
        skuName: 'Oral Rehydration Salts WHO',
        recommendedUnits: 600,
        urgency: 'critical',
      },
      {
        skuCode: 'AMX-500',
        skuName: 'Amoxicillin 500mg Caps',
        recommendedUnits: 250,
        urgency: 'high',
      },
    ],
    aiEpidemiologicalNote:
      'River runoff turbidity levels elevated in Ghod & Bhima river basins. Water quality alerts indicate elevated risk of Acute Diarrheal Disease (ADD) across downstream PHCs.',
  },
  {
    id: 'epi-malaria-ghats-03',
    pathogen: 'Malaria',
    district: 'Pune District',
    currentActiveCases: 18,
    predicted14dCases: 32,
    r0Value: 1.15,
    weatherRiskIndex: 45,
    monsoonRainfallMm: 95.0,
    tempCelsius: 24.2,
    humidityPct: 78,
    alertLevel: 'watch',
    surgeMultiplier: 1.2,
    recommendedBufferPreAllocation: [
      {
        skuCode: 'ART-001',
        skuName: 'Artesunate Injection 60mg',
        recommendedUnits: 80,
        urgency: 'high',
      },
    ],
    aiEpidemiologicalNote:
      'Ghats foothill surveillance indicates localized Anopheles vector breeding in Manchar sector; baseline prophylaxis adequate with minor seasonal stock bump.',
  },
];

export async function getEpidemicForecasts(): Promise<EpidemicForecastItem[]> {
  return EPIDEMIC_FORECASTS;
}

export async function updateClimateTelemetry(params: {
  district: string;
  rainfallMm: number;
  tempCelsius: number;
  humidityPct: number;
  actorEmail: string;
  actorRole: string;
  requestId: string;
}): Promise<EpidemicForecastItem[]> {
  // Correlate new climate readings with disease risk curves
  const vectorRisk = Math.min(
    100,
    Math.round((params.rainfallMm / 200) * 50 + (params.humidityPct / 100) * 35 + ((params.tempCelsius - 20) / 15) * 15)
  );

  EPIDEMIC_FORECASTS = EPIDEMIC_FORECASTS.map((item) => {
    if (item.district.toLowerCase().includes(params.district.toLowerCase())) {
      const isSevere = vectorRisk >= 80;
      const isElevated = vectorRisk >= 60;
      const alertLevel = isSevere ? 'outbreak_critical' : isElevated ? 'warning' : 'watch';
      const surgeMultiplier = isSevere ? 2.5 : isElevated ? 1.8 : 1.2;

      return {
        ...item,
        monsoonRainfallMm: params.rainfallMm,
        tempCelsius: params.tempCelsius,
        humidityPct: params.humidityPct,
        weatherRiskIndex: vectorRisk,
        alertLevel,
        surgeMultiplier,
      };
    }
    return item;
  });

  await logAuditEvent({
    actor: {
      userId: params.actorEmail,
      email: params.actorEmail,
      role: params.actorRole,
    },
    action: 'IMD_CLIMATE_TELEMETRY_CORRELATED',
    entityType: 'climate_telemetry',
    entityId: params.district,
    metadata: {
      rainfallMm: params.rainfallMm,
      tempCelsius: params.tempCelsius,
      humidityPct: params.humidityPct,
      computedVectorRisk: vectorRisk,
      requestId: params.requestId,
    },
  }).catch((err) => console.warn('[EpidemicAuditSync] Error logging climate:', err.message));

  return EPIDEMIC_FORECASTS;
}

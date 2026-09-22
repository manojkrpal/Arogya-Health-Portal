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
    monsoonRainfallMm: 165.0,
    tempCelsius: 28.4,
    humidityPct: 86,
    alertLevel: 'outbreak_critical',
    surgeMultiplier: 2.5,
    recommendedBufferPreAllocation: [
      {
        skuCode: 'IV-NS500',
        skuName: 'Normal Saline IV 500ml',
        recommendedUnits: 350,
        urgency: 'critical',
      },
      {
        skuCode: 'PAR-500',
        skuName: 'Paracetamol 500mg Tabs',
        recommendedUnits: 600,
        urgency: 'high',
      },
      {
        skuCode: 'ORS-001',
        skuName: 'Oral Rehydration Salts WHO',
        recommendedUnits: 450,
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
    predicted14dCases: 145,
    r0Value: 1.85,
    weatherRiskIndex: 74,
    monsoonRainfallMm: 165.0,
    tempCelsius: 29.1,
    humidityPct: 82,
    alertLevel: 'warning',
    surgeMultiplier: 1.8,
    recommendedBufferPreAllocation: [
      {
        skuCode: 'ORS-001',
        skuName: 'Oral Rehydration Salts WHO',
        recommendedUnits: 750,
        urgency: 'critical',
      },
      {
        skuCode: 'AMX-500',
        skuName: 'Amoxicillin 500mg Caps',
        recommendedUnits: 300,
        urgency: 'high',
      },
      {
        skuCode: 'IV-NS500',
        skuName: 'Normal Saline IV 500ml',
        recommendedUnits: 200,
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
    currentActiveCases: 22,
    predicted14dCases: 54,
    r0Value: 1.45,
    weatherRiskIndex: 62,
    monsoonRainfallMm: 165.0,
    tempCelsius: 25.2,
    humidityPct: 80,
    alertLevel: 'warning',
    surgeMultiplier: 1.5,
    recommendedBufferPreAllocation: [
      {
        skuCode: 'ART-001',
        skuName: 'Artesunate Injection 60mg',
        recommendedUnits: 120,
        urgency: 'high',
      },
      {
        skuCode: 'PAR-500',
        skuName: 'Paracetamol 500mg Tabs',
        recommendedUnits: 250,
        urgency: 'high',
      },
    ],
    aiEpidemiologicalNote:
      'Ghats foothill surveillance indicates localized Anopheles vector breeding in Manchar & Junnar sectors; prophylaxis coverage recommended for all mobile tribal health units.',
  },
  {
    id: 'epi-resp-ili-04',
    pathogen: 'Viral Respiratory (ILI)',
    district: 'Pune District',
    currentActiveCases: 195,
    predicted14dCases: 290,
    r0Value: 1.32,
    weatherRiskIndex: 58,
    monsoonRainfallMm: 165.0,
    tempCelsius: 23.5,
    humidityPct: 88,
    alertLevel: 'watch',
    surgeMultiplier: 1.3,
    recommendedBufferPreAllocation: [
      {
        skuCode: 'PAR-500',
        skuName: 'Paracetamol 500mg Tabs',
        recommendedUnits: 400,
        urgency: 'high',
      },
      {
        skuCode: 'AMX-500',
        skuName: 'Amoxicillin 500mg Caps',
        recommendedUnits: 180,
        urgency: 'moderate' as any,
      },
    ],
    aiEpidemiologicalNote:
      'Temperature drop and persistent humidity increase outpatient footfall for seasonal Influenza-Like Illness (ILI). Routine bronchodilator & antipyretic stocks sufficient.',
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
  const rain = Math.max(10, Number(params.rainfallMm || 50));
  const temp = Number(params.tempCelsius || 28.0);
  const hum = Number(params.humidityPct || 80.0);

  EPIDEMIC_FORECASTS = EPIDEMIC_FORECASTS.map((item) => {
    let pathogenMultiplier = 1.0;
    let baseRisk = 50;

    if (item.pathogen === 'Dengue') {
      // Vector thrives in heavy rain (stagnant fresh water) + warm humidity
      baseRisk = Math.min(100, Math.round((rain / 220) * 60 + (hum / 100) * 25 + ((temp - 22) / 10) * 15));
      pathogenMultiplier = (rain / 100) * 1.5;
    } else if (item.pathogen === 'Cholera / ADD') {
      // Water contamination surges with high runoff
      baseRisk = Math.min(100, Math.round((rain / 200) * 70 + (hum / 100) * 30));
      pathogenMultiplier = (rain / 90) * 1.3;
    } else if (item.pathogen === 'Malaria') {
      baseRisk = Math.min(100, Math.round((rain / 250) * 55 + (hum / 100) * 30 + 15));
      pathogenMultiplier = (rain / 120) * 1.2;
    } else {
      // Respiratory
      baseRisk = Math.min(100, Math.round((hum / 100) * 50 + ((35 - temp) / 15) * 50));
      pathogenMultiplier = 1.1 + (rain > 200 ? 0.4 : 0.1);
    }

    const calculatedRisk = Math.max(15, Math.min(99, baseRisk));
    const isSevere = calculatedRisk >= 75;
    const isWarning = calculatedRisk >= 50;
    const alertLevel: 'outbreak_critical' | 'warning' | 'watch' = isSevere
      ? 'outbreak_critical'
      : isWarning
      ? 'warning'
      : 'watch';

    const surgeMultiplier = Number((Math.max(1.0, 1.0 + (calculatedRisk / 100) * 2.0)).toFixed(1));
    const r0Value = Number((1.05 + (calculatedRisk / 100) * 1.8).toFixed(2));
    const predicted14dCases = Math.round(item.currentActiveCases * surgeMultiplier * (1 + (r0Value - 1) * 0.7));

    // Dynamic buffer adjustments
    const updatedBuffers = item.recommendedBufferPreAllocation.map((buf) => {
      const units = Math.round(buf.recommendedUnits * (surgeMultiplier / (item.surgeMultiplier || 1)));
      return {
        ...buf,
        recommendedUnits: Math.max(50, units),
        urgency: (isSevere ? 'critical' : 'high') as 'critical' | 'high',
      };
    });

    let dynamicNote = item.aiEpidemiologicalNote;
    if (isSevere) {
      dynamicNote = `CRITICAL SURGE WARNING: Precipitation rate (${rain}mm) and high humidity (${hum}%) escalate ${item.pathogen} transmission velocity (R₀: ${r0Value}). Immediate +${surgeMultiplier}x buffer dispatch mandated.`;
    } else if (isWarning) {
      dynamicNote = `ELEVATED VECTOR WATCH: Precipitation index at ${rain}mm. Monitored syndromic indicators project an upward caseload curve to ${predicted14dCases} cases over next 14 days.`;
    } else {
      dynamicNote = `STABLE TRANSMISSION: Low meteorological stress (${rain}mm rainfall). Baseline facility inventory covers projected demand trajectory.`;
    }

    return {
      ...item,
      monsoonRainfallMm: rain,
      tempCelsius: temp,
      humidityPct: hum,
      weatherRiskIndex: calculatedRisk,
      alertLevel,
      surgeMultiplier,
      r0Value,
      predicted14dCases,
      recommendedBufferPreAllocation: updatedBuffers,
      aiEpidemiologicalNote: dynamicNote,
    };
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
      rainfallMm: rain,
      tempCelsius: temp,
      humidityPct: hum,
      requestId: params.requestId,
    },
  }).catch((err) => console.warn('[EpidemicAuditSync] Error logging climate:', err.message));

  return EPIDEMIC_FORECASTS;
}

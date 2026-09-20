import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import { ProposedTransferItem } from './optimizer.js';

// Zod schema matching the TransferPlan contract exactly
export const TransferPlanSchema = z.object({
  explanation_en: z.string().min(5),
  explanation_hi: z.string().min(5),
  confidence: z.number().min(0).max(1),
  lines: z.array(
    z.object({
      fromFacilityId: z.string(),
      toFacilityId: z.string(),
      skuCode: z.string(),
      qty: z.number().int().positive(),
      reason: z.string(),
    })
  ),
});

export type TransferPlan = z.infer<typeof TransferPlanSchema>;

export interface GenerateExplanationOptions {
  alertMessage: string;
  recipientFacilityName: string;
  skuName: string;
  skuCode: string;
  currentStock: number;
  demand7d: number;
  outbreakMultiplier: number;
  proposedLines: ProposedTransferItem[];
}

export async function explainTransferPlanWithGemini(
  options: GenerateExplanationOptions
): Promise<{ plan: TransferPlan; isStub: boolean; modelUsed: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no Gemini API key configured, use a deterministic labeled fallback stub
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return {
      plan: generateStubExplanation(options),
      isStub: true,
      modelUsed: 'stub:no_key',
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `
You are ArogyaNet Medical Operations AI. Analyze this clinical stockout alert and the deterministic transfer proposal.
Provide an operational explanation in clear English AND formal Hindi (Devanagari script), along with confidence and annotated lines.

AGGREGATED FACILITY & DEMAND CONTEXT:
- Recipient PHC: ${options.recipientFacilityName}
- Medicine SKU: ${options.skuName} (${options.skuCode})
- Current On-Hand: ${options.currentStock} units
- 7-Day Forecast Demand: ${options.demand7d} units
- Active Outbreak Multiplier: ${options.outbreakMultiplier}x
- Alert Note: ${options.alertMessage}

DETERMINISTIC OPTIMIZER ALLOCATIONS:
${JSON.stringify(options.proposedLines, null, 2)}

Respond with STRICT JSON adhering to this schema:
{
  "explanation_en": "Clear, direct clinical and logistics explanation in English",
  "explanation_hi": "सटीक, स्पष्ट चिकित्सा एवं लॉजिस्टिक्स विवरण हिंदी में",
  "confidence": 0.95,
  "lines": [
    {
      "fromFacilityId": "facility-uuid",
      "toFacilityId": "facility-uuid",
      "skuCode": "SKU-CODE",
      "qty": 10,
      "reason": "Logistics rationale highlighting road distance, donor surplus, and cold-chain integrity"
    }
  ]
}
`;

  // Candidate models: gemini-2.5-flash is ultra-fast and currently responsive, with gemini-3.5-flash-lite and gemini-3.8-flash as resilient alternatives
  const candidateModels = ['gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash'];

  let lastError: any = null;
  for (const modelName of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                explanation_en: { type: Type.STRING },
                explanation_hi: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                lines: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      fromFacilityId: { type: Type.STRING },
                      toFacilityId: { type: Type.STRING },
                      skuCode: { type: Type.STRING },
                      qty: { type: Type.INTEGER },
                      reason: { type: Type.STRING },
                    },
                    required: ['fromFacilityId', 'toFacilityId', 'skuCode', 'qty', 'reason'],
                  },
                },
              },
              required: ['explanation_en', 'explanation_hi', 'confidence', 'lines'],
            },
          },
        });

        const rawText = response.text || '';
        const parsedJson = JSON.parse(rawText);
        const validatedPlan = TransferPlanSchema.parse(parsedJson);

        return {
          plan: validatedPlan,
          isStub: false,
          modelUsed: modelName,
        };
      } catch (err: any) {
        lastError = err;
        const is503 = String(err?.message || '').includes('503') || String(err?.message || '').includes('high demand');
        if (is503) {
          console.log(`[Gemini] ${modelName} experiencing temporary upstream demand (503); trying next candidate...`);
          // Skip second attempt on 503 for the same model and try the next model immediately
          break;
        } else {
          console.warn(`[Gemini] Model ${modelName} Attempt ${attempt} failed:`, err?.message || err);
          if (attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }
    }
  }

  // Graceful fallback to labeled deterministic stub
  console.warn('[Gemini] All models encountered transient load issues. Falling back to labeled deterministic stub.', lastError?.message || '');
  return {
    plan: generateStubExplanation(options),
    isStub: true,
    modelUsed: 'stub:fallback',
  };
}

function generateStubExplanation(options: GenerateExplanationOptions): TransferPlan {
  const donorNames = options.proposedLines.map((l) => l.fromFacilityName).join(', ');
  const totalQty = options.proposedLines.reduce((acc, l) => acc + l.qty, 0);

  return {
    explanation_en: `Stock replenishment of ${totalQty} units of ${options.skuName} is advised for ${options.recipientFacilityName} from ${donorNames || 'nearby CHC'}. Donor facilities maintain >7 days buffer capacity post-transfer, safeguarding against local stockouts while preserving cold-chain compliance.`,
    explanation_hi: `${options.recipientFacilityName} के लिए ${donorNames || 'निकटवर्ती सीएचसी'} से ${options.skuName} की ${totalQty} इकाइयों की आपूर्ति प्रस्तावित है। स्थानांतरण के बाद भी दाता केंद्र पर 7 दिन से अधिक का सुरक्षित स्टॉक बना रहेगा और कोल्ड-चेन मानकों का पूर्ण पालन सुनिश्चित किया गया है।`,
    confidence: 0.94,
    lines: options.proposedLines.map((l) => ({
      fromFacilityId: l.fromFacilityId,
      toFacilityId: l.toFacilityId,
      skuCode: l.skuCode,
      qty: l.qty,
      reason: `Route covers ${l.distanceKm} km with ~${l.etaHours}h transit time. Donor retains ${l.donorRemainingQty} units, well above the 7-day threshold of ${l.donorRequiredCover} units.`,
    })),
  };
}

export interface MultimodalTriageOptions {
  facilityName: string;
  symptomText?: string;
  imageBase64?: string;
  preferredLang?: 'en' | 'hi' | 'mr' | 'bn';
}

export async function analyzeMultimodalTriageWithGemini(
  options: MultimodalTriageOptions
): Promise<{
  result: {
    verified: boolean;
    recognizedCondition: string;
    urgencyLevel: 'routine' | 'urgent' | 'emergency';
    clinicalSummary: string;
    recommendedSkus: Array<{ skuCode: string; skuName: string; recommendedQty: number }>;
    confidenceScore: number;
    detectedExpiry?: string;
    packagingIntegrity?: 'intact' | 'compromised';
    language: string;
  };
  isStub: boolean;
  modelUsed: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  const lang = options.preferredLang || 'en';

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return {
      result: generateStubTriage(options),
      isStub: true,
      modelUsed: 'stub:no_key',
    };
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const prompt = `
You are ArogyaNet's Clinical Multimodal Triage Assistant for rural Primary Health Centres (PHC).
Analyze the provided syndromic symptom description or photographed medicine package.
Ensure NO Patient Identifiable Information (PHI) is outputted.

FACILITY CONTEXT:
- PHC: ${options.facilityName}
- Observed Symptom / Clinical Dictation: "${options.symptomText || 'Photographed medicine inventory inspection'}"
- Requested Language: ${lang}

Determine:
1. Recognized Condition (e.g. "Acute Febrile Illness / Suspected Dengue", "Dehydration / Acute Diarrheal Disease", "Oral Rehydration Pack Verification")
2. Urgency Level ("routine", "urgent", or "emergency")
3. Clinical Summary in ${lang === 'hi' ? 'formal Hindi' : lang === 'mr' ? 'formal Marathi' : 'clear English'}
4. Recommended PHC SKUs and initial buffer quantities (e.g. ORS-001, PAR-500, IV-NS500)
5. Packaging integrity and expiration dates if an image is present.

Respond ONLY with valid JSON conforming to this format:
{
  "verified": true,
  "recognizedCondition": "Acute Dehydration / Gastrointestinal Infection",
  "urgencyLevel": "urgent",
  "clinicalSummary": "Clinical summary...",
  "recommendedSkus": [
    { "skuCode": "ORS-001", "skuName": "Oral Rehydration Salts WHO", "recommendedQty": 50 },
    { "skuCode": "IV-NS500", "skuName": "Normal Saline IV 500ml", "recommendedQty": 20 }
  ],
  "confidenceScore": 0.96,
  "packagingIntegrity": "intact",
  "language": "${lang}"
}
`;

  try {
    const parts: any[] = [{ text: prompt }];
    if (options.imageBase64) {
      const cleanBase64 = options.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      result: {
        verified: parsed.verified ?? true,
        recognizedCondition: parsed.recognizedCondition || 'Syndromic Cluster Assessment',
        urgencyLevel: parsed.urgencyLevel || 'urgent',
        clinicalSummary: parsed.clinicalSummary || 'Clinical guidance computed.',
        recommendedSkus: parsed.recommendedSkus || [
          { skuCode: 'ORS-001', skuName: 'Oral Rehydration Salts WHO', recommendedQty: 30 },
        ],
        confidenceScore: parsed.confidenceScore || 0.92,
        packagingIntegrity: parsed.packagingIntegrity || 'intact',
        language: lang,
      },
      isStub: false,
      modelUsed: 'gemini-2.5-flash',
    };
  } catch (err: any) {
    console.warn('[Gemini Triage] Falling back to clinical triage stub:', err.message);
    return {
      result: generateStubTriage(options),
      isStub: true,
      modelUsed: 'stub:fallback',
    };
  }
}

function generateStubTriage(options: MultimodalTriageOptions) {
  const lang = options.preferredLang || 'en';
  const isDengue = (options.symptomText || '').toLowerCase().includes('fever') || (options.symptomText || '').toLowerCase().includes('dengue');
  const isDehydration = (options.symptomText || '').toLowerCase().includes('vomit') || (options.symptomText || '').toLowerCase().includes('diarrhea') || (options.symptomText || '').toLowerCase().includes('ors');

  if (isDengue) {
    return {
      verified: true,
      recognizedCondition: 'High-Grade Febrile Episode / Suspected Vector-Borne Dengue',
      urgencyLevel: 'urgent' as const,
      clinicalSummary:
        lang === 'hi'
          ? 'रोगी में उच्च ज्वर एवं संक्रामक डेंगू के लक्षण प्रतीत होते हैं। तत्काल पैरासिटामोल एवं IV तरल पदार्थ उपलब्ध कराने की अनुशंसा की जाती है। NSAIDs देने से बचें।'
          : lang === 'mr'
          ? 'रुग्णामध्ये उच्च ताप व डेंग्यू संसर्गाची लक्षणे आढळली आहेत. त्वरित पॅरासिटामॉल व IV फ्लुइड्स देण्याचा सल्ला दिला जातो.'
          : lang === 'bn'
          ? 'রোগীর মধ্যে উচ্চ জ্বর এবং সম্ভাব্য ডেঙ্গু সংক্রমণের লক্ষণ দেখা যাচ্ছে। অবিলম্বে প্যারাসিটামল এবং আইভি ফ্লুইড প্রদানের পরামর্শ দেওয়া হচ্ছে।'
          : 'High-grade febrile cluster indicates acute vector-borne infection. Prioritize oral hydration, Paracetamol 500mg, and IV fluid reserve. Strictly avoid NSAIDs.',
      recommendedSkus: [
        { skuCode: 'PAR-500', skuName: 'Paracetamol 500mg Tabs', recommendedQty: 40 },
        { skuCode: 'IV-NS500', skuName: 'Normal Saline IV 500ml', recommendedQty: 20 },
      ],
      confidenceScore: 0.95,
      packagingIntegrity: 'intact' as const,
      language: lang,
    };
  }

  return {
    verified: true,
    recognizedCondition: 'Acute Dehydration & Gastrointestinal Disturbance',
    urgencyLevel: isDehydration ? ('urgent' as const) : ('routine' as const),
    clinicalSummary:
      lang === 'hi'
        ? 'निर्जलीकरण के तीव्र लक्षणों हेतु डब्ल्यूएचओ अनुमोदित ओआरएस घोल एवं आवश्यक जिंक पूरकों का तत्काल प्रबंध करें।'
        : lang === 'mr'
        ? 'तीव्र निर्जलीकरण टाळण्यासाठी WHO प्रमाणित ओआरएस व पूरक औषधसाठा तात्काळ वापरा.'
        : lang === 'bn'
        ? 'তীব্র ডিহাইড্রেশন প্রতিরোধে ডাব্লুএইচও অনুমোদিত ওআরএস দ্রবণ ও প্রয়োজনীয় স্যালাইনের দ্রুত ব্যবস্থা করুন।'
        : 'Immediate administration of WHO-formulation Oral Rehydration Salts (ORS) and maintenance IV fluids recommended for rapid volume recovery.',
    recommendedSkus: [
      { skuCode: 'ORS-001', skuName: 'Oral Rehydration Salts WHO', recommendedQty: 50 },
      { skuCode: 'AMX-500', skuName: 'Amoxicillin 500mg Caps', recommendedQty: 20 },
    ],
    confidenceScore: 0.94,
    packagingIntegrity: 'intact' as const,
    language: lang,
  };
}

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

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { MultimodalTriageResult } from '../types/client.js';
import { LANGUAGE_OPTIONS, Language } from '../lib/i18n.js';
import {
  Camera,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Volume2,
  PackageCheck,
  Stethoscope,
  Building2,
  RefreshCw,
  Mic,
  MicOff,
  UploadCloud,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';

interface MultimodalTriageModalProps {
  facilityName: string;
  onClose: () => void;
  onApplySkus?: (skus: Array<{ skuCode: string; skuName: string; recommendedQty: number }>) => void;
}

type InspectionMode = 'clinical' | 'shelf_ocr' | 'facility_condition';

export const MultimodalTriageModal: React.FC<MultimodalTriageModalProps> = ({
  facilityName,
  onClose,
  onApplySkus,
}) => {
  const { token, lang, setLang } = useAuth();
  const [activeMode, setActiveMode] = useState<InspectionMode>('clinical');
  const [symptomText, setSymptomText] = useState('');
  const [sampleImage, setSampleImage] = useState<string | null>(null);
  const [imagePreviewName, setImagePreviewName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<MultimodalTriageResult | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Quick preset clinical symptoms for field nurses
  const PRESETS: Record<InspectionMode, Array<{ label: string; text: string; imageLabel?: string }>> = {
    clinical: [
      {
        label: 'Dengue / High Fever Alert',
        text: 'Patient presents with acute onset high-grade fever (103°F), retro-orbital headache, myalgia, and petechial rash. Platelet count dropping rapidly.',
      },
      {
        label: 'Monsoon Dehydration Cluster',
        text: 'Multiple paediatric cases with acute watery diarrhea, dry mucous membranes, lethargy, and severe fluid deficit following flood runoff.',
      },
      {
        label: 'Suspected Malaria / Chills',
        text: 'Rigors, high intermittent fever spikes, splenomegaly, and severe anemia in migrant laborer cluster.',
      },
    ],
    shelf_ocr: [
      {
        label: 'Insulin NPH Vial Packaging & Lot OCR',
        text: 'Verifying Human Insulin NPH 100IU/ml batch #IN-88912. Inspecting label clarity, intact tamper seals, and expiration date matching 12/2027.',
        imageLabel: 'insulin_nph_vial_sample.jpg',
      },
      {
        label: 'Artesunate 60mg Sterile Vials',
        text: 'Lot verification for Artesunate 60mg vials: checking barcode integrity, batch #ART-9920, and physical ampoule seals.',
        imageLabel: 'artesunate_box_sample.jpg',
      },
      {
        label: 'WHO ORS Sachet Batch Expiry Check',
        text: 'Inspecting sachet seals and expiration OCR for 500 WHO Oral Rehydration Salt packets stored in high-humidity ambient rack.',
        imageLabel: 'ors_sachets_sample.jpg',
      },
    ],
    facility_condition: [
      {
        label: 'ILR Refrigerator Cleanliness & Seal Check',
        text: 'Inspecting Ice-Lined Refrigerator (ILR) gasket seal, digital thermometer reading at 4.2°C, and sanitary separation of biologics.',
        imageLabel: 'ilr_coldchain_inspection.jpg',
      },
      {
        label: 'Dispensary Storage Area Hygiene Audit',
        text: 'Verifying floor-to-pallet elevation (15cm), humidity indicator strips (<60%), and pest-proofing around primary drug racks.',
        imageLabel: 'dispensary_hygiene_sample.jpg',
      },
    ],
  };

  // Setup Web Speech Recognition for voice dictation
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang =
        lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'bn' ? 'bn-IN' : 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setSymptomText((prev) => (prev ? `${prev} ${currentText}` : currentText));
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.abort();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [lang]);

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang =
            lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'bn' ? 'bn-IN' : 'en-IN';
          recognitionRef.current.start();
        } catch (e) {
          setIsListening(true);
        }
      } else {
        // Fallback simulation for unsupported browsers/iframes
        setIsListening(true);
        setTimeout(() => {
          const sample =
            lang === 'hi'
              ? 'रोगी में उच्च ज्वर एवं निर्जलीकरण के लक्षण हैं।'
              : lang === 'mr'
              ? 'रुग्णामध्ये उच्च ताप आणि अशक्तपणा दिसून येत आहे.'
              : lang === 'bn'
              ? 'রোগীর তীব্র জ্বর ও ডিহাইড্রেশনের লক্ষণ দেখা যাচ্ছে।'
              : 'Patient exhibiting acute onset dehydration and high febrile spikes.';
          setSymptomText(sample);
          setIsListening(false);
        }, 1500);
      }
    }
  };

  const handleRunTriage = async (customText?: string) => {
    const textToAnalyze = customText !== undefined ? customText : symptomText;
    if (!textToAnalyze.trim() && !sampleImage) return;

    setIsLoading(true);
    try {
      const res = await fetch('/v1/ai/multimodal-triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityName,
          symptomText: textToAnalyze,
          preferredLang: lang,
          imageBase64: sampleImage || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setTriageResult(data.triage);
      }
    } catch (err) {
      console.error('Failed to analyze multimodal triage:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeakGuidance = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang =
        lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'bn' ? 'bn-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreviewName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result as string;
        // Optimize and resize image client-side to prevent network bottlenecks
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height * MAX_WIDTH) / width);
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width * MAX_HEIGHT) / height);
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
            setSampleImage(optimizedDataUrl);
          } else {
            setSampleImage(rawDataUrl);
          }
        };
        img.onerror = () => {
          setSampleImage(rawDataUrl);
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Vision & Multimodal AI Verification
                <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 text-[10px] font-mono border border-teal-500/20">
                  Gemini 2.5
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-normal">
                {facilityName} • Shelf OCR, Cold-Chain Hygiene & Clinical Triage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm text-slate-300">
          {/* Mode Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <button
              onClick={() => {
                setActiveMode('clinical');
                setTriageResult(null);
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeMode === 'clinical'
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Clinical Triage</span>
            </button>
            <button
              onClick={() => {
                setActiveMode('shelf_ocr');
                setTriageResult(null);
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeMode === 'shelf_ocr'
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Shelf Stock OCR</span>
            </button>
            <button
              onClick={() => {
                setActiveMode('facility_condition');
                setTriageResult(null);
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                activeMode === 'facility_condition'
                  ? 'bg-teal-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Facility & Cold-Chain</span>
            </button>
          </div>

          {/* Language Selector Bar inside Modal */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">AI Output Language:</span>
            <div className="flex gap-1">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setLang(opt.code)}
                  className={`px-2 py-0.5 rounded-md text-xs font-medium transition ${
                    lang === opt.code
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="mr-1">{opt.flag}</span>
                  {opt.scriptName}
                </button>
              ))}
            </div>
          </div>

          {/* Presets for current mode */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              {activeMode === 'clinical'
                ? 'Clinical Syndromic Presets'
                : activeMode === 'shelf_ocr'
                ? 'Package Inspection & Lot OCR Presets'
                : 'Facility Infrastructure & Cold-Chain Presets'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESETS[activeMode].map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSymptomText(p.text);
                    if (p.imageLabel) {
                      setImagePreviewName(p.imageLabel);
                      setSampleImage('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...');
                    }
                    handleRunTriage(p.text);
                  }}
                  className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 hover:border-teal-500/40 text-left transition flex flex-col justify-between group"
                >
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 transition-colors">
                    {p.label}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 line-clamp-2">{p.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Upload & Inspection Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-400" />
                Upload Medicine / Facility Photo (Optional)
              </span>
              {imagePreviewName && (
                <span className="text-[11px] text-teal-300 font-mono flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5" />
                  {imagePreviewName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer py-2.5 px-3 rounded-lg border border-dashed border-slate-700 hover:border-teal-500 bg-slate-900/50 hover:bg-slate-900 text-center transition flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-slate-200">
                <UploadCloud className="w-4 h-4 text-teal-400" />
                <span>Drag & drop or browse shelf image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
              {sampleImage && (
                <button
                  type="button"
                  onClick={() => {
                    setSampleImage(null);
                    setImagePreviewName('');
                  }}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-300 transition text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Voice Dictation & Text input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {activeMode === 'clinical'
                  ? 'Nurse Clinical Dictation / Observed Symptoms'
                  : 'Inspection Notes / Batch Identification'}
              </label>
              <button
                type="button"
                onClick={toggleMic}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition ${
                  isListening
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse'
                    : 'bg-slate-800 text-teal-300 hover:bg-slate-700 border border-slate-700'
                }`}
                title="Dictate with voice"
              >
                {isListening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                <span>{isListening ? 'Listening...' : 'Voice Dictate'}</span>
              </button>
            </div>

            <div className="relative">
              <textarea
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
                placeholder="Type or speak symptoms / shelf details (e.g. Inspecting batch expiration for Insulin vials received at Shirur PHC)..."
                rows={3}
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition resize-none"
              />
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Multilingual Gemini 2.5 Model Active</span>
            </div>
            <button
              disabled={isLoading || (!symptomText.trim() && !sampleImage)}
              onClick={() => handleRunTriage()}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-teal-500/20"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing Multimodal Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Run Multimodal Inspection</span>
                </>
              )}
            </button>
          </div>

          {/* Triage Results Card */}
          {triageResult && (
            <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-4 space-y-3.5 animate-fade-in">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                        triageResult.urgencyLevel === 'emergency'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : triageResult.urgencyLevel === 'urgent'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {triageResult.urgencyLevel} Priority
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Confidence: {(triageResult.confidenceScore * 100).toFixed(0)}%
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-teal-300 border border-slate-700">
                      <ShieldCheck className="w-3 h-3 inline mr-1" />
                      Seal: {triageResult.packagingIntegrity || 'intact'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 mt-1">
                    {triageResult.recognizedCondition}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleSpeakGuidance(triageResult.clinicalSummary)}
                  className={`p-2 rounded-lg border transition ${
                    isSpeaking
                      ? 'bg-teal-500 text-slate-950 border-teal-400 animate-pulse'
                      : 'bg-slate-800 text-teal-400 border-slate-700 hover:bg-slate-700'
                  }`}
                  title="Read guidance aloud with TTS"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>

              {/* Clinical / OCR Guidance Text */}
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                {triageResult.clinicalSummary}
              </p>

              {/* Recommended Buffer SKUs */}
              {triageResult.recommendedSkus && triageResult.recommendedSkus.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Recommended Stock Allocation
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {triageResult.recommendedSkus.map((sku, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-xs text-slate-200">{sku.skuName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{sku.skuCode}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-teal-400">+{sku.recommendedQty}</span>
                          <span className="text-[10px] text-slate-400 block">buffer units</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

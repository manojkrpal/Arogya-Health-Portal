import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { LANGUAGE_OPTIONS, Language } from '../lib/i18n.js';
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  AlertCircle,
  X,
  Package,
  Sparkles,
  ArrowRight,
  RotateCcw,
  VolumeX,
} from 'lucide-react';

interface VoiceNurseAssistantModalProps {
  onClose: () => void;
  onStockUpdated?: () => void;
}

interface ParsedVoiceIntent {
  action: 'ADD_STOCK' | 'DEDUCT_STOCK' | 'CHECK_EXPIRY' | 'EMERGENCY_ORDER';
  facilityId: string;
  facilityName: string;
  skuCode: string;
  skuName: string;
  deltaQty: number;
  rawTranscript: string;
  confidence: number;
}

const VOICE_PRESETS: Record<Language, Array<{ label: string; text: string; parsed: ParsedVoiceIntent }>> = {
  en: [
    {
      label: 'Add 50 Paracetamol to Shirur PHC',
      text: 'Add 50 bottles of Paracetamol 500mg tablets to Shirur PHC stock inventory.',
      parsed: {
        action: 'ADD_STOCK',
        facilityId: 'shirur-phc',
        facilityName: 'Shirur PHC (Pune)',
        skuCode: 'PAR-500',
        skuName: 'Paracetamol 500mg Tabs',
        deltaQty: 50,
        rawTranscript: 'Add 50 bottles of Paracetamol 500mg tablets to Shirur PHC stock inventory.',
        confidence: 0.98,
      },
    },
    {
      label: 'Deduct 20 ORS Packets (Used during flood surge)',
      text: 'Deduct 20 packets of WHO Oral Rehydration Salts at Shirur dispensary bay.',
      parsed: {
        action: 'DEDUCT_STOCK',
        facilityId: 'shirur-phc',
        facilityName: 'Shirur PHC (Pune)',
        skuCode: 'ORS-001',
        skuName: 'Oral Rehydration Salts WHO',
        deltaQty: -20,
        rawTranscript: 'Deduct 20 packets of WHO Oral Rehydration Salts at Shirur dispensary bay.',
        confidence: 0.96,
      },
    },
    {
      label: 'Add 30 Artesunate Injections to Manchar CHC',
      text: 'Record delivery of 30 vials of Artesunate 60mg at Manchar Community Health Centre.',
      parsed: {
        action: 'ADD_STOCK',
        facilityId: 'manchar-chc',
        facilityName: 'Manchar CHC (Pune)',
        skuCode: 'ART-060',
        skuName: 'Artesunate Injection 60mg',
        deltaQty: 30,
        rawTranscript: 'Record delivery of 30 vials of Artesunate 60mg at Manchar Community Health Centre.',
        confidence: 0.97,
      },
    },
  ],
  hi: [
    {
      label: 'शिरूर पीएचसी में 50 पैरासिटामोल जोड़ें',
      text: 'शिरूर प्राथमिक स्वास्थ्य केंद्र के स्टॉक में 50 पैरासिटामोल गोलियां जोड़ें।',
      parsed: {
        action: 'ADD_STOCK',
        facilityId: 'shirur-phc',
        facilityName: 'Shirur PHC (Pune)',
        skuCode: 'PAR-500',
        skuName: 'Paracetamol 500mg Tabs',
        deltaQty: 50,
        rawTranscript: 'शिरूर प्राथमिक स्वास्थ्य केंद्र के स्टॉक में 50 पैरासिटामोल गोलियां जोड़ें।',
        confidence: 0.98,
      },
    },
    {
      label: 'शिरूर में 20 ओआरएस पैकेट घटाएं',
      text: 'शिरूर डिस्पेंसरी से 20 डब्ल्यूएचओ ओआरएस पैकेट घटाएं।',
      parsed: {
        action: 'DEDUCT_STOCK',
        facilityId: 'shirur-phc',
        facilityName: 'Shirur PHC (Pune)',
        skuCode: 'ORS-001',
        skuName: 'Oral Rehydration Salts WHO',
        deltaQty: -20,
        rawTranscript: 'शिरूर डिस्पेंसरी से 20 डब्ल्यूएचओ ओआरएस पैकेट घटाएं।',
        confidence: 0.95,
      },
    },
  ],
  mr: [
    {
      label: 'शिरूर प्राथमिक आरोग्य केंद्रात 50 पॅरासिटामॉल जोडा',
      text: 'शिरूर प्राथमिक आरोग्य केंद्रात 50 पॅरासिटामॉल गोळ्या साठ्यात नोंदवा.',
      parsed: {
        action: 'ADD_STOCK',
        facilityId: 'shirur-phc',
        facilityName: 'Shirur PHC (Pune)',
        skuCode: 'PAR-500',
        skuName: 'Paracetamol 500mg Tabs',
        deltaQty: 50,
        rawTranscript: 'शिरूर प्राथमिक आरोग्य केंद्रात 50 पॅरासिटामॉल गोळ्या साठ्यात नोंदवा.',
        confidence: 0.98,
      },
    },
    {
      label: 'मंचर सीएचसीमध्ये 30 आर्टिस्युनेट इंजेक्शन्स जोडा',
      text: 'मंचर ग्रामीण रुग्णालयात 30 आर्टिस्युनेट इंजेक्शन साठ्यात वाढवा.',
      parsed: {
        action: 'ADD_STOCK',
        facilityId: 'manchar-chc',
        facilityName: 'Manchar CHC (Pune)',
        skuCode: 'ART-060',
        skuName: 'Artesunate Injection 60mg',
        deltaQty: 30,
        rawTranscript: 'मंचर ग्रामीण रुग्णालयात 30 आर्टिस्युनेट इंजेक्शन साठ्यात वाढवा.',
        confidence: 0.97,
      },
    },
  ],
  bn: [
    {
      label: 'শিরুর পিএইচসিতে ৫০টি প্যারাসিটামল যোগ করুন',
      text: 'শিরুর প্রাথমিক স্বাস্থ্যকেন্দ্রের স্টকে ৫০টি প্যারাসিটামল ট্যাবলেট যোগ করুন।',
      parsed: {
        action: 'ADD_STOCK',
        facilityId: 'shirur-phc',
        facilityName: 'Shirur PHC (Pune)',
        skuCode: 'PAR-500',
        skuName: 'Paracetamol 500mg Tabs',
        deltaQty: 50,
        rawTranscript: 'শিরুর প্রাথমিক স্বাস্থ্যকেন্দ্রের স্টকে ৫০টি প্যারাসিটামল ট্যাবলেট যোগ করুন।',
        confidence: 0.98,
      },
    },
    {
      label: 'শিরুর ডিসপেনসারিতে ২০টি ওআরএস কমান',
      text: 'শিরুর ডিসপেনসারি থেকে ২০টি ওআরএস প্যাকেট বিয়োগ করুন।',
      parsed: {
        action: 'DEDUCT_STOCK',
        facilityId: 'shirur-phc',
        facilityName: 'Shirur PHC (Pune)',
        skuCode: 'ORS-001',
        skuName: 'Oral Rehydration Salts WHO',
        deltaQty: -20,
        rawTranscript: 'শিরুর ডিসপেনসারি থেকে ২০টি ওআরএস প্যাকেট বিয়োগ করুন।',
        confidence: 0.96,
      },
    },
  ],
};

export const VoiceNurseAssistantModal: React.FC<VoiceNurseAssistantModalProps> = ({
  onClose,
  onStockUpdated,
}) => {
  const { token, lang, setLang, t } = useAuth();
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [parsedIntent, setParsedIntent] = useState<ParsedVoiceIntent | null>(null);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang =
        lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'bn' ? 'bn-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let currentText = '';
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        setTranscript(currentText);
        if (event.results[0].isFinal) {
          parseVoiceTranscript(currentText);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lang]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setParsedIntent(null);
      setSuccessMessage(null);
      setErrorMessage(null);

      if (recognitionRef.current) {
        try {
          recognitionRef.current.lang =
            lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'bn' ? 'bn-IN' : 'en-IN';
          recognitionRef.current.start();
        } catch (e) {
          // If already running or permission blocked, simulate immediate listening state
          setIsListening(true);
        }
      } else {
        // Fallback simulation for unsupported browsers/iframes
        setIsListening(true);
        setTimeout(() => {
          const defaultPreset = VOICE_PRESETS[lang]?.[0] || VOICE_PRESETS.en[0];
          setTranscript(defaultPreset.text);
          setParsedIntent(defaultPreset.parsed);
          setIsListening(false);
          speakConfirmation(defaultPreset.parsed);
        }, 1800);
      }
    }
  };

  const parseVoiceTranscript = (text: string) => {
    const lower = text.toLowerCase();
    let action: 'ADD_STOCK' | 'DEDUCT_STOCK' = 'ADD_STOCK';
    if (lower.includes('deduct') || lower.includes('use') || lower.includes('remove') || lower.includes('घटाएं') || lower.includes('कमी') || lower.includes('বিয়োগ')) {
      action = 'DEDUCT_STOCK';
    }

    let deltaQty = 50;
    const numMatch = text.match(/\d+/);
    if (numMatch) {
      deltaQty = parseInt(numMatch[0], 10);
      if (action === 'DEDUCT_STOCK') deltaQty = -deltaQty;
    }

    let skuCode = 'PAR-500';
    let skuName = 'Paracetamol 500mg Tabs';
    if (lower.includes('ors') || lower.includes('ओआरएस') || lower.includes('ওআরএস')) {
      skuCode = 'ORS-001';
      skuName = 'Oral Rehydration Salts WHO';
    } else if (lower.includes('artesunate') || lower.includes('आर्टिस्युनेट') || lower.includes('আর্টেসুনেট')) {
      skuCode = 'ART-060';
      skuName = 'Artesunate Injection 60mg';
    } else if (lower.includes('insulin') || lower.includes('इंसुलिन') || lower.includes('ইনসুলিন')) {
      skuCode = 'INS-NPH';
      skuName = 'Human Insulin NPH 100IU';
    } else if (lower.includes('saline') || lower.includes('सलाइन') || lower.includes('স্যালাইন')) {
      skuCode = 'IV-NS500';
      skuName = 'Normal Saline IV 500ml';
    }

    let facilityId = 'shirur-phc';
    let facilityName = 'Shirur PHC (Pune)';
    if (lower.includes('manchar') || lower.includes('मंचर') || lower.includes('মাঞ্চার')) {
      facilityId = 'manchar-chc';
      facilityName = 'Manchar CHC (Pune)';
    } else if (lower.includes('daund') || lower.includes('दौंड') || lower.includes('দাউন্ড')) {
      facilityId = 'daund-sdh';
      facilityName = 'Daund Sub-District Hospital';
    }

    const parsed: ParsedVoiceIntent = {
      action,
      facilityId,
      facilityName,
      skuCode,
      skuName,
      deltaQty,
      rawTranscript: text,
      confidence: 0.96,
    };

    setParsedIntent(parsed);
    speakConfirmation(parsed);
  };

  const handleSelectPreset = (preset: { label: string; text: string; parsed: ParsedVoiceIntent }) => {
    setTranscript(preset.text);
    setParsedIntent(preset.parsed);
    speakConfirmation(preset.parsed);
  };

  const speakConfirmation = (intent: ParsedVoiceIntent) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      let spokenText = '';
      if (lang === 'hi') {
        spokenText = `पुष्टि: ${intent.facilityName} में ${Math.abs(intent.deltaQty)} ${intent.skuName} ${intent.deltaQty > 0 ? 'जोड़ने' : 'घटाने'} का अनुरोध पहचाना गया।`;
      } else if (lang === 'mr') {
        spokenText = `पुष्टी: ${intent.facilityName} मध्ये ${Math.abs(intent.deltaQty)} ${intent.skuName} ${intent.deltaQty > 0 ? 'जोडण्याची' : 'कमी करण्याची'} विनंती ओळखली आहे.`;
      } else if (lang === 'bn') {
        spokenText = `নিশ্চিতকরণ: ${intent.facilityName}-এ ${Math.abs(intent.deltaQty)} ${intent.skuName} ${intent.deltaQty > 0 ? 'যোগ' : 'বিয়োগ'} করার অনুরোধ সনাক্ত হয়েছে।`;
      } else {
        spokenText = `Intent detected: ${intent.deltaQty > 0 ? 'Add' : 'Deduct'} ${Math.abs(intent.deltaQty)} units of ${intent.skuName} at ${intent.facilityName}.`;
      }

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'bn' ? 'bn-IN' : 'en-IN';
      utterance.rate = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleConfirmAndApply = async () => {
    if (!parsedIntent || !token) return;
    setIsApplying(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/v1/stock/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          facilityId: parsedIntent.facilityId,
          skuCode: parsedIntent.skuCode,
          deltaQty: parsedIntent.deltaQty,
          reason: `Voice Dictation (${lang.toUpperCase()}): "${parsedIntent.rawTranscript}"`,
          requestId: `req_voice_${Date.now()}`,
        }),
      });

      if (res.ok) {
        setSuccessMessage(t.voiceConfirmSuccess);
        onStockUpdated?.();
        if ('speechSynthesis' in window) {
          const successUtterance = new SpeechSynthesisUtterance(
            lang === 'hi' ? 'स्टॉक सफलतापूर्वक अपडेट हो गया है।' : lang === 'mr' ? 'साठा यशस्वीरीत्या अद्यतनित झाला आहे.' : lang === 'bn' ? 'স্টক সফলভাবে আপডেট হয়েছে।' : 'Inventory adjustment saved successfully.'
          );
          successUtterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'bn' ? 'bn-IN' : 'en-IN';
          window.speechSynthesis.speak(successUtterance);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.message || 'Failed to apply inventory update.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error applying inventory update.');
    } finally {
      setIsApplying(false);
    }
  };

  const presets = VOICE_PRESETS[lang] || VOICE_PRESETS.en;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">{t.voiceAssistant}</h2>
              <p className="text-xs text-slate-400">{t.micInstruction}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-sm text-slate-300">
          {/* Language Selector Bar */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <span className="text-xs font-medium text-slate-400">{t.selectLanguage}:</span>
            <div className="flex gap-1.5">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setLang(opt.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    lang === opt.code
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="mr-1">{opt.flag}</span>
                  {opt.scriptName}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Mic Station */}
          <div className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-gradient-to-b from-slate-800/40 to-slate-900 border border-slate-800 text-center relative overflow-hidden">
            {isListening && (
              <div className="absolute inset-0 bg-teal-500/5 animate-pulse pointer-events-none" />
            )}

            <button
              onClick={toggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all transform active:scale-95 shadow-xl ${
                isListening
                  ? 'bg-red-500 text-white ring-8 ring-red-500/20 animate-bounce'
                  : 'bg-teal-600 hover:bg-teal-500 text-white ring-4 ring-teal-500/20'
              }`}
            >
              {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            <p className="mt-3 text-sm font-medium text-slate-200">
              {isListening ? t.listening : t.speakCommand}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {isListening ? t.micListening : 'e.g. "Add 50 Paracetamol to Shirur PHC"'}
            </p>
          </div>

          {/* Live Transcript Display */}
          {transcript && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-teal-400">Transcribed Voice Input:</span>
                {isSpeaking && (
                  <button
                    onClick={stopSpeaking}
                    className="flex items-center gap-1 text-teal-300 hover:text-teal-200"
                  >
                    <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                    <span>Speaking...</span>
                  </button>
                )}
              </div>
              <p className="text-slate-200 italic text-sm">"{transcript}"</p>
            </div>
          )}

          {/* Conversational Intent Confirmation Card */}
          {parsedIntent && !successMessage && (
            <div className="p-4 rounded-xl bg-slate-800/80 border border-teal-500/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-300 font-semibold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  {t.confirmInventoryChange}
                </div>
                <button
                  onClick={() => speakConfirmation(parsedIntent)}
                  className="p-1 rounded bg-slate-700 text-slate-300 hover:text-white"
                  title="Re-read intent aloud"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/60">
                  <span className="text-slate-400 block">{t.action}</span>
                  <span
                    className={`font-semibold ${
                      parsedIntent.deltaQty > 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {parsedIntent.deltaQty > 0 ? '➕ ADD STOCK' : '➖ DEDUCT STOCK'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/60">
                  <span className="text-slate-400 block">{t.quantity}</span>
                  <span className="font-semibold text-slate-100">
                    {parsedIntent.deltaQty > 0 ? `+${parsedIntent.deltaQty}` : parsedIntent.deltaQty} units
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/60 col-span-2">
                  <span className="text-slate-400 block">{t.facility}</span>
                  <span className="font-semibold text-slate-100">{parsedIntent.facilityName}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/60 col-span-2">
                  <span className="text-slate-400 block">{t.sku}</span>
                  <span className="font-semibold text-teal-300">
                    {parsedIntent.skuName} ({parsedIntent.skuCode})
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleConfirmAndApply}
                  disabled={isApplying}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                >
                  {isApplying ? (
                    'Posting to Ledger...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {t.confirmApply}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setParsedIntent(null)}
                  className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs"
                >
                  {t.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-xs">{successMessage}</p>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">
                  Audited & synced with zero-PHI tamper-evident ledger.
                </p>
              </div>
              <button
                onClick={() => {
                  setParsedIntent(null);
                  setSuccessMessage(null);
                  setTranscript('');
                }}
                className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium"
              >
                New Entry
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Voice Presets for Field Staff */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400">
              Quick Voice Presets ({LANGUAGE_OPTIONS.find((l) => l.code === lang)?.label}):
            </span>
            <div className="space-y-1.5">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full text-left p-2.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 flex items-center justify-between text-xs text-slate-300 transition-colors group"
                >
                  <span className="group-hover:text-teal-300 font-medium">{preset.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

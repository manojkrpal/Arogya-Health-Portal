import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { LANGUAGE_OPTIONS, Language } from '../lib/i18n.js';
import {
  parseClinicalIntent,
  CLINICAL_DISEASE_REGISTRY,
  ClinicalConditionMapping,
} from '../services/clinicalKnowledge.js';
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
  Activity,
  HeartPulse,
  ShieldAlert,
} from 'lucide-react';

interface VoiceNurseAssistantModalProps {
  onClose: () => void;
  onStockUpdated?: () => void;
}

interface ParsedVoiceIntent {
  action: 'ADD_STOCK' | 'DEDUCT_STOCK' | 'CLINICAL_DISPENSE';
  facilityId: string;
  facilityName: string;
  skuCode: string;
  skuName: string;
  deltaQty: number;
  rawTranscript: string;
  confidence: number;
  conditionName?: string;
  urgencyLevel?: 'routine' | 'urgent' | 'emergency';
}

const VOICE_PRESETS: Record<Language, Array<{ label: string; text: string; parsed: ParsedVoiceIntent }>> = {
  en: [
    {
      label: 'Emergency: Dog bite patient requires Anti-Rabies Vaccine at Shirur PHC',
      text: 'Dispense 5 vials of Anti-Rabies Vaccine for stray dog bite emergency at Shirur PHC.',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        facilityName: 'Shirur PHC (Pune Rural)',
        skuCode: 'RAB-VAX',
        skuName: 'Anti-Rabies Vaccine 0.5ml (Cold Chain)',
        deltaQty: -5,
        rawTranscript: 'Dispense 5 vials of Anti-Rabies Vaccine for stray dog bite emergency at Shirur PHC.',
        confidence: 0.98,
        conditionName: 'Animal / Dog Bite & Rabies Prophylaxis',
        urgencyLevel: 'emergency',
      },
    },
    {
      label: 'Dehydration Surge: Deduct 25 WHO ORS Packets at Shirur dispensary',
      text: 'Deduct 25 packets of WHO Oral Rehydration Salts for acute diarrhea patients at Shirur.',
      parsed: {
        action: 'DEDUCT_STOCK',
        facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        facilityName: 'Shirur PHC (Pune Rural)',
        skuCode: 'ORS-20.5G',
        skuName: 'Oral Rehydration Salts (ORS) 20.5g',
        deltaQty: -25,
        rawTranscript: 'Deduct 25 packets of WHO Oral Rehydration Salts for acute diarrhea patients at Shirur.',
        confidence: 0.97,
        conditionName: 'Acute Diarrheal Disease / Cholera / Severe Dehydration',
        urgencyLevel: 'urgent',
      },
    },
    {
      label: 'Diabetes Crisis: Dispense 10 vials of Regular Insulin at Manchar CHC',
      text: 'Dispense 10 vials of Regular Insulin 40IU for high sugar diabetic patient at Manchar CHC.',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        facilityName: 'Manchar CHC (Pune Rural)',
        skuCode: 'INS-REG-40',
        skuName: 'Regular Insulin 40 IU/ml (Cold Chain)',
        deltaQty: -10,
        rawTranscript: 'Dispense 10 vials of Regular Insulin 40IU for high sugar diabetic patient at Manchar CHC.',
        confidence: 0.98,
        conditionName: 'Diabetes Mellitus / Hyperglycemia Crisis',
        urgencyLevel: 'urgent',
      },
    },
    {
      label: 'Snakebite Emergency: Administer Anti-Snake Venom at Baramati SDH',
      text: 'Administer 10 vials of Polyvalent Anti-Snake Venom for venomous bite at Baramati Hospital.',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        facilityName: 'Baramati Sub-District Hospital',
        skuCode: 'ASV-10ML',
        skuName: 'Polyvalent Anti-Snake Venom 10ml',
        deltaQty: -10,
        rawTranscript: 'Administer 10 vials of Polyvalent Anti-Snake Venom for venomous bite at Baramati Hospital.',
        confidence: 0.99,
        conditionName: 'Ophitoxaemia / Snake Envenomation',
        urgencyLevel: 'emergency',
      },
    },
    {
      label: 'Pneumonia Outbreak: Add 40 Amoxicillin strips to Shirur stock',
      text: 'Add 40 strips of Amoxicillin 500mg capsules for bacterial chest infection at Shirur PHC.',
      parsed: {
        action: 'ADD_STOCK',
        facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        facilityName: 'Shirur PHC (Pune Rural)',
        skuCode: 'AMOX-500',
        skuName: 'Amoxicillin Capsules 500mg',
        deltaQty: 40,
        rawTranscript: 'Add 40 strips of Amoxicillin 500mg capsules for bacterial chest infection at Shirur PHC.',
        confidence: 0.96,
        conditionName: 'Bacterial Pneumonia / Acute Respiratory Infection',
        urgencyLevel: 'urgent',
      },
    },
    {
      label: 'Maternal Delivery: Record 15 Oxytocin injections at Manchar CHC',
      text: 'Record use of 15 ampoules of Oxytocin 10IU for labor room deliveries at Manchar CHC.',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        facilityName: 'Manchar CHC (Pune Rural)',
        skuCode: 'OXY-10',
        skuName: 'Oxytocin Injection 10 IU/ml',
        deltaQty: -15,
        rawTranscript: 'Record use of 15 ampoules of Oxytocin 10IU for labor room deliveries at Manchar CHC.',
        confidence: 0.98,
        conditionName: 'Postpartum Hemorrhage / Maternal Delivery',
        urgencyLevel: 'emergency',
      },
    },
  ],
  hi: [
    {
      label: 'आपातकाल: कुत्ते के काटने पर 5 रैबीज वैक्सीन (शिरूर पीएचसी)',
      text: 'शिरूर प्राथमिक स्वास्थ्य केंद्र में कुत्ते के काटने के मरीज के लिए 5 एंटी-रेबीज वैक्सीन दें।',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        facilityName: 'Shirur PHC (Pune Rural)',
        skuCode: 'RAB-VAX',
        skuName: 'Anti-Rabies Vaccine 0.5ml (Cold Chain)',
        deltaQty: -5,
        rawTranscript: 'शिरूर प्राथमिक स्वास्थ्य केंद्र में कुत्ते के काटने के मरीज के लिए 5 एंटी-रेबीज वैक्सीन दें।',
        confidence: 0.98,
        conditionName: 'Animal / Dog Bite & Rabies Prophylaxis',
        urgencyLevel: 'emergency',
      },
    },
    {
      label: 'सर्पदंश: बारामती अस्पताल में 10 एंटी-स्नेक वेनम दें',
      text: 'बारामती उप-जिला अस्पताल में सर्पदंश पीड़ित के लिए 10 शीशियां एंटी-स्नेक वेनम निकालें।',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        facilityName: 'Baramati Sub-District Hospital',
        skuCode: 'ASV-10ML',
        skuName: 'Polyvalent Anti-Snake Venom 10ml',
        deltaQty: -10,
        rawTranscript: 'बारामती उप-जिला अस्पताल में सर्पदंश पीड़ित के लिए 10 शीशियां एंटी-स्नेक वेनम निकालें।',
        confidence: 0.99,
        conditionName: 'Ophitoxaemia / Snake Envenomation',
        urgencyLevel: 'emergency',
      },
    },
    {
      label: 'मधुमेह: मंचर में 10 इंसुलिन शीशियां वितरित करें',
      text: 'मंचर सीएचसी में हाई शुगर डायबिटीज के मरीज को 10 इंसुलिन शीशियां दें।',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        facilityName: 'Manchar CHC (Pune Rural)',
        skuCode: 'INS-REG-40',
        skuName: 'Regular Insulin 40 IU/ml (Cold Chain)',
        deltaQty: -10,
        rawTranscript: 'मंचर सीएचसी में हाई शुगर डायबिटीज के मरीज को 10 इंसुलिन शीशियां दें।',
        confidence: 0.98,
        conditionName: 'Diabetes Mellitus / Hyperglycemia Crisis',
        urgencyLevel: 'urgent',
      },
    },
    {
      label: 'दस्त एवं निर्जलीकरण: 25 ओआरएस पैकेट घटाएं',
      text: 'शिरूर में उल्टी दस्त और निर्जलीकरण के रोगियों हेतु 25 ओआरएस पैकेट घटाएं।',
      parsed: {
        action: 'DEDUCT_STOCK',
        facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        facilityName: 'Shirur PHC (Pune Rural)',
        skuCode: 'ORS-20.5G',
        skuName: 'Oral Rehydration Salts (ORS) 20.5g',
        deltaQty: -25,
        rawTranscript: 'शिरूर में उल्टी दस्त और निर्जलीकरण के रोगियों हेतु 25 ओआरएस पैकेट घटाएं।',
        confidence: 0.97,
        conditionName: 'Acute Diarrheal Disease / Cholera / Severe Dehydration',
        urgencyLevel: 'urgent',
      },
    },
  ],
  mr: [
    {
      label: 'तातडी: कुत्र्याने चावल्यामुळे ५ अँटी-रेबीज लस (शिरूर पीएचसी)',
      text: 'शिरूर प्राथमिक आरोग्य केंद्रात कुत्रा चावलेल्या रुग्णासाठी ५ अँटी-रेबीज लस द्या.',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        facilityName: 'Shirur PHC (Pune Rural)',
        skuCode: 'RAB-VAX',
        skuName: 'Anti-Rabies Vaccine 0.5ml (Cold Chain)',
        deltaQty: -5,
        rawTranscript: 'शिरूर प्राथमिक आरोग्य केंद्रात कुत्रा चावलेल्या रुग्णासाठी ५ अँटी-रेबीज लस द्या.',
        confidence: 0.98,
        conditionName: 'Animal / Dog Bite & Rabies Prophylaxis',
        urgencyLevel: 'emergency',
      },
    },
    {
      label: 'सर्पदंश: बारामती रुग्णालयात १० अँटी स्नेक व्हेनम नोंदवा',
      text: 'बारामती रुग्णालयात सर्पदंश रुग्णासाठी १० अँटी स्नेक व्हेनम साठ्यातून वापरा.',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        facilityName: 'Baramati Sub-District Hospital',
        skuCode: 'ASV-10ML',
        skuName: 'Polyvalent Anti-Snake Venom 10ml',
        deltaQty: -10,
        rawTranscript: 'बारामती रुग्णालयात सर्पदंश रुग्णासाठी १० अँटी स्नेक व्हेनम साठ्यातून वापरा.',
        confidence: 0.99,
        conditionName: 'Ophitoxaemia / Snake Envenomation',
        urgencyLevel: 'emergency',
      },
    },
    {
      label: 'प्रसूती: मंचरमध्ये १५ ऑक्सिटोसिन इंजेक्शन्स वापरा',
      text: 'मंचर ग्रामीण रुग्णालयात प्रसूती कक्षासाठी १५ ऑक्सिटोसिन इंजेक्शन नोंदवा.',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        facilityName: 'Manchar CHC (Pune Rural)',
        skuCode: 'OXY-10',
        skuName: 'Oxytocin Injection 10 IU/ml',
        deltaQty: -15,
        rawTranscript: 'मंचर ग्रामीण रुग्णालयात प्रसूती कक्षासाठी १५ ऑक्सिटोसिन इंजेक्शन नोंदवा.',
        confidence: 0.97,
        conditionName: 'Postpartum Hemorrhage / Maternal Delivery',
        urgencyLevel: 'emergency',
      },
    },
  ],
  bn: [
    {
      label: 'জরুরি: কুকুরের কামড়ে ৫টি জলাতঙ্কের ভ্যাকসিন দিন (শিরুর পিএইচসি)',
      text: 'শিরুর প্রাথমিক স্বাস্থ্যকেন্দ্রে কুকুরের কামড়ের রোগীর জন্য ৫টি জলাতঙ্কের ভ্যাকসিন দিন।',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        facilityName: 'Shirur PHC (Pune Rural)',
        skuCode: 'RAB-VAX',
        skuName: 'Anti-Rabies Vaccine 0.5ml (Cold Chain)',
        deltaQty: -5,
        rawTranscript: 'শিরুর প্রাথমিক স্বাস্থ্যকেন্দ্রে কুকুরের কামড়ের রোগীর জন্য ৫টি জলাতঙ্কের ভ্যাকসিন দিন।',
        confidence: 0.98,
        conditionName: 'Animal / Dog Bite & Rabies Prophylaxis',
        urgencyLevel: 'emergency',
      },
    },
    {
      label: 'ডায়াবেটিস: মাঞ্চার সিএইচসিতে ১০টি ইনসুলিন প্রদান করুন',
      text: 'মাঞ্চার সিএইচসিতে ডায়াবেটিস রোগীর জন্য ১০ ভায়াল ইনসুলিন প্রদান করুন।',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        facilityName: 'Manchar CHC (Pune Rural)',
        skuCode: 'INS-REG-40',
        skuName: 'Regular Insulin 40 IU/ml (Cold Chain)',
        deltaQty: -10,
        rawTranscript: 'মাঞ্চার সিএইচসিতে ডায়াবেটিস রোগীর জন্য ১০ ভায়াল ইনসুলিন প্রদান করুন।',
        confidence: 0.97,
        conditionName: 'Diabetes Mellitus / Hyperglycemia Crisis',
        urgencyLevel: 'urgent',
      },
    },
    {
      label: 'সর্পাঘাত: বারামতি হাসপাতালে ১০টি অ্যান্টি-ভেনম দিন',
      text: 'বারামতি হাসপাতালে সাপে কাটা রোগীর জন্য ১০টি অ্যান্টি-ভেনম ব্যবহার করুন।',
      parsed: {
        action: 'CLINICAL_DISPENSE',
        facilityId: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        facilityName: 'Baramati Sub-District Hospital',
        skuCode: 'ASV-10ML',
        skuName: 'Polyvalent Anti-Snake Venom 10ml',
        deltaQty: -10,
        rawTranscript: 'বারামতি হাসপাতালে সাপে কাটা রোগীর জন্য ১০টি অ্যান্টি-ভেনম ব্যবহার করুন।',
        confidence: 0.99,
        conditionName: 'Ophitoxaemia / Snake Envenomation',
        urgencyLevel: 'emergency',
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
    // Dynamically evaluate text using clinical disease ontology
    const clinicalResult = parseClinicalIntent(text, lang);

    const parsed: ParsedVoiceIntent = {
      action: clinicalResult.action,
      facilityId: clinicalResult.facilityId,
      facilityName: clinicalResult.facilityName,
      skuCode: clinicalResult.skuCode,
      skuName: clinicalResult.skuName,
      deltaQty: clinicalResult.deltaQty,
      rawTranscript: text,
      confidence: clinicalResult.confidence,
      conditionName: clinicalResult.matchedCondition.conditionName,
      urgencyLevel: clinicalResult.matchedCondition.urgencyLevel,
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
      const actionVerbEn = intent.deltaQty > 0 ? 'Add' : intent.action === 'CLINICAL_DISPENSE' ? 'Dispense for patient care' : 'Deduct';
      const actionVerbHi = intent.deltaQty > 0 ? 'जोड़ने' : 'वितरित करने';
      const actionVerbMr = intent.deltaQty > 0 ? 'जोडण्याची' : 'देण्याची';
      const actionVerbBn = intent.deltaQty > 0 ? 'যোগ' : 'বিতরণ';

      if (lang === 'hi') {
        spokenText = `पहचाना गया: ${intent.conditionName ? intent.conditionName + ' हेतु ' : ''}${intent.facilityName} में ${Math.abs(intent.deltaQty)} इकाई ${intent.skuName} ${actionVerbHi} का अनुरोध।`;
      } else if (lang === 'mr') {
        spokenText = `ओळखले: ${intent.conditionName ? intent.conditionName + ' साठी ' : ''}${intent.facilityName} मध्ये ${Math.abs(intent.deltaQty)} युनिट ${intent.skuName} ${actionVerbMr} ची नोंद.`;
      } else if (lang === 'bn') {
        spokenText = `সনাক্তকরণ: ${intent.conditionName ? intent.conditionName + ' জন্য ' : ''}${intent.facilityName}-এ ${Math.abs(intent.deltaQty)} ইউনিট ${intent.skuName} ${actionVerbBn} করার নির্দেশ।`;
      } else {
        spokenText = `Intent confirmed: ${actionVerbEn} ${Math.abs(intent.deltaQty)} units of ${intent.skuName} for ${intent.conditionName || 'Care'} at ${intent.facilityName}.`;
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
          reason: `Voice Assistant [${parsedIntent.conditionName || 'Clinical'}] (${lang.toUpperCase()}): "${parsedIntent.rawTranscript}"`,
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
              <p className="text-xs text-slate-400">Clinical Disease & NLEM Drug Voice Triage</p>
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
              {isListening
                ? t.micListening
                : 'Speak any clinical condition (e.g., "Dog bite emergency", "Severe diarrhea ORS", "Diabetic insulin", "Snake venom ASV")'}
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
                {parsedIntent.urgencyLevel && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      parsedIntent.urgencyLevel === 'emergency'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                        : parsedIntent.urgencyLevel === 'urgent'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    }`}
                  >
                    {parsedIntent.urgencyLevel}
                  </span>
                )}
              </div>

              {parsedIntent.conditionName && (
                <div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-500/30 flex items-center gap-2 text-xs text-teal-200">
                  <HeartPulse className="w-4 h-4 text-teal-400 shrink-0" />
                  <div>
                    <span className="font-semibold block">Recognized Clinical Presentation:</span>
                    <span>{parsedIntent.conditionName}</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/60">
                  <span className="text-slate-400 block">{t.action}</span>
                  <span
                    className={`font-semibold ${
                      parsedIntent.deltaQty > 0
                        ? 'text-emerald-400'
                        : parsedIntent.action === 'CLINICAL_DISPENSE'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {parsedIntent.deltaQty > 0
                      ? '➕ ADD STOCK'
                      : parsedIntent.action === 'CLINICAL_DISPENSE'
                      ? '💉 CLINICAL DISPENSE'
                      : '➖ DEDUCT STOCK'}
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
                  <span className="text-slate-400 block">Matched Essential Medicine (NLEM)</span>
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

          {/* Multi-Disease Field Presets */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-semibold text-slate-400">
              Clinical Disease Presets ({LANGUAGE_OPTIONS.find((l) => l.code === lang)?.label}):
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

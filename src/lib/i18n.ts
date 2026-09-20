export type Language = 'en' | 'hi' | 'mr' | 'bn';

export interface TranslationDict {
  appName: string;
  nationalGrid: string;
  voiceAssistant: string;
  selectLanguage: string;
  micListening: string;
  micInstruction: string;
  speakCommand: string;
  confirmInventoryChange: string;
  action: string;
  facility: string;
  sku: string;
  quantity: string;
  confirmApply: string;
  cancel: string;
  listening: string;
  multimodalTriage: string;
  shelfVerification: string;
  facilityCondition: string;
  audioAlertReadout: string;
  stockoutAlerts: string;
  urgentNotice: string;
  donorCoverDays: string;
  transfers: string;
  coldChain: string;
  map: string;
  alerts: string;
  stock: string;
  logistics: string;
  audit: string;
  federation: string;
  speakAlert: string;
  stopAudio: string;
  voiceConfirmSuccess: string;
}

export const translations: Record<Language, TranslationDict> = {
  en: {
    appName: 'ArogyaNet Health Grid',
    nationalGrid: 'National PHC Grid',
    voiceAssistant: 'Voice Assistant (Nurse Dictation)',
    selectLanguage: 'Select Language',
    micListening: 'Listening to voice dictation...',
    micInstruction: 'Speak inventory adjustments or clinical queries in English, Hindi, Marathi, or Bengali.',
    speakCommand: 'Click microphone to speak',
    confirmInventoryChange: 'Confirm Inventory Intent',
    action: 'Action',
    facility: 'Target Facility',
    sku: 'Medicine / SKU',
    quantity: 'Quantity Delta',
    confirmApply: 'Confirm & Post to Inventory',
    cancel: 'Cancel',
    listening: 'Recording...',
    multimodalTriage: 'Multimodal AI Clinical & Shelf Verification',
    shelfVerification: 'Shelf Stock & Lot Expiry OCR',
    facilityCondition: 'Facility Cleanliness & Cold-Chain Check',
    audioAlertReadout: 'Audio Alert Voice Readout',
    stockoutAlerts: 'Critical Stockout Alerts',
    urgentNotice: 'Urgent Clinical Excursion',
    donorCoverDays: 'Donor Buffer Cover (Days)',
    transfers: 'Transfers',
    coldChain: 'Cold-Chain',
    map: 'Map',
    alerts: 'Alerts',
    stock: 'Stock',
    logistics: 'Logistics',
    audit: 'Audit',
    federation: 'BRICS ESS',
    speakAlert: 'Read Alert Aloud',
    stopAudio: 'Stop Audio',
    voiceConfirmSuccess: 'Inventory adjustment successfully processed.',
  },
  hi: {
    appName: 'आरोग्यनेट स्वास्थ्य ग्रिड',
    nationalGrid: 'राष्ट्रीय प्राथमिक स्वास्थ्य केंद्र ग्रिड',
    voiceAssistant: 'आवाज सहायक (नर्स डिक्टेशन)',
    selectLanguage: 'भाषा चुनें',
    micListening: 'आवाज डिक्टेशन सुन रहे हैं...',
    micInstruction: 'दवा स्टॉक समायोजन या लक्षण हिंदी, अंग्रेजी, मराठी या बंगाली में बोलें।',
    speakCommand: 'बोलने के लिए माइक दबाएं',
    confirmInventoryChange: 'स्टॉक परिवर्तन की पुष्टि करें',
    action: 'कार्य',
    facility: 'लक्षित स्वास्थ्य केंद्र',
    sku: 'दवा / सामग्री',
    quantity: 'मात्रा परिवर्तन',
    confirmApply: 'पुष्टि करें और स्टॉक में जोड़ें',
    cancel: 'रद्द करें',
    listening: 'रिकॉर्डिंग जारी...',
    multimodalTriage: 'मल्टीमॉडल AI क्लिनिकल एवं शेल्फ सत्यापन',
    shelfVerification: 'दवा शेल्फ स्टॉक व एक्सपायरी OCR जांच',
    facilityCondition: 'स्वास्थ्य केंद्र स्वच्छता एवं कोल्ड-चेन निरीक्षण',
    audioAlertReadout: 'ऑडियो चेतावनी वाचन',
    stockoutAlerts: 'गंभीर स्टॉकआउट चेतावनियाँ',
    urgentNotice: 'आपातकालीन तापमान विचलन',
    donorCoverDays: 'दाता केंद्र सुरक्षा बफर (दिन)',
    transfers: 'स्थानांतरण',
    coldChain: 'कोल्ड-चेन',
    map: 'मानचित्र',
    alerts: 'चेतावनियाँ',
    stock: 'दवा स्टॉक',
    logistics: 'लॉजिस्टिक्स',
    audit: 'ऑडिट',
    federation: 'ब्रिक्स ईएसएस',
    speakAlert: 'चेतावनी बोलकर सुनाएं',
    stopAudio: 'ऑडियो बंद करें',
    voiceConfirmSuccess: 'स्टॉक समायोजन सफलतापूर्वक दर्ज किया गया।',
  },
  mr: {
    appName: 'आरोग्यनेट आरोग्य ग्रीड',
    nationalGrid: 'राष्ट्रीय प्राथमिक आरोग्य केंद्र ग्रीड',
    voiceAssistant: 'आवाज सहाय्यक (नर्स डिक्टेशन)',
    selectLanguage: 'भाषा निवडा',
    micListening: 'आवाज डिक्टेशन ऐकत आहे...',
    micInstruction: 'औषध साठा बदल किंवा वैद्यकीय माहिती मराठी, हिंदी, इंग्रजी किंवा बंगालीमध्ये बोला.',
    speakCommand: 'बोलण्यासाठी माइक दाबा',
    confirmInventoryChange: 'औषध साठा बदलाची पुष्टी करा',
    action: 'क्रिया',
    facility: 'आरोग्य केंद्र',
    sku: 'औषध / साहित्य',
    quantity: 'साठा बदल संख्या',
    confirmApply: 'पुष्टी करा आणि साठ्यात नोंदवा',
    cancel: 'रद्द करा',
    listening: 'ध्वनीमुद्रण सुरू...',
    multimodalTriage: 'मल्टीमॉडल AI क्लिनिकल व शेल्फ तपासणी',
    shelfVerification: 'औषध शेल्फ साठा व मुदत संपण्याची OCR तपासणी',
    facilityCondition: 'आरोग्य केंद्र स्वच्छता व कोल्ड-चेन तपासणी',
    audioAlertReadout: 'ऑडिओ अलर्ट वाचन',
    stockoutAlerts: 'गंभीर औषध तुटवडा इशारे',
    urgentNotice: 'तातडीची तापमान नोंद',
    donorCoverDays: 'दाता केंद्र सुरक्षित साठा (दिवस)',
    transfers: 'हस्तांतरण',
    coldChain: 'कोल्ड-चेन',
    map: 'नकाशा',
    alerts: 'इशारे',
    stock: 'औषध साठा',
    logistics: 'लॉजिस्टिक्स',
    audit: 'ऑडिट',
    federation: 'ब्रिक्स ईएसएस',
    speakAlert: 'इशारा ऐका',
    stopAudio: 'ऑडिओ थांबवा',
    voiceConfirmSuccess: 'साठा बदल यशस्वीरीत्या नोंदवला गेला.',
  },
  bn: {
    appName: 'আরোগ্যনেট হেলথ গ্রিড',
    nationalGrid: 'জাতীয় প্রাথমিক স্বাস্থ্যকেন্দ্র গ্রিড',
    voiceAssistant: 'ভয়েস সহকারী (নার্স ডিকটেশন)',
    selectLanguage: 'ভাষা নির্বাচন করুন',
    micListening: 'ভয়েস ডিকটেশন শুনছি...',
    micInstruction: 'ওষুধের স্টক সমন্বয় বা ক্লিনিকাল তথ্য বাংলা, হিন্দি, মারাঠি বা ইংরেজিতে বলুন।',
    speakCommand: 'কথা বলতে মাইক্রোফোন টিপুন',
    confirmInventoryChange: 'স্টক পরিবর্তনের নিশ্চিতকরণ',
    action: 'পদক্ষেপ',
    facility: 'স্বাস্থ্যকেন্দ্র',
    sku: 'ওষুধ / সামগ্রী',
    quantity: 'পরিমাণ পরিবর্তন',
    confirmApply: 'নিশ্চিত করুন এবং স্টকে যোগ করুন',
    cancel: 'বাতিল',
    listening: 'রেকর্ডিং চলছে...',
    multimodalTriage: 'মাল্টিমোডাল এআই ক্লিনিকাল ও শেল্ফ যাচাইকরণ',
    shelfVerification: 'ওষুধের শেল্ফ স্টক ও মেয়াদোত্তীর্ণের OCR পরীক্ষা',
    facilityCondition: 'স্বাস্থ্যকেন্দ্রের পরিচ্ছন্নতা ও কোল্ড-চেইন পরীক্ষা',
    audioAlertReadout: 'অডিও সতর্কবার্তা পাঠ',
    stockoutAlerts: 'জরুরী স্টক ঘাটতি সতর্কতা',
    urgentNotice: 'জরুরী তাপমাত্রা সতর্কতা',
    donorCoverDays: 'দাতা কেন্দ্রের বাফার মজুদ (দিন)',
    transfers: 'স্থানান্তর',
    coldChain: 'কোল্ড-চেইন',
    map: 'মানচিত্র',
    alerts: 'সতর্কতা',
    stock: 'ওষুধের স্টক',
    logistics: 'লজিস্টিকস',
    audit: 'অডিট',
    federation: 'ব্রিকস ইএসএস',
    speakAlert: 'সতর্কবার্তা শুনুন',
    stopAudio: 'অডিও বন্ধ করুন',
    voiceConfirmSuccess: 'স্টক সমন্বয় সফলভাবে সম্পন্ন হয়েছে।',
  },
};

export const LANGUAGE_OPTIONS: Array<{ code: Language; label: string; scriptName: string; flag: string }> = [
  { code: 'en', label: 'English', scriptName: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', scriptName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', scriptName: 'मराठी', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali', scriptName: 'বাংলা', flag: '🇮🇳' },
];

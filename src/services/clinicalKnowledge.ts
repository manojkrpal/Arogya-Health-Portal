/**
 * ArogyaNet PHC Clinical Knowledge & Disease-to-Medicine Ontology Engine
 * Maps symptoms, disease presentations, and operational voice commands
 * across English, Hindi, Marathi, and Bengali to accurate NLEM Essential Medicine SKUs.
 */

export interface ClinicalConditionMapping {
  id: string;
  conditionName: string;
  category: string;
  keywords: string[];
  primarySkuCode: string;
  primarySkuName: string;
  secondarySkuCode?: string;
  secondarySkuName?: string;
  defaultQty: number;
  urgencyLevel: 'routine' | 'urgent' | 'emergency';
  clinicalSummary: {
    en: string;
    hi: string;
    mr: string;
    bn: string;
  };
}

export const CLINICAL_DISEASE_REGISTRY: ClinicalConditionMapping[] = [
  {
    id: 'rabies_exposure',
    conditionName: 'Animal / Dog Bite & Rabies Prophylaxis',
    category: 'Zoonotic / Trauma',
    keywords: [
      'dog bite', 'animal bite', 'rabies', 'stray dog', 'monkey bite', 'wound bite',
      'कुत्ता', 'काटना', 'रेबीज', 'श्वान', 'जलातंक', 'পাগলা কুকুর', 'কুকুরে কামড়',
      'कुत्रा', 'चावला', 'रेबीज लस', 'कुकুর', 'জলাতঙ্ক'
    ],
    primarySkuCode: 'RAB-VAX',
    primarySkuName: 'Anti-Rabies Vaccine 0.5ml (Cold Chain)',
    secondarySkuCode: 'AMOX-500',
    secondarySkuName: 'Amoxicillin Capsules 500mg',
    defaultQty: 5,
    urgencyLevel: 'emergency',
    clinicalSummary: {
      en: 'Immediate wound thorough washing with soap/water. Administer Anti-Rabies Vaccine (ARV) Day 0 protocol and check tetanus status.',
      hi: 'घाव को तत्काल साबुन और बहते पानी से धोएं। एंटी-रेबीज वैक्सीन (Day 0) और टिटनेस का टीका तुरंत लगाएं।',
      mr: 'जखम वाहत्या पाण्याने व साबणाने स्वच्छ धुवावी. त्वरित अँटी-रेबीज लस (ARV) टोचावी.',
      bn: 'ক্ষতস্থান সাবান ও জল দিয়ে অবিলম্বে ধৌত করুন এবং অ্যান্টি-র‍্যাবিস ভ্যাকসিন দিন।',
    },
  },
  {
    id: 'dehydration_gastro',
    conditionName: 'Acute Diarrheal Disease / Cholera / Severe Dehydration',
    category: 'Gastrointestinal & Waterborne',
    keywords: [
      'diarrhea', 'dehydration', 'loose motion', 'vomiting', 'gastro', 'cholera', 'watery stool', 'fluid loss', 'ors',
      'दस्त', 'उल्टी', 'निर्जलीकरण', 'हैजा', 'ओआरएस', 'जल की कमी',
      'जुलाब', 'उलटी', 'पाण्याचा अभाव', 'कॉलरा',
      'ডায়রিয়া', 'বমি', 'পাতলা পায়খানা', 'কলেরা', 'ডিহাইড্রেশন', 'স্যালাইন'
    ],
    primarySkuCode: 'ORS-20.5G',
    primarySkuName: 'Oral Rehydration Salts (ORS) 20.5g',
    secondarySkuCode: 'AMOX-500',
    secondarySkuName: 'Amoxicillin Capsules 500mg',
    defaultQty: 30,
    urgencyLevel: 'urgent',
    clinicalSummary: {
      en: 'Immediate oral rehydration therapy with WHO-formulation ORS. Assess skin turgor and pulse; administer IV fluids if severe hypovolemic shock.',
      hi: 'डब्ल्यूएचओ ओआरएस घोल से तत्काल पुनर्जलीकरण शुरू करें। गंभीर निर्जलीकरण में आईवी सलाइन दें।',
      mr: 'WHO प्रमाणित ओआरएस द्रावण तात्काळ द्यावे. गंभीर स्थितीत IV सलाईन सुरू करावे.',
      bn: 'অবিলম্বে ওআরএস স্যালাইন দিন। অতিরিক্ত পানিশূন্যতায় শিরাপথে স্যালাইন দিন।',
    },
  },
  {
    id: 'diabetes_hyperglycemia',
    conditionName: 'Diabetes Mellitus / Hyperglycemia Crisis',
    category: 'Endocrine & Metabolic',
    keywords: [
      'diabetes', 'sugar', 'insulin', 'hyperglycemia', 'ketoacidosis', 'high blood glucose', 'diabetic',
      'मधुमेह', 'डायबिटीज', 'इंसुलिन', 'रक्त शर्करा', 'शुगर',
      'मधुमेह', 'इन्सुलिन', 'साखर वाढली',
      'ডায়াবেটিস', 'ইনসুলিন', 'রক্তে সুগার'
    ],
    primarySkuCode: 'INS-REG-40',
    primarySkuName: 'Regular Insulin 40 IU/ml (Cold Chain)',
    defaultQty: 10,
    urgencyLevel: 'urgent',
    clinicalSummary: {
      en: 'Monitor blood glucose levels via glucometer. Titrate short-acting / regular human insulin according to sliding scale and maintain cold-chain (2-8°C).',
      hi: 'रक्त शर्करा की जांच करें। निर्देशानुसार नियमित इंसुलिन दें और 2-8°C कोल्ड-चेन तापमान बनाए रखें।',
      mr: 'रक्तातील साखर तपासा. डॉक्टरांच्या सल्ल्यानुसार इन्सुलिन द्या व कोल्ड-चेनचे तापमान 2-8°C ठेवा.',
      bn: 'রক্তের গ্লুকোজ পরিমাপ করুন এবং কোল্ড চেইন বজায় রেখে নিয়মিত ইনসুলিন প্রদান করুন।',
    },
  },
  {
    id: 'malaria_chills',
    conditionName: 'Severe Malaria / Falciparum with Rigors',
    category: 'Vector-Borne Infections',
    keywords: [
      'malaria', 'chills', 'shivering', 'rigor', 'falciparum', 'vivax', 'artesunate', 'mosquito fever',
      'मलेरिया', 'कंपकंपी', 'हिवताप', 'आर्टिस्युनेट', 'मच्छर बुखार',
      'हिवताप', 'थंडी वाजून ताप', 'आर्टिसुनेट',
      'ম্যালেরিয়া', 'কাঁপানি দিয়ে জ্বর', 'আর্টেসুনেট'
    ],
    primarySkuCode: 'ART-060',
    primarySkuName: 'Artesunate Injection 60mg',
    secondarySkuCode: 'PCM-500',
    secondarySkuName: 'Paracetamol Tablets 500mg',
    defaultQty: 20,
    urgencyLevel: 'emergency',
    clinicalSummary: {
      en: 'Perform rapid diagnostic test (RDT) for Malaria. Administer IV/IM Artesunate injection 2.4mg/kg on admission, followed by ACT regimen.',
      hi: 'मलेरिया रैपिड किट से जांच करें। गंभीर मलेरिया में तत्काल आर्टिस्युनेट 60mg इंजेक्शन दें।',
      mr: 'रॅपिड किटने मलेरिया तपासा. त्वरित आर्टिस्युनेट ६० मि.ग्रॅ. इंजेक्शन सुरू करा.',
      bn: 'ম্যালেরিয়া নিশ্চিত হলে অবিলম্বে আর্টেসুনেট ইনজেকশন প্রয়োগ করুন।',
    },
  },
  {
    id: 'bacterial_respiratory',
    conditionName: 'Bacterial Pneumonia / Acute Lower Respiratory Infection',
    category: 'Respiratory & Infectious',
    keywords: [
      'pneumonia', 'chest infection', 'bacterial', 'cough with phlegm', 'amoxicillin', 'amox', 'antibiotic', 'strep', 'bronchitis',
      'निमोनिया', 'फेफड़ों का संक्रमण', 'एमोक्सिसिलिन', 'एंटीबायोटिक', 'कफ', 'खांसी',
      'न्यूमोनिया', 'छातीचा संसर्ग', 'अ‍ॅमॉक्सिसिलिन',
      'নিউমোনিয়া', 'বুকের ইনফেকশন', 'অ্যামোক্সিসিলিন', 'অ্যান্টিবায়োটিক'
    ],
    primarySkuCode: 'AMOX-500',
    primarySkuName: 'Amoxicillin Capsules 500mg',
    defaultQty: 40,
    urgencyLevel: 'urgent',
    clinicalSummary: {
      en: 'Assess respiratory rate and SpO2. Initiate oral Amoxicillin 500mg TID course for bacterial respiratory cluster.',
      hi: 'श्वसन दर और ऑक्सीजन स्तर जांचें। एमोक्सिसिलिन 500mg कैप्सूल का पूर्ण कोर्स शुरू करें।',
      mr: 'श्वसनाचा वेग तपासा. जिवाणू संसर्गासाठी अ‍ॅमॉक्सिसिलिन ५०० मि.ग्रॅ. गोळ्या द्या.',
      bn: 'শ্বাসকষ্ট ও নিউমোনিয়ার ক্ষেত্রে অ্যামোক্সিসিলিন ৫০০ মিগ্রা ক্যাপসুল দিন।',
    },
  },
  {
    id: 'maternal_obstetric',
    conditionName: 'Postpartum Hemorrhage / Active Management of Third Stage of Labor',
    category: 'Maternal & Reproductive Health',
    keywords: [
      'labor', 'delivery', 'delivery room', 'bleeding', 'postpartum', 'oxytocin', 'maternal', 'uterine', 'hemorrhage',
      'प्रसव', 'डिलीवरी', 'रक्तस्राव', 'ऑक्सीटोसिन', 'मातृ स्वास्थ्य',
      'प्रसूती', 'रक्तस्राव', 'ऑक्सिटोसिन',
      'প্রসব', 'অতিরিক্ত রক্তক্ষরণ', 'অক্সিটোসিন'
    ],
    primarySkuCode: 'OXY-10',
    primarySkuName: 'Oxytocin Injection 10 IU/ml',
    defaultQty: 15,
    urgencyLevel: 'emergency',
    clinicalSummary: {
      en: 'Administer 10 IU Oxytocin IM immediately following delivery of the anterior shoulder to prevent postpartum hemorrhage (PPH). Maintain cold chain 2-8°C.',
      hi: 'प्रसव उपरांत गंभीर रक्तस्राव की रोकथाम हेतु ऑक्सीटोसिन 10 IU इंजेक्शन तुरंत लगाएं। कोल्ड-चेन सुरक्षित रखें।',
      mr: 'प्रसूतीनंतर जास्त रक्तस्राव रोखण्यासाठी त्वरित ऑक्सिटोसिन १० आययू इंजेक्शन द्यावे.',
      bn: 'প্রসবোত্তর রক্তক্ষরণ রোধে অবিলম্বে ১০ আইইউ অক্সিটোসিন ইনজেকশন প্রয়োগ করুন।',
    },
  },
  {
    id: 'snake_bite',
    conditionName: 'Ophitoxaemia / Neurotoxic & Hemotoxic Snake Envenomation',
    category: 'Toxicology & Trauma',
    keywords: [
      'snake bite', 'snakebite', 'cobra', 'viper', 'krait', 'venom', 'antivenom', 'fang marks',
      'सांप काटना', 'सर्पदंश', 'विष', 'एंटी-वेनम', 'नाग', 'करैत',
      'साप चावणे', 'सर्पदंश', 'विषारी साप', 'अँटी स्नेक व्हेनम',
      'সাপের কামড়', 'সর্পদংশন', 'বিষাক্ত সাপ', 'অ্যান্টি-ভেনম'
    ],
    primarySkuCode: 'ASV-10ML',
    primarySkuName: 'Polyvalent Anti-Snake Venom 10ml',
    defaultQty: 10,
    urgencyLevel: 'emergency',
    clinicalSummary: {
      en: 'Immobilize limb. Do NOT tourniquet. Administer 10 vials of Polyvalent ASV reconstituted in Normal Saline over 1 hour with close anaphylaxis monitoring.',
      hi: 'अंग को स्थिर रखें। सामान्य सलाइन में घोलकर पॉलीवैलेंट एंटी-स्नेक वेनम की 10 शीशियां तुरंत ड्रिप द्वारा दें।',
      mr: 'हात/पाय स्थिर ठेवा. नॉर्मल सलाईनमधून १० व्हायल्स अँटी-स्नेक व्हेनम तातडीने सुरू करा.',
      bn: 'অঙ্গ নাড়াচাড়া করবেন না। ১০ ভায়াল অ্যান্টি-স্নেক ভেনম স্যালাইনের সাথে দ্রুত প্রয়োগ করুন।',
    },
  },
  {
    id: 'pyrexia_fever',
    conditionName: 'Acute Febrile Episode / Pyrexia of Unknown Origin / Dengue Warning',
    category: 'Infectious & General',
    keywords: [
      'fever', 'headache', 'body ache', 'pain', 'paracetamol', 'pcm', 'temperature', 'dengue fever', 'myalgia',
      'बुखार', 'सिरदर्द', 'दर्द', 'पैरासिटामोल', 'ताप', 'बदन दर्द',
      'ताप', 'डोकेदुखी', 'अंगदुखी', 'पॅरासिटामॉल',
      'জ্বর', 'মাথাব্যথা', 'প্যারাসিটামল', 'গা হাত পা ব্যথা'
    ],
    primarySkuCode: 'PCM-500',
    primarySkuName: 'Paracetamol Tablets 500mg',
    defaultQty: 50,
    urgencyLevel: 'routine',
    clinicalSummary: {
      en: 'Administer Paracetamol 500mg for antipyresis and pain relief. Strictly avoid Aspirin / Ibuprofen (NSAIDs) if Dengue or bleeding risk is suspected.',
      hi: 'बुखार एवं शरीर दर्द कम करने हेतु पैरासिटामोल 500mg दें। डेंगू की आशंका में NSAIDs (आईबुप्रोफेन) न दें।',
      mr: 'ताप व अंगदुखीसाठी पॅरासिटामॉल ५०० मि.ग्रॅ. द्या. डेंग्यू संशय असल्यास ब्रुफेन टाळा.',
      bn: 'জ্বর ও ব্যথার জন্য প্যারাসিটামল ৫০০ মিগ্রা দিন। ডেঙ্গু হলে ব্রুফেন জাতীয় ওষুধ এড়িয়ে চলুন।',
    },
  },
];

/**
 * Intelligent Clinical Voice and Text Intent Parser
 * Accurately extracts action (ADD, DEDUCT), matching disease / SKU, quantity, and facility
 */
export function parseClinicalIntent(
  rawTranscript: string,
  preferredLang: 'en' | 'hi' | 'mr' | 'bn' = 'en'
): {
  matchedCondition: ClinicalConditionMapping;
  action: 'ADD_STOCK' | 'DEDUCT_STOCK' | 'CLINICAL_DISPENSE';
  facilityId: string;
  facilityName: string;
  skuCode: string;
  skuName: string;
  deltaQty: number;
  confidence: number;
} {
  const lower = rawTranscript.toLowerCase();

  // 1. Detect Action
  let action: 'ADD_STOCK' | 'DEDUCT_STOCK' | 'CLINICAL_DISPENSE' = 'ADD_STOCK';
  if (
    lower.includes('deduct') ||
    lower.includes('dispense') ||
    lower.includes('use') ||
    lower.includes('patient') ||
    lower.includes('administered') ||
    lower.includes('gave') ||
    lower.includes('घटाएं') ||
    lower.includes('दिया') ||
    lower.includes('कमी') ||
    lower.includes('दिले') ||
    lower.includes('বিয়োগ') ||
    lower.includes('দেওয়া হয়েছে')
  ) {
    action = lower.includes('patient') || lower.includes('bite') || lower.includes('fever') || lower.includes('disease')
      ? 'CLINICAL_DISPENSE'
      : 'DEDUCT_STOCK';
  }

  // 2. Detect Facility
  let facilityId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  let facilityName = 'Shirur PHC (Pune Rural)';
  if (lower.includes('manchar') || lower.includes('मंचर') || lower.includes('মাঞ্চার')) {
    facilityId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    facilityName = 'Manchar CHC (Pune Rural)';
  } else if (lower.includes('baramati') || lower.includes('बारामती') || lower.includes('বারামতি')) {
    facilityId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
    facilityName = 'Baramati Sub-District Hospital';
  } else if (lower.includes('talegaon') || lower.includes('तलेगांव') || lower.includes('তালেগাঁও')) {
    facilityId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    facilityName = 'Talegaon Dabhade PHC';
  }

  // 3. Match Clinical Condition or Specific Medicine
  let bestMatch: ClinicalConditionMapping | null = null;
  let highestScore = 0;

  for (const condition of CLINICAL_DISEASE_REGISTRY) {
    let score = 0;
    for (const kw of condition.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        score += kw.length; // weight longer keyword matches higher
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = condition;
    }
  }

  // If no specific match, default to General Febrile / Routine, but alert user
  if (!bestMatch) {
    bestMatch = CLINICAL_DISEASE_REGISTRY.find((c) => c.id === 'pyrexia_fever')!;
  }

  // 4. Extract numerical quantity
  let deltaQty = bestMatch.defaultQty;
  const numMatch = rawTranscript.match(/\d+/);
  if (numMatch) {
    const parsedNum = parseInt(numMatch[0], 10);
    if (parsedNum > 0) {
      deltaQty = parsedNum;
    }
  }

  if (action === 'DEDUCT_STOCK' || action === 'CLINICAL_DISPENSE') {
    deltaQty = -Math.abs(deltaQty);
  }

  return {
    matchedCondition: bestMatch,
    action,
    facilityId,
    facilityName,
    skuCode: bestMatch.primarySkuCode,
    skuName: bestMatch.primarySkuName,
    deltaQty,
    confidence: highestScore > 0 ? 0.96 : 0.75,
  };
}

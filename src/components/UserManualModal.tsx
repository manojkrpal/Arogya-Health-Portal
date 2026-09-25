import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Search,
  ExternalLink,
  X,
  CheckCircle2,
  MapPin,
  Package,
  Mic,
  Camera,
  Activity,
  Truck,
  Thermometer,
  ShieldCheck,
  WifiOff,
  Layers,
  HelpCircle,
  BookOpen,
  Sparkles,
} from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'guide' | 'pdf' | 'roles' | 'faq';

export const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'nurse' | 'officer' | 'warroom'>('all');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Reliable Blob-based download handler (bypasses iframe sandbox restrictions)
  const handleDownloadPdf = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const response = await fetch('/api/manual/download');
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ArogyaNet_User_Manual.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.warn('Direct blob download failed, falling back to direct navigation:', err);
      // Fallback
      window.open('/ArogyaNet_User_Manual.pdf?download=true', '_blank');
      setDownloadError('If download did not start automatically, please use the Embedded PDF view or right-click to save.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const manualSections = [
    {
      id: 'gis-map',
      title: '1. GIS Google Map & Facility Status',
      category: 'officer',
      icon: MapPin,
      purpose: 'Provide live situational awareness of all Primary Health Centres (PHCs), Community Health Centres (CHCs), and Sub-District Hospitals across the district via Google Maps.',
      howToUse: [
        'Open the "District Map" tab from the bottom navigation or logo.',
        'View Google Maps color-coded facility pins: Green (Adequate Stock >14 days), Yellow (Low Stock 7-14 days), Red (Critical Stockout Risk <7 days).',
        'Click on any facility pin to open the InfoWindow and Slide-over Facility Drawer.',
        'Inspect bed occupancy (General, ICU, Oxygen beds), on-duty staff telemetry, and low-stock SKU count in real-time.',
      ],
      example: 'District Health Officer sees an orange beacon at "Kadegaon PHC". Clicking it reveals Paracetamol is down to 2 days of supply. The officer immediately clicks "Propose Transfer" to solve the shortage.',
      tips: 'Use the facility search bar to quickly jump to any PHC by name or block, or toggle between Google Map and Schematic Grid.',
    },
    {
      id: 'nurse-console',
      title: '2. Nurse Rapid Ward & Stock Console',
      category: 'nurse',
      icon: Package,
      purpose: 'Enable fast-paced clinical staff and nurses to record medicine dispenses and receipts with 1-tap touch steppers without slow form typing.',
      howToUse: [
        'Switch to "PHC Ward Console" or click "Facility" in the navigation.',
        'Locate the medicine (e.g., ORS, Paracetamol, Amoxicillin, Anti-Snake Venom).',
        'Tap "+" to record newly received boxes or "-" to record dispensed items.',
        'View batch numbers, expiry countdowns, and current days of supply automatically updating.',
      ],
      example: 'A nurse dispenses 5 vials of Rabies Vaccine. She taps "-5" on the touch stepper. The stock counter instantly drops from 25 to 20, and the days-cover indicator updates in the audit trail.',
      tips: 'Touch steppers feature tactile haptic feedback on mobile screens for rapid dispensing during busy morning outpatient clinics.',
    },
    {
      id: 'voice-assistant',
      title: '3. Multilingual Voice Nurse Assistant',
      category: 'nurse',
      icon: Mic,
      purpose: 'Allow nurses wearing gloves or carrying equipment in rural sub-centres to dictate inventory updates hands-free in their native regional language.',
      howToUse: [
        'Click the "Voice Assistant" (Microphone) button in the top navbar or ward console.',
        'Select your preferred language (English, हिन्दी / Hindi, मराठी / Marathi, বাংলা / Bengali).',
        'Click "Start Listening" and speak naturally (e.g., "पाँच वाइल रेबीज वैक्सीन इस्तेमाल हुई" or "Dispensed 10 vials of Rabies Vaccine").',
        'Review the Gemini AI transcription and entity extraction, then tap "Confirm Update".',
      ],
      example: 'Nurse speaks: "Recorded receipt of 50 packets of ORS batch B44". Gemini parses SKU: ORS, Qty: +50, Batch: B44, and executes the inventory transaction in one step.',
      tips: 'Works with both Indian regional accents and medical terminology.',
    },
    {
      id: 'shelf-scanner',
      title: '4. Multimodal Shelf Camera & OCR Scanner',
      category: 'nurse',
      icon: Camera,
      purpose: 'Automate physical inventory audits by snapping a smartphone photo of medicine shelves or cartons instead of manual counting.',
      howToUse: [
        'In the Ward Console, click "Scan Shelf / Camera".',
        'Take a clear photograph of medicine boxes or upload an image file.',
        'Gemini Vision analyzes the image, identifies drug names, counts packaging units, and extracts expiry dates and batch codes.',
        'Review the extracted inventory and tap "Apply to Stock".',
      ],
      example: 'Photographing a carton of Paracetamol 500mg automatically detects: "Paracetamol 500mg, 10 strips, Batch #PCM-2026, Exp: 12/2027", auto-populating the digital register.',
      tips: 'Ensure adequate lighting and capture the printed barcode/batch label for highest OCR precision.',
    },
    {
      id: 'surge-engine',
      title: '5. 7-Day Stockout Risk Prediction & Outbreak Surge Engine',
      category: 'officer',
      icon: Activity,
      purpose: 'Predict medicine stockouts up to 7 days in advance using historical burn-rates combined with epidemic outbreak multipliers (e.g., Monsoon Flood, Dengue spike, Cholera).',
      howToUse: [
        'Navigate to the "Alerts" tab.',
        'View categorized alerts: Critical (<3 days cover), Warning (3-7 days cover), and Expiring Batches (<60 days).',
        'Use the "Outbreak Surge Multiplier" controls (1.0x to 3.0x) to simulate epidemic demand spikes.',
        'Observe how stockout predictions adapt dynamically to surge scenarios.',
      ],
      example: 'During monsoon flood season, the Block Medical Officer activates the "Monsoon Waterborne Outbreak (2.5x)" preset. ORS and IV Saline stockout warnings trigger 4 days earlier, allowing timely restocking.',
      tips: 'Alerts include 1-click "Propose Transfer" buttons to immediately route surplus stock from neighboring facilities.',
    },
    {
      id: 'transfers-logistics',
      title: '6. Deterministic Transfer Optimization & Drone/Van Dispatch',
      category: 'officer',
      icon: Truck,
      purpose: 'Facilitate peer-to-peer redistribution between nearby health centres with surplus stock, eliminating artificial shortages without waiting for central procurement cycles.',
      howToUse: [
        'Go to the "Transfers" tab.',
        'Click "New Transfer Request" or click "Propose Transfer" directly from any stockout alert.',
        'The algorithmic optimizer identifies the nearest donor facility with excess stock (>30 days cover).',
        'Select the transit modality: Electric Logistics Van (ground) or Autonomous Medical Drone (high-urgency cold chain).',
        'Review transit duration, distance, and temperature safety, then click "Authorize Transfer".',
      ],
      example: 'Vita PHC is depleted of Anti-Snake Venom (0 vials). Karad SDH has 65 surplus vials. ArogyaNet calculates a 28 km transit route and dispatches a drone courier arriving in 32 minutes.',
      tips: 'Both sender and recipient facilities can track real-time dispatch and arrival status.',
    },
    {
      id: 'cold-chain',
      title: '7. Cold-Chain IoT Radar & Temperature Telemetry',
      category: 'nurse',
      icon: Thermometer,
      purpose: 'Protect temperature-sensitive vaccines (Covaxin, Measles, Rotavirus) and anti-venoms with continuous 2°C to 8°C IoT sensor monitoring.',
      howToUse: [
        'Open the "Cold Chain" sub-tab under Transfers or in the Facility Drawer.',
        'Inspect live thermometer gauges for primary and auxiliary ILRs (Ice-Lined Refrigerators).',
        'If a temperature breaches safe limits (>8°C or <2°C), an audible and visual breach alarm is triggered.',
        'Follow prompt instructions to initiate an emergency vaccine rescue transfer.',
      ],
      example: 'A power outage causes Refrigerator Unit #2 at Shirala PHC to reach 9.4°C. An alarm alerts the cold-chain handler, who transfers the 120 vaccine vials to an auxiliary solar icebox before spoilage occurs.',
      tips: 'Historical 24-hour temperature trends are recorded for compliance audits.',
    },
    {
      id: 'national-grid',
      title: '8. National Health Grid & Purchase Orders (POs)',
      category: 'warroom',
      icon: Layers,
      purpose: 'Empower National Command (War Room) and District Health Officers to oversee inter-district supply pipelines and manage bulk vendor Purchase Orders.',
      howToUse: [
        'Switch to "National War Room" or "District Officer" role.',
        'Access the "National Grid" and "Purchase Orders" tabs.',
        'Review district-wide inventory reserves, pipeline replenishment orders, and supplier delivery lead-times.',
        'Draft and approve new bulk purchase orders with 1-click.',
      ],
      example: 'National War Room Commander reviews Pune District and spots impending district-wide Amoxicillin shortages. They issue Purchase Order #PO-9042 for 15,000 units directly to the central medical distributor.',
      tips: 'Integrates with national supply chain systems for seamless consignment tracking.',
    },
    {
      id: 'gemini-advisory',
      title: '9. Gemini Clinical & Logistics Advisory',
      category: 'officer',
      icon: Sparkles,
      purpose: 'Generate instant clinical justification briefs, treatment guidelines, and supply prioritization rationales powered by Google Gemini.',
      howToUse: [
        'Click the "AI Advisory" or "Clinical Advisory" button on any Alert card or Stock overview.',
        'Review the AI-generated assessment detailing epidemic epidemiology, clinical protocol (e.g., WHO / MoHFW guidelines), and supply recommendations.',
        'Copy or print the clinical justification to accompany emergency stock reallocation requisitions.',
      ],
      example: 'During an unexpected spike in canine bites, the AI Advisory provides the exact Rabies Post-Exposure Prophylaxis dosage regimen alongside immediate redistribution directives.',
      tips: 'Advisory outputs are available in English, Hindi, Marathi, and Bengali.',
    },
    {
      id: 'offline-sync',
      title: '10. Zero-PHI Audit Ledger & Offline Operation',
      category: 'nurse',
      icon: WifiOff,
      purpose: 'Guarantee uninterrupted operation in remote rural clinics without cellular reception, ensuring zero patient data leakage while keeping an immutable ledger.',
      howToUse: [
        'When cellular or Wi-Fi drops, ArogyaNet switches seamlessly to "Offline Mode" (red network badge in header).',
        'Staff can continue dispensing, receiving, and auditing stock without interruption.',
        'All transactions are queued locally in browser IndexedDB/LocalStorage.',
        'Once network connectivity returns, queued transactions auto-sync back to the central Cloud SQL / Firestore database.',
      ],
      example: 'A monsoon thunderstorm knocks out rural telecom towers at Shirala PHC for 4 hours. The nurse logs 14 patient dispensations locally. When connectivity recovers at 3 PM, all 14 records sync without any loss.',
      tips: 'No Patient Identifiable Information (PHI) is ever transmitted; all tracking uses strictly anonymized SKU and ward identifiers.',
    },
  ];

  const filteredSections = manualSections.filter((sec) => {
    const matchesSearch =
      sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.example.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.howToUse.some((step) => step.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole =
      selectedRole === 'all' ||
      (selectedRole === 'nurse' && (sec.category === 'nurse' || sec.id === 'offline-sync')) ||
      (selectedRole === 'officer' && (sec.category === 'officer' || sec.id === 'gis-map' || sec.id === 'surge-engine')) ||
      (selectedRole === 'warroom' && (sec.category === 'warroom' || sec.id === 'transfers-logistics' || sec.id === 'national-grid'));

    return matchesSearch && matchesRole;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="bg-slate-800/90 border-b border-slate-700 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                  ArogyaNet — Official User Manual & Field Guide
                </h2>
                <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-medium">
                  v2.4 Production Edition
                </span>
              </div>
              <p className="text-xs text-slate-400">
                MoHFW / National Health Mission Logistics & PHC Clinical Operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50 cursor-pointer"
              title="Download official PDF copy"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Downloading...' : 'Download PDF'}</span>
            </button>

            {/* Print / Save to PDF */}
            <button
              onClick={handlePrint}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium border border-slate-600 transition cursor-pointer"
              title="Print field guide or save as PDF via system print dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title="Close Manual"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300 flex items-center justify-between gap-2">
            <span>{downloadError}</span>
            <a
              href="/ArogyaNet_User_Manual.pdf?download=true"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-bold text-amber-200 hover:text-white"
            >
              Open Direct PDF Link
            </a>
          </div>
        )}

        {/* Tab Switcher & Search Bar */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'guide'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Interactive Guide</span>
            </button>
            <button
              onClick={() => setActiveTab('pdf')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'pdf'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Embedded PDF View</span>
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'roles'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Role Quickstart</span>
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                activeTab === 'faq'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FAQs & Offline</span>
            </button>
          </div>

          {/* Quick Search */}
          {activeTab === 'guide' && (
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search features, drugs, steps..."
                className="w-full bg-slate-950 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: INTERACTIVE GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-6">
              {/* Role filter bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider shrink-0">
                  Filter by Role:
                </span>
                {(
                  [
                    { id: 'all', label: 'All Features (10)' },
                    { id: 'nurse', label: 'PHC Staff & Nurses' },
                    { id: 'officer', label: 'Medical & District Officers' },
                    { id: 'warroom', label: 'National War Room (MoHFW)' },
                  ] as const
                ).map((role) => (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition cursor-pointer shrink-0 ${
                      selectedRole === role.id
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>

              {/* Guide Cards */}
              <div className="space-y-5">
                {filteredSections.map((sec) => {
                  const Icon = sec.icon;
                  return (
                    <div
                      key={sec.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 sm:p-5 hover:border-slate-700 transition shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-slate-100">
                              {sec.title}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              <span className="text-teal-400 font-medium">Purpose: </span>
                              {sec.purpose}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Step-by-Step Usage */}
                      <div className="bg-slate-900/90 rounded-lg p-3.5 border border-slate-800 space-y-2">
                        <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                          <span>How to Use:</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-300 pl-1">
                          {sec.howToUse.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-slate-800 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Real Example & Pro Tip */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="bg-sky-950/30 border border-sky-800/40 rounded-lg p-3 text-sky-200">
                          <strong className="block text-sky-400 font-semibold mb-1 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5" />
                            Clinical / Field Example:
                          </strong>
                          {sec.example}
                        </div>
                        <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-3 text-emerald-200">
                          <strong className="block text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Pro Tip:
                          </strong>
                          {sec.tips}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredSections.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-sm">No manual sections matched your search "{searchQuery}".</p>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedRole('all');
                      }}
                      className="mt-2 text-xs text-teal-400 underline"
                    >
                      Reset filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EMBEDDED PDF VIEWER */}
          {activeTab === 'pdf' && (
            <div className="space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between bg-slate-850 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teal-400" />
                  <span>Viewing official document: <strong>ArogyaNet_User_Manual.pdf</strong></span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-white font-medium cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download File</span>
                  </button>
                  <a
                    href="/ArogyaNet_User_Manual.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open in Full Tab</span>
                  </a>
                </div>
              </div>

              {/* Embedded PDF iframe / object container */}
              <div className="w-full h-[620px] rounded-xl border border-slate-700 overflow-hidden bg-slate-950 relative">
                <object
                  data="/ArogyaNet_User_Manual.pdf"
                  type="application/pdf"
                  className="w-full h-full"
                >
                  <iframe
                    src="/ArogyaNet_User_Manual.pdf"
                    title="ArogyaNet Official User Manual"
                    className="w-full h-full border-0"
                  >
                    <div className="p-8 text-center text-slate-400 space-y-4">
                      <p>Your browser does not support inline PDF rendering.</p>
                      <button
                        onClick={handleDownloadPdf}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold"
                      >
                        Download PDF Manual Directly
                      </button>
                    </div>
                  </iframe>
                </object>
              </div>
            </div>
          )}

          {/* TAB 3: ROLE QUICKSTART */}
          {activeTab === 'roles' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Persona-Based Operational Workflows
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. PHC Nurse */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                    <Package className="w-4 h-4" />
                    <span>PHC Nurse / Dispenser Workflow</span>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                    <li>Log in or switch role to <strong>PHC Nurse</strong> (Kadegaon PHC).</li>
                    <li>Open <strong>PHC Ward Console</strong> at the start of your shift.</li>
                    <li>Use <strong>Touch Steppers</strong> (+ / -) to record daily medicine distributions.</li>
                    <li>For hands-free operation, tap <strong>Voice Assistant</strong> and dictate in Hindi, Marathi, Bengali, or English.</li>
                    <li>Check the <strong>Cold Chain</strong> gauge to verify vaccine refrigerator is between 2°C - 8°C.</li>
                  </ol>
                </div>

                {/* 2. Block Medical Officer */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                    <Activity className="w-4 h-4" />
                    <span>Block Medical Officer (BMO) Workflow</span>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                    <li>Check the <strong>Alerts</strong> tab every morning for critical stockouts.</li>
                    <li>Review 7-day risk forecasts for Anti-Snake Venom, Rabies, and Antibiotics.</li>
                    <li>Click <strong>Propose Transfer</strong> on any red alert to route surplus from a neighboring PHC.</li>
                    <li>Click <strong>AI Advisory</strong> for clinical justification summaries.</li>
                  </ol>
                </div>

                {/* 3. District Health Officer */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <MapPin className="w-4 h-4" />
                    <span>District Health Officer (DHO) Workflow</span>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                    <li>Open <strong>District Map</strong> to visualize geographic stock distribution.</li>
                    <li>Apply <strong>Epidemic Surge Multipliers</strong> (e.g. 2.0x for Monsoon Floods).</li>
                    <li>Authorize Inter-Facility <strong>Medical Drone Courier</strong> flights for high-urgency drugs.</li>
                    <li>Inspect bed capacity and oxygen cylinder reserves.</li>
                  </ol>
                </div>

                {/* 4. National Command / War Room */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                    <Layers className="w-4 h-4" />
                    <span>National Command / War Room (MoHFW) Workflow</span>
                  </div>
                  <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4">
                    <li>Monitor <strong>National Health Grid</strong> for macro supply imbalances across districts.</li>
                    <li>Issue and authorize central <strong>Purchase Orders (POs)</strong> for medical supplier replenishments.</li>
                    <li>Inspect cryptographic Zero-PHI audit logs for National Health Mission compliance.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FAQS & OFFLINE GUIDE */}
          {activeTab === 'faq' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Frequently Asked Questions & Field Troubleshooting
              </h3>

              <div className="space-y-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-teal-300 flex items-center gap-2">
                    <WifiOff className="w-4 h-4" />
                    What happens if cellular connectivity or power fails at a remote PHC?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    ArogyaNet is engineered with an <strong>Offline-First Architecture</strong>. When connectivity is interrupted, an orange "Offline Mode" badge displays in the header. Staff can freely continue updating stock counts, recording dispenses, and checking expiry logs. Changes are stored locally in secure browser storage and will automatically synchronize with the central database the moment connection is restored.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-teal-300 flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    How are drone transfers dispatched and authorized?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    When an urgent emergency transfer is authorized (such as anti-venom or blood components), select "Autonomous Medical Drone" as the transit modality. The algorithm verifies payload weight (&lt;5kg), battery endurance, and coordinates with the donor facility's rooftop launch pad. A real-time ETA countdown is broadcast to both facilities.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-teal-300 flex items-center gap-2">
                    <Thermometer className="w-4 h-4" />
                    What should I do if a cold-chain alarm triggers?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    If cold-room sensors detect temperatures exceeding 8°C or dropping below 2°C for longer than 15 minutes, inspect the refrigerator door seal and backup generator power. If temperature cannot be restored within 30 minutes, open the Transfers tab and initiate an Emergency Cold-Chain Evacuation transfer to move vaccines into an auxiliary validated cool box.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <h4 className="text-xs font-bold text-teal-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Is patient confidential health information (PHI) stored?
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    No. ArogyaNet is strictly a <strong>Zero-PHI Supply and Operational Visibility Grid</strong>. Only aggregate SKU counts, anonymized batch numbers, bed occupancy, and facility telemetry are recorded. No patient names, phone numbers, or clinical diagnoses are ever ingested or stored.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-850 border-t border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>ArogyaNet Health Grid System v2.4</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPdf}
              className="text-teal-400 hover:text-teal-300 font-medium underline flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3" />
              Direct PDF Download
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium transition cursor-pointer"
            >
              Close Manual
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

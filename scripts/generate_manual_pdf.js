import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Output path
const outputPath = path.resolve(process.cwd(), 'public', 'ArogyaNet_User_Manual.pdf');

// Create document with margins
const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  bufferPages: true,
  info: {
    Title: 'ArogyaNet Health Grid - Official User Manual',
    Author: 'National Health Mission / ArogyaNet Team',
    Subject: 'Comprehensive User Guide for ArogyaNet Health Platform',
    Keywords: 'ArogyaNet, User Manual, PHC, Healthcare, Logistics, Gemini, Cold Chain',
  }
});

const writeStream = fs.createWriteStream(outputPath);
doc.pipe(writeStream);

// Theme Colors
const PRIMARY = '#0F766E';    // Deep Teal
const SECONDARY = '#0369A1';  // Ocean Blue
const DARK = '#0F172A';       // Slate 900
const TEXT_MUTED = '#475569'; // Slate 600
const BG_LIGHT = '#F8FAFC';   // Slate 50
const ACCENT_RED = '#DC2626'; // Alert Red
const ACCENT_GREEN = '#16A34A';// Success Green
const BORDER_COLOR = '#CBD5E1';

function drawHeader(title) {
  doc.save();
  doc.rect(50, 25, 495, 20).fill('#F1F5F9');
  doc.fontSize(8).fillColor(TEXT_MUTED).font('Helvetica-Bold')
     .text('AROGYANET HEALTH GRID — OFFICIAL FIELD USER MANUAL', 55, 31, { width: 350 });
  doc.fontSize(8).font('Helvetica')
     .text('MOHFW / NHM LOGISTICS', 400, 31, { width: 140, align: 'right' });
  doc.restore();
}

function checkPageSpace(requiredSpace = 120) {
  if (doc.y + requiredSpace > 780) {
    doc.addPage();
  }
}

// ==========================================
// COVER / TITLE SECTION
// ==========================================

// Top Accent Banner
doc.rect(50, 50, 495, 110).fill(PRIMARY);

doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24)
   .text('ArogyaNet Health Grid', 70, 68);

doc.font('Helvetica').fontSize(13)
   .fillColor('#CCFBF1')
   .text('National PHC Medicine, Bed & Staff Attendance Visibility System', 70, 96);

doc.fontSize(9.5).fillColor('#E6FFFA')
   .text('Comprehensive Operational Field Manual • Version 2.4 • September 2026', 70, 122);

doc.moveDown(3);
doc.y = 175;

// Executive Summary Box
doc.rect(50, doc.y, 495, 80).fillAndStroke('#F0FDFA', '#99F6E4');
doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(11)
   .text('DOCUMENT OVERVIEW & PURPOSE', 65, doc.y + 12);
doc.fillColor(DARK).font('Helvetica').fontSize(9)
   .text(
     'This manual provides a practical, role-by-role guide to using ArogyaNet. ArogyaNet connects Primary Health Centres (PHCs), Community Health Centres (CHCs), and District Hospitals to eliminate critical medicine stockouts, maintain vaccine cold-chain integrity, optimize bed occupancy, and enable sovereign cross-border federation.',
     65, doc.y + 26, { width: 465, lineGap: 3 }
   );

doc.y = 270;

// Table of Contents Box
doc.rect(50, doc.y, 495, 125).fillAndStroke(BG_LIGHT, BORDER_COLOR);
doc.fillColor(DARK).font('Helvetica-Bold').fontSize(11).text('TABLE OF CONTENTS', 65, doc.y + 10);

const tocItems = [
  '1. User Roles & Login Access (Persona Switching)',
  '2. Interactive GIS Map View & Facility Pins',
  '3. Facility Live Detail Drawer & Bed Metrics',
  '4. PHC Nurse Rapid Facility Management (Touch Steppers)',
  '5. Real-Time Cold-Chain IoT Telemetry (2°C - 8°C Alerts)',
  '6. 7-Day Stockout Risk Prediction & Predictive Alerts',
  '7. Gemini AI Logistics Advisory (Bilingual EN/HI)',
  '8. Inter-Facility Stock Transfers (Atomic Approvals)',
  '9. National War Room Grid & Outbreak Surge Simulator',
  '10. Sovereign BRICS Federation & Privacy Invariants',
  '11. Multimodal Clinical Triage & Voice Nurse Assistant',
  '12. System Audit Trail & Offline Operation'
];

let tocY = doc.y + 26;
for (let i = 0; i < tocItems.length; i++) {
  const colX = i < 6 ? 65 : 300;
  const itemY = tocY + (i % 6) * 15;
  doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5).text(tocItems[i], colX, itemY);
}

doc.y = 410;

// Section: Roles Table
doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(13)
   .text('1. USER ROLES & DEMO CREDENTIALS');
doc.rect(50, doc.y + 2, 495, 2).fill(PRIMARY);
doc.moveDown(0.6);

doc.font('Helvetica').fontSize(9).fillColor(DARK)
   .text('ArogyaNet implements strict Role-Based Access Control (RBAC). Use the top-bar Role Switcher to toggle instantly between personas:');
doc.moveDown(0.5);

// Roles Table Header
const roleTableTop = doc.y;
doc.rect(50, roleTableTop, 495, 18).fill('#0F766E');
doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(8.5);
doc.text('ROLE / PERSONA', 55, roleTableTop + 5);
doc.text('DEFAULT SCOPE', 170, roleTableTop + 5);
doc.text('PRIMARY RESPONSIBILITIES', 280, roleTableTop + 5);
doc.text('DEMO LOGIN', 440, roleTableTop + 5);

const rolesData = [
  ['PHC Nurse', 'Shirur PHC (Local)', 'Update stock, bed occupancy, check-in staff, cold-chain checks', 'nurse123'],
  ['District Officer', 'Pune District (4 facilities)', 'Approve transfers, monitor 7-day alerts, review Gemini advisory', 'officer123'],
  ['National War Room', 'National (All India)', 'Simulate outbreak surges, allocate central drug buffers, triage', 'warroom123'],
  ['BRICS Analyst', 'Federation Node', 'Review cross-border demand indices; ZERO PHI or raw stock visible', 'brics123']
];

let curY = roleTableTop + 18;
rolesData.forEach((row, idx) => {
  const rowHeight = 24;
  doc.rect(50, curY, 495, rowHeight).fill(idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF');
  doc.rect(50, curY, 495, rowHeight).stroke(BORDER_COLOR);
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8).text(row[0], 55, curY + 6, { width: 110 });
  doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_MUTED).text(row[1], 170, curY + 6, { width: 105 });
  doc.text(row[2], 280, curY + 6, { width: 155 });
  doc.font('Helvetica-Bold').fillColor(SECONDARY).text(row[3], 440, curY + 6, { width: 100 });
  curY += rowHeight;
});

doc.y = curY + 15;

// ==========================================
// FEATURE 1 & 2
// ==========================================
function renderFeatureSection(title, purpose, howToUse, example) {
  checkPageSpace(150);

  // Feature Title
  doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(11).text(title);
  doc.rect(50, doc.y + 2, 495, 1.5).fill(PRIMARY);
  doc.moveDown(0.4);

  // Purpose
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8.5).text('Purpose: ', { continued: true });
  doc.font('Helvetica').fillColor(DARK).text(purpose);
  doc.moveDown(0.3);

  // How to Use
  doc.fillColor(SECONDARY).font('Helvetica-Bold').fontSize(8.5).text('How to Use:');
  howToUse.forEach((step, idx) => {
    doc.fillColor(DARK).font('Helvetica').fontSize(8)
       .text(`  • Step ${idx + 1}: ${step}`, { lineGap: 2 });
  });
  doc.moveDown(0.3);

  // Example Box
  const boxTop = doc.y;
  doc.rect(50, boxTop, 495, 34).fillAndStroke('#FEFCE8', '#FEF08A');
  doc.fillColor('#854D0E').font('Helvetica-Bold').fontSize(8)
     .text('Practical Example: ', 58, boxTop + 6, { continued: true });
  doc.font('Helvetica').fillColor('#713F12').fontSize(7.8)
     .text(example, { width: 420, lineGap: 1.5 });
  
  doc.y = boxTop + 42;
  doc.moveDown(0.4);
}

renderFeatureSection(
  '2. INTERACTIVE GIS MAP VIEW & FACILITY PINS',
  'Provides real-time spatial awareness of all clinics in the district or state, displaying live operational status, active stockout risks, and cold-chain health at a glance.',
  [
    'Navigate to the "Map" tab from the bottom or top navigation bar.',
    'Observe the color-coded pins: Green (Normal), Amber (Cover < 7 Days), Red (Critical Stockout Risk / Temperature Breach).',
    'Click on any facility pin (e.g., Shirur PHC) to open its comprehensive operational drawer and inspect real-time metrics.'
  ],
  'When viewing Pune District during a monsoon wave, Shirur PHC pulses with an amber halo indicating Oral Rehydration Salts (ORS) will run out in 3.4 days.'
);

renderFeatureSection(
  '3. FACILITY LIVE DETAIL DRAWER & BED METRICS',
  'Allows district and state administrators to inspect granular facility capacity, bed occupancy, doctor/nurse on-duty headcounts, and critical inventory batches without interrupting field staff.',
  [
    'Click on any facility card or map pin to trigger the slide-over drawer.',
    'Review key tiles: Available Beds (e.g., 6/8 occupied), On-Duty Staff (e.g., 2 nurses), and Emergency Backup Power.',
    'Scroll down to the "Stock Inventory" list to see exact physical units on hand and lot expiry dates.',
    'Click "Initiate Transfer" directly from the drawer to address any identified deficit.'
  ],
  'A District Health Officer reviewing Haveli Sub-District Hospital sees 14 of 16 maternity beds occupied and immediately flags the neighboring PHC to prepare overflow cots.'
);

renderFeatureSection(
  '4. PHC NURSE RAPID FACILITY MANAGEMENT',
  'Empowers rural nurses to update stock numbers, bed count, and staff attendance in under 30 seconds using large, touch-friendly steppers engineered for glove-wearing and low-connectivity environments.',
  [
    'Switch role to "PHC Nurse" (automatically opens "My Facility" tab).',
    'Tap the large "+" or "–" stepper buttons on any medicine card (e.g. Paracetamol, Amoxicillin, ORS) to record daily dispensations.',
    'Update bed counts using the Bed Occupancy stepper.',
    'Changes auto-save immediately to the database with optimistic UI updates and local caching.'
  ],
  'Nurse Sunita at Shirur PHC dispenses 15 strips of Paracetamol during morning OPD. She taps "–" three times (x5 multiplier) on her phone; inventory updates instantly from 140 to 125 units without filling out paper registers.'
);

renderFeatureSection(
  '5. REAL-TIME COLD-CHAIN IoT TELEMETRY (2°C - 8°C)',
  'Maintains strict temperature surveillance over ILR (Ice-Lined Refrigerator) units storing life-saving vaccines and insulin, preventing spoiled batch administration and cold-chain excursions.',
  [
    'Open the "Cold-Chain IoT" tab (accessible to Nurses, District Officers, and Auditors).',
    'Review the live temperature gauge for each refrigerator unit (Safe zone: +2°C to +8°C).',
    'Inspect the 24-hour continuous sensor timeline graph to verify overnight power stability.',
    'If temperature spikes above 8°C, an immediate flashing banner warns staff and alerts district cold-chain logistics.'
  ],
  'During a rural power cut, Refrigerator #2 at Junnar PHC reaches 8.4°C. The system triggers a "Cold-Chain Breach Alert" and automatically disallows inter-facility dispatch of its DPT vaccines until inspected.'
);

renderFeatureSection(
  '6. 7-DAY PREDICTIVE STOCKOUT ALERTS (COVER_7D)',
  'Applies deterministic Poisson epidemiological demand models to forecast stockouts up to 7 days in advance, giving officers enough lead time to reallocate supplies before shelves go empty.',
  [
    'Click the "Alerts" tab from the bottom navigation (red badge indicates pending warnings).',
    'Inspect alerts categorized by severity: CRITICAL (Stockout < 3 days), WARNING (Cover < 7 days), and SURGE (Sudden demand jump).',
    'Each alert card shows Current Stock, 7-Day Predicted Demand, Days of Cover remaining, and Stockout Probability (%).',
    'Click "Gemini Advisory" to generate clinical logistics guidance, or "Propose Transfer" to solve the alert.'
  ],
  'Shirur PHC has 45 units of ORS with an average daily demand of 12 units. ArogyaNet calculates 3.75 days of cover (Stockout Probability: 78%) and flags a COVER_7D warning.'
);

renderFeatureSection(
  '7. GEMINI AI LOGISTICS ADVISORY (BILINGUAL EN/HI)',
  'Leverages Gemini AI to analyze stock deficits, geographic terrain, seasonal disease patterns, and clinical guidelines, providing clear decision-support recommendations in English and native Hindi.',
  [
    'On any active alert card, click the "Gemini Advisory (EN/HI)" button.',
    'Review the generated logistics commentary: Recommended Donor Facility, Safe Transfer Quantity, Clinical Priority, and Reasoning.',
    'Tap the "हिंदी में पढ़ें" tab to view the exact clinical advice translated into clean Devanagari Hindi for grassroots health workers.',
    'Click "Propose Transfer" to automatically transfer Gemini\'s recommended quantities into the transfer engine.'
  ],
  'Gemini analyzes Shirur PHC\'s ORS shortage: "Recommend transferring 60 units from Talegaon CHC (42 km away), which currently holds 18 days of buffer. This preserves 11 days at the donor while lifting Shirur to 8.7 days of safe coverage."'
);

renderFeatureSection(
  '8. INTER-FACILITY STOCK TRANSFERS & ATOMIC EXECUTION',
  'Enables verified human-in-the-loop stock rebalancing between government facilities while guaranteeing four non-negotiable safety rules: Donor Cover Retention, Cold-Chain Certification, FIFO Expiry, and Atomic Locking.',
  [
    'Navigate to the "Transfers" tab.',
    'Click "Propose New Transfer" or select an auto-recommended proposal generated from an alert.',
    'The deterministic optimizer selects the nearest donor facility that satisfies all 4 safety invariants.',
    'Review the transfer order details (From, To, SKU, Quantity, Transit Distance).',
    'Click "Approve & Execute Stock Transfer" (District Officer / State Admin only).',
    'The server runs an atomic PostgreSQL transaction (SELECT ... FOR UPDATE) to deduct FIFO lots and credit the recipient.'
  ],
  'Talegaon CHC sends 50 vials of Insulin to Shirur PHC. Lot #INS-2026-04 with earliest expiration date (Nov 2026) is automatically consumed first, avoiding waste and stock drift.'
);

renderFeatureSection(
  '9. NATIONAL WAR ROOM GRID & OUTBREAK SURGE SIMULATOR',
  'Provides national health leadership with a high-level situational dashboard and a what-if outbreak multiplier tool to simulate Dengue, Cholera, or Heatwave epidemics across multiple states.',
  [
    'Switch role to "National War Room" (opens "National Grid" view).',
    'Inspect national macro-metrics: Total Monitored Facilities, Critical Stockout Rate, Bed Utilization %, and Pending POs.',
    'In the "Outbreak Surge Simulator" card, select a scenario (e.g. "Dengue Surge 2.5x" or "Monsoon Diarrheal Outbreak 3.0x").',
    'Click "Apply Scenario": observe all downstream 7-day demand projections, alert counts, and deficit estimates recalculate instantly.'
  ],
  'A national planner selects "Flood/Monsoon Surge (3.0x ORS Demand)". Immediately, 18 additional PHCs across the river basin turn red on the national map, allowing preemptive dispatch of central buffer depots.'
);

renderFeatureSection(
  '10. SOVEREIGN BRICS FEDERATION & PRIVACY INVARIANTS',
  'Facilitates multilateral epidemiological intelligence exchange across BRICS partner nations while cryptographically enforcing that ZERO Protected Health Information (PHI) or raw inventory levels ever leave sovereign national borders.',
  [
    'Switch role to "BRICS Analyst" (role restricted to the "Federation" tab).',
    'Examine the anonymized BRICS Epidemiological Grid showing Regional Demand Index (0.0 - 1.0) and Categorical Surplus Bands (LOW / MEDIUM / HIGH).',
    'Click "Differential Privacy Model Card" to review Laplace noise calibration parameters and data provenance.',
    'Notice that all national tabs (Map, Stock, Nurse, Transfers) are strictly blocked with HTTP 403 Forbidden.'
  ],
  'An international epidemiologist queries the BRICS node: they can observe that Western India is in "High Demand" for antimalarials, but have zero access to patient records, facility names, or physical warehouse lot numbers.'
);

renderFeatureSection(
  '11. MULTIMODAL CLINICAL TRIAGE & VOICE NURSE ASSISTANT',
  'Provides rural health workers with AI-driven diagnostic assistance and hands-free voice data entry during sterile procedures or intense patient triage sessions.',
  [
    'In the PHC Nurse view, click "Multimodal Triage Assistant".',
    'Enter patient vital signs (SpO2, Pulse, Temp, BP) and primary symptoms, or upload a lesion/rash photo for triage categorization.',
    'Review the generated triaged risk score: Red (Immediate Hospital Referral), Yellow (Observation), Green (OPD Discharge).',
    'Click the Microphone icon ("Voice Nurse Assistant") to speak updates hands-free (e.g., "Add 10 bandages to stock, admit 1 bed").'
  ],
  'A nurse treating an emergency road trauma patient uses voice command: "Mark bed 4 occupied, request 2 units IV saline." The assistant logs the changes without requiring keyboard or touchscreen contact.'
);

renderFeatureSection(
  '12. SYSTEM AUDIT TRAIL, COMPLIANCE & OFFLINE RESILIENCE',
  'Maintains an immutable, tamper-evident audit ledger of every inventory adjustment, transfer authorization, and security event, alongside seamless offline synchronization for rural areas with intermittent connectivity.',
  [
    'Access the "Audit & Security" tab (Auditors and State Admins).',
    'Review the chronological log entries containing Timestamp, User ID, Role, Action Type, and Cryptographic Hash.',
    'Offline Capability: If internet cuts out, a yellow banner "Offline Mode — Changes Queued Locally" appears.',
    'Continue updating stock and beds; all changes are queued in browser IndexedDB/LocalStorage and auto-sync when connection restores.'
  ],
  'An auditor investigating an insulin transfer checks the audit log: "2026-09-25 14:22:01 — Officer Deshmukh approved Transfer #TR-8812 (50 vials) — Lot #INS-04 locked & dispatched".'
);

// ==========================================
// FAQ & TROUBLESHOOTING SECTION
// ==========================================
checkPageSpace(160);

doc.fillColor(PRIMARY).font('Helvetica-Bold').fontSize(11).text('13. FREQUENTLY ASKED QUESTIONS & TROUBLESHOOTING');
doc.rect(50, doc.y + 2, 495, 1.5).fill(PRIMARY);
doc.moveDown(0.4);

const faqs = [
  {
    q: 'Q: Why is my stock transfer request rejected or grayed out?',
    a: 'ArogyaNet enforces the Donor 7-Day Cover Protection Rule. If donating stock would leave the donor facility with less than 7 days of supply for its own patients, the system automatically blocks the transfer to prevent moving a crisis from one village to another.'
  },
  {
    q: 'Q: What happens if the cold chain temperature exceeds 8°C?',
    a: 'The unit enters "Breach Warning" state. Cold-sensitive vaccines (DPT, Measles, Insulin) at that facility are instantly locked from being transferred out until a biomedical technician certifies the lot.'
  },
  {
    q: 'Q: Can international users see our PHC patient data?',
    a: 'No. The BRICS Federation module strictly filters out facility names, patient data, and exact counts. Only mathematically fuzzed regional indices are exported, backed by strict PostgreSQL Row-Level Security.'
  },
  {
    q: 'Q: How do I switch languages in the Gemini Advisory?',
    a: 'Click on the "Gemini Advisory" button in any alert card. At the top of the advisory modal, click the "हिंदी में पढ़ें" tab to switch between English and Devanagari Hindi.'
  }
];

faqs.forEach(faq => {
  doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8.2).text(faq.q);
  doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8).text(faq.a, { lineGap: 1.5 });
  doc.moveDown(0.3);
});

// Add headers and footers to all pages
const totalPages = doc.bufferedPageRange().count;
for (let i = 0; i < totalPages; i++) {
  doc.switchToPage(i);
  
  // Header on pages after cover
  if (i > 0) {
    drawHeader();
  }

  // Footer on all pages
  doc.save();
  doc.rect(50, 800, 495, 0.5).fill('#CBD5E1');
  doc.fontSize(8).fillColor(TEXT_MUTED).font('Helvetica')
     .text('ArogyaNet Health Logistics Grid • Ministry of Health & Family Welfare', 50, 806, { width: 350 });
  doc.fontSize(8).font('Helvetica-Bold').fillColor(PRIMARY)
     .text(`Page ${i + 1} of ${totalPages}`, 420, 806, { width: 125, align: 'right' });
  doc.restore();
}

doc.end();

writeStream.on('finish', () => {
  console.log(`PDF successfully created at: ${outputPath} (${totalPages} pages)`);
});

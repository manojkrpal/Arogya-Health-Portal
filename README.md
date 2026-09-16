# ArogyaNet — National PHC Medicine, Bed & Attendance Visibility Grid

ArogyaNet is a production-grade hackathon MVP designed for national health administrators, district health officers, and Primary Health Centre (PHC) nurses across India. It couples real-time facility visibility, 7-day stockout risk prediction, bilingual Gemini advisory commentary (English & Hindi), human-in-the-loop inter-facility transfer orchestration, and a sovereign BRICS epidemiological federation standard that guarantees zero Protected Health Information (PHI) or raw inventory leaves national borders.

---

## 🏛️ System Architecture

- **Database Engine**: PostgreSQL 16 (Native embedded PGlite WASM engine for zero-config live preview & CI; standard PostgreSQL connection pool via `DATABASE_URL` for production).
- **Security & RLS**: PostgreSQL Row-Level Security (`FORCE ROW LEVEL SECURITY`) with `SET ROLE app_user` and `SET app.current_user_role` session variables. Defense-in-depth ensures even database owners cannot bypass tenant boundaries or privacy policies.
- **Backend**: Node 20 + TypeScript + Express. RESTful API under `/v1/*` with token authentication, route authorization, and transaction locking (`SELECT ... FOR UPDATE`).
- **AI / LLM**: Gemini 3.8 Flash (`@google/genai` SDK) running server-side with strict Zod schema parsing and graceful deterministic stub fallback.
- **Frontend**: React 19 + Vite + Tailwind CSS mobile-first interface (~390px baseline) with Leaflet OpenStreetMap tiles, high-contrast schematic fallback, touch steppers, and responsive desktop controls.
- **BRICS Federation**: Sovereign aggregated epidemiological indices only. Strictly blocks all non-federation routes with HTTP 403.

---

## 👥 Demo User Personas

ArogyaNet provides a 1-click **Role Switcher** in the header so reviewers can switch personas instantly:

| Persona | Role | Assigned Scope | Credentials |
| :--- | :--- | :--- | :--- |
| **PHC Nurse** | `phc_nurse` | Shirur PHC | `nurse@shirur.phc.gov.in` / `nurse123` |
| **District Officer** | `district_officer` | Pune District (all 4 clinics) | `officer@pune.health.gov.in` / `officer123` |
| **National War Room** | `national_war_room` | National Command (MoHFW) | `warroom@mohfw.gov.in` / `warroom123` |
| **BRICS Analyst** | `brics_analyst` | Federation ESS Node | `analyst@brics-health.org` / `brics123` |

---

## 🎬 3-Minute Live Hackathon Demo Script

### Step 1: Nurse Rapid Inventory Update (Mobile Perspective)
1. Switch role to **PHC Nurse** (`nurse@shirur.phc.gov.in`).
2. Notice the UI focuses directly on **Shirur PHC**.
3. Go to the **Stock** tab: adjust ORS or Paracetamol on hand using the large `+` / `-` touch steppers. Notice the instant PostgreSQL auto-save without complex forms.
4. Go to **Map**: click on Shirur PHC pin to view available beds (e.g. 6/8) and nurses on duty (2).

### Step 2: 7-Day Stockout Risk & Gemini Advisory (District Officer Perspective)
1. Switch role to **District Officer** (`officer@pune.health.gov.in`).
2. The **Map** highlights Shirur PHC with an amber/red ring because ORS stock is below the 7-day forecast demand (Cover < 7 days, Stockout Probability > 40%).
3. Switch to the **Alerts** tab: locate the `COVER_7D` alert for Shirur PHC.
4. Click **Gemini Advisory (EN/HI)**: Gemini generates clinical logistics commentary with structured allocation lines. Tap **हिंदी में पढ़ें** to view the advisory in native Devanagari Hindi.

### Step 3: Human-in-the-Loop Transfer Approval (Atomic PostgreSQL Transaction)
1. Click **Propose Transfer**: the deterministic optimizer computes the nearest capable donor facility (Talegaon CHC, 42 km) that satisfies:
   - **Same Tenant / Country**: Both in Pune, Maharashtra (`IN-MH-PUN`).
   - **Cold Chain Verification**: Certified before transferring cold-sensitive items.
   - **Donor Cover Rule**: Donor retains $\ge 7$ days of forecast demand post-transfer.
2. In the **Transfers** tab, review the proposed order. Notice the status is `proposed`. Stock has NOT moved yet!
3. Click **Approve & Execute Stock Transfer**:
   - The server initiates an atomic PostgreSQL transaction.
   - Locks donor physical lots with `SELECT ... FOR UPDATE`.
   - Consumes lots using FIFO expiry order.
   - Decrements donor stock and increments recipient stock.
   - Updates order status to `approved`.
4. Return to **Map**: Shirur PHC's stockout risk clears!

### Step 4: Defense-in-Depth & Sovereign BRICS Privacy
1. Switch role to **BRICS Analyst** (`analyst@brics-health.org`).
2. Notice all national operational tabs (**Map**, **Alerts**, **Stock**, **Transfers**) are strictly locked.
3. In the **BRICS** tab, review cross-national indices (Predicted Demand Index, Surplus Bands: LOW/MED/HIGH).
4. Inspect the banner: **Zero PHI or facility inventory is exported**.
5. Inspect the Differential Privacy Model Card for version and Bayesian prior details.

---

## 🛡️ Non-Negotiable Invariants Verified by Tests

Run the automated integration and security suite:

```bash
npm run test
```

Verified invariants:
1. **Donor Cover Protection**: Donor must retain $\ge 7$ days of forecast demand.
2. **Cold Chain Integrity**: Cold-chain medications (`temp_min_c = 2`, `temp_max_c = 8`) strictly reject non-capable facilities.
3. **FIFO Expiry**: Physical stock lots consumed by earliest expiry date first.
4. **PostgreSQL Row-Level Security**: `brics_analyst` query on `stock_on_hand`, `stock_lots`, or `attendance_daily` returns 0 rows due to RLS policies.
5. **Zero PHI**: Federation views expose only sovereign indices and surplus bands.
6. **HTTP 403 Defense**: `brics_analyst` receives HTTP 403 on all non-federation endpoints.

---

## 🚀 Running Locally

```bash
# Install dependencies
npm install

# Run automated integration & security test suite
npm run test

# Run development server (port 3000)
npm run dev

# Build production bundle
npm run build

# Start production server
npm start
```

# CareCompanion AI

## Phase-1 Review 2 Milestone

An AI-powered digital caregiver concept for elderly medication management.

This repository represents the **Phase-1 Review 2 milestone** of the CareCompanion AI capstone project.

Phase 1 focused on:
- **System Architecture**
- **Database Modeling**
- **UI/UX Prototyping**
- **AI Proof of Concept**

---

## 1. Problem Statement

Elderly patients with chronic conditions often struggle with complex daily medication regimens, ambiguous handwritten prescriptions, and hard-to-remember schedules. Bypassing critical medications or taking incorrect doses can result in preventable medical complications and places a heavy emotional burden on family caregivers who lack real-time visibility.

---

## 2. Project Objective

**CareCompanion AI** bridges this gap by developing an AI-assisted caregiver system that:
1. Translates handwritten doctor prescriptions into structured, machine-readable medication schedules using vision AI.
2. Organizes daily routines into intuitive morning, afternoon, evening, and night slots.
3. Provides remote family caregivers with an accessible dashboard to monitor adherence (`TAKEN`, `PENDING`, `MISSED`).

---

## 3. Four Executed Modules

### Module 1 — System Architecture
A secure, multi-tier serverless topology separating frontend presentation from AI processing:
- **Client Layer**: React 19 / Next.js with high-contrast accessibility tokens.
- **Serverless API Layer**: Next.js route handlers (`/api/parse-prescription`) that enforce validation and server-side secret management.
- **AI Engine**: Google Gemini 2.5 Flash Vision for multimodal optical extraction.
- **Security**: The `GEMINI_API_KEY` is loaded strictly on the server and is never exposed to the client browser.
- Detailed documentation: [docs/architecture/architecture.md](docs/architecture/architecture.md)

### Module 2 — Database Schema Design
A normalized relational data model designed by **Tanushri Sukhwal (23BCE10680)**:
- `PatientProfile`: Demographic records, clinical conditions, doctor contacts, and caregiver assignments.
- `MedicationSchedule`: Structured prescriptions, dosages, daily routines, exact times, and durations.
- `AdherenceLog`: Time-stamped verification logs with strict status integrity (`taken`, `pending`, `missed`).
- Detailed documentation & DDL: [docs/database/README.md](docs/database/README.md) and [docs/database/schema.sql](docs/database/schema.sql)

### Module 3 — UI/UX Prototyping
An interactive caregiver-facing dashboard wireframe designed by **Sahil Sahani (23BCE10123)**:
- Displays patient demographics and clinical care plan directives.
- Real-time visual status indicators:
  - `TAKEN` (Emerald Green)
  - `PENDING` (Amber Yellow)
  - `MISSED` (Crimson Red)
- Interactive daily adherence rate metric.
- Detailed documentation: [docs/ui/README.md](docs/ui/README.md)

### Module 4 — AI Proof of Concept
A functional prescription parsing pipeline built by **Samiksha Vijayvargiya (23BCE10725)**:
- Converts handwritten prescription images into structured JSON schema (`patient`, `medications` array).
- Tested against the Review 2 benchmark sample:
  - **Patient**: Mr. Ramesh (72 yrs)
  - **Medicine 1**: Telmisartan 40 mg (Morning, 30 days)
  - **Medicine 2**: Amlodipine 5 mg (Night, 30 days)
- Directly maps extracted values into the `MedicationSchedule` model.
- Detailed documentation: [docs/ai-poc/README.md](docs/ai-poc/README.md)

---

## 4. Team Contributions

| Team Member | Registration No. | Phase 1 Execution |
|---|---|---|
| **Sahil Sahani** | 23BCE10123 | Designed responsive UI wireframes & dashboard mockups. |
| **Kavyansh Vats** | 23BCE10301 | Mapped backend architecture & serverless API flow. |
| **Samiksha Vijayvargiya** | 23BCE10725 | Built working PoC for Gemini prescription extraction. |
| **Pakhi Shukla** | 23BCE10847 | Evaluated TTS engines for multilingual voice reminders. |
| **Tanushri Sukhwal** | 23BCE10680 | Finalized database schemas for patients & schedules. |

Full attribution report: [docs/team-contributions.md](docs/team-contributions.md)

---

## 5. Getting Started & Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm (v9.0.0 or higher)

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/manohhar2006-bit/carecompanion-AI.git
cd carecompanion-AI

# 2. Install dependencies
npm install

# 3. Configure environment variables
# Copy .env.local.example to .env.local and insert your Gemini API Key
cp .env.local.example .env.local
```

Example `.env.local`:
```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### Running the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Testing & Validation

Run the Phase-1 validation test suite:
```bash
npm test
```

This verifies:
1. **AI PoC Output Schema**: Validates structured JSON formatting (patient, medications array, dosage, timing, duration).
2. **Database Relational Integrity**: Checks primary key, foreign key, and status constraint specifications.
3. **API Validation**: Verifies serverless `/api/parse-prescription` input handling.

---

## 7. Current Limitations & Phase Boundary

1. **Database Persistence**: The database schema is finalized via SQL DDL (`docs/database/schema.sql`). The active Phase-1 UI uses a synchronized in-memory/browser-state representation for local demonstration.
2. **Caregiver Synchronization**: Multi-device real-time sync is demonstrated in prototype form; production cloud messaging is future work.
3. **External Notifications**: SMS, WhatsApp, and automated telephonic reminders are outside current milestone scope.
4. **Feasibility Nature**: This project represents a feasibility proof of concept. No clinical validation or medical-grade certification is claimed.

> **Phase Boundary Statement**: This repository represents the completed Phase-1 Review 2 milestone. Production deployment, external integrations, persistent multi-user infrastructure, and additional intelligent caregiver features are outside the current milestone.

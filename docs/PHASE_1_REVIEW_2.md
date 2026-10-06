# Capstone Project — Phase-1 Review 2 Milestone Report

## 1. Project Objective

**CareCompanion AI** is an AI-powered digital caregiver concept designed to solve the critical challenge of medication non-adherence and health instruction confusion among elderly patients. 

By combining multimodal computer vision for handwritten prescription understanding with structured schedule management and caregiver oversight, the platform ensures that elderly individuals take the right medications at the right time while giving remote family members complete visibility.

---

## 2. Phase-1 Execution Scope

Phase 1 represents the foundational engineering milestone of the capstone project. In accordance with the Phase-1 Review 2 deliverables, the project concentrated strictly on:

1. **Design & System Architecture**: Formulating the client-serverless-AI topology.
2. **Database Modeling**: Designing normalized relational data models for clinical profiles, schedules, and adherence logs.
3. **UI/UX Prototyping**: Developing an elder-accessible Caregiver Monitoring Dashboard with clear adherence state indicators.
4. **AI Feasibility Testing (PoC)**: Validating the technical capability of Gemini Vision to extract structured JSON from handwritten prescriptions.

---

## 3. Executed Modules

### Module 1 — System Architecture
- **Client Layer**: React 19 / Next.js with high-contrast accessibility tokens.
- **Serverless API Layer**: Next.js route handlers (`/api/parse-prescription`) that securely inject server-side credentials and validate payloads.
- **AI Engine**: Google Gemini 2.5 Flash Vision for multimodal optical recognition.
- **Security Protocol**: Zero client-side API key leakage (`process.env.GEMINI_API_KEY` accessed exclusively server-side).
- **Documentation**: [docs/architecture/architecture.md](file:///d:/carecompanion-AI/docs/architecture/architecture.md)

### Module 2 — Database Schema
- Finalized relational SQL schema modeling three primary entities:
  - `PatientProfile`: Demographic records, clinical condition, doctor, clinic, language, and caregiver links.
  - `MedicationSchedule`: Prescribed drugs, dosage strengths, frequencies, daily routines, exact times, and duration.
  - `AdherenceLog`: Time-stamped verification logs with strict `CHECK (status IN ('taken', 'pending', 'missed'))` constraint.
- Primary keys, foreign key constraints (`ON DELETE CASCADE`), and composite lookups defined.
- **Documentation**: [docs/database/README.md](file:///d:/carecompanion-AI/docs/database/README.md) & [docs/database/schema.sql](file:///d:/carecompanion-AI/docs/database/schema.sql)

### Module 3 — UI/UX Prototyping
- Responsive Caregiver Dashboard wireframe displaying patient vitals, clinical care plans, and daily schedules.
- Hourly medication timeline organizing morning, afternoon, evening, and night routines.
- High-visibility status indicators:
  - `TAKEN` (Emerald Green)
  - `PENDING` (Amber Yellow)
  - `MISSED` (Crimson Red)
- Interactive adherence rate index calculation.
- **Documentation**: [docs/ui/README.md](file:///d:/carecompanion-AI/docs/ui/README.md)

### Module 4 — AI Proof of Concept
- Functional serverless API pipeline:
  $$\text{Handwritten Prescription Image} \longrightarrow \text{Next.js Server API} \longrightarrow \text{Gemini Vision AI} \longrightarrow \text{Structured JSON}$$
- Verified with the benchmark sample prescription from the Review 2 presentation:
  - **Patient**: Mr. Ramesh, 72 yrs
  - **Medicine 1**: Telmisartan 40 mg (Morning, 30 days)
  - **Medicine 2**: Amlodipine 5 mg (Night, 30 days)
- Emits schema-compliant JSON mapping directly into the `MedicationSchedule` model.
- **Documentation**: [docs/ai-poc/README.md](file:///d:/carecompanion-AI/docs/ai-poc/README.md)

---

## 4. Current Limitations & Academic Boundary

To maintain absolute academic integrity and transparency, the following current limitations are explicitly stated:

1. **Database Layer**: The relational database schema has been designed and validated via DDL (`schema.sql`). The active Phase-1 application uses a synchronized in-memory/browser-state representation for zero-dependency local demonstration. Provisioning a persistent cloud database (PostgreSQL/Supabase) is planned for Phase 2.
2. **Caregiver Synchronization**: Multi-device real-time sync is currently simulated in the prototype; production WebSockets / push notification channels are outside the Phase-1 scope.
3. **External Notifications**: Telephonic, WhatsApp, or SMS caregiver escalation is not implemented in this milestone.
4. **Clinical Validation**: The AI extraction demonstrates technical feasibility only. No medical certification or clinical diagnostic claims are asserted.
5. **Phase-2 Boundary**: Doctor consultation summarization, automated refill ordering, and emergency response integrations belong to future phases.

---

## 5. Phase Boundary Statement

> **This repository represents the completed Phase-1 Review 2 milestone.** Production deployment, external integrations, persistent multi-user infrastructure, and additional intelligent caregiver features are outside the current milestone.

# Module 1 — System Architecture & Data Flow

## 1. Overview

CareCompanion AI implements a modern multi-tier, serverless architecture tailored for elderly medication adherence and caregiver visibility. The system decouples client-side presentation from backend AI evaluation, ensuring high responsiveness, zero key exposure, and clean data modeling.

```text
                    CARECOMPANION AI
                           |
                           v
                +---------------------+
                |   Client Layer      |
                | React / Next.js     |
                | Caregiver Dashboard |
                +----------+----------+
                           |
                           | Secure POST (Image / Data)
                           v
                +---------------------+
                | Serverless API      |
                | Next.js API Routes  |
                | Input Validation    |
                +----------+----------+
                           |
                           | Server-to-Server HTTPS
                           v
                +---------------------+
                | AI Engine           |
                | Gemini 2.5 Flash    |
                | Vision Extraction   |
                +----------+----------+
                           |
                           | Structured JSON
                           v
                +---------------------+
                | Database Design     |
                | • PatientProfile    |
                | • MedicationSchedule|
                | • AdherenceLog      |
                +---------------------+
```

---

## 2. Architectural Layers

### 2.1 Client Layer (Frontend)
- **Framework**: React 19 / Next.js (App Router)
- **Styling**: Tailwind CSS / Vanilla CSS with high-contrast accessibility tokens
- **Role**:
  - Caregiver monitoring dashboard
  - Hourly medication timeline with `TAKEN`, `PENDING`, and `MISSED` visual indicators
  - Prescription capture & file upload interface
  - Client-side prototype state management for deterministic demonstration

### 2.2 Serverless API Layer (Backend Logic)
- **Framework**: Next.js Serverless Route Handlers (`app/api/parse-prescription/route.ts`)
- **Role**:
  - Request payload validation (checks base64 image data and MIME types)
  - Acts as a secure intermediary between the client browser and the Google Gemini API
  - Formats prompt engineering directives and enforces strict JSON schema generation
  - Parses, sanitizes, and normalizes AI output before sending responses to the client

### 2.3 AI Vision Engine
- **Model**: Google Gemini 2.5 Flash Vision (`gemini-2.5-flash`)
- **Role**:
  - Multimodal Optical Character Recognition (OCR) and clinical entity recognition
  - Reads doctor handwriting, medicine abbreviations (`QD`, `BID`, `TID`, `hs`, `ac`), dosages (`mg`, `mcg`), and timings (`Morning`, `Night`)
  - Emits structured JSON adhering strictly to the `Patient` and `Medications` schema

### 2.4 Database Design (Data Model)
- **Status**: Relational schema finalized for Phase-1 Review 2 (`docs/database/schema.sql`)
- **Role**:
  - Models core entities: `PatientProfile`, `MedicationSchedule`, and `AdherenceLog`
  - Defines primary keys, foreign key constraints, check constraints, and relational indexes
  - Serves as the blueprint for persistent relational databases in future phases

---

## 3. Data Flow & Security Model

```text
[Browser / Client] 
       │ (1) User selects prescription image (PNG/JPG)
       │ (2) Image converted to Base64
       ▼
[Next.js API Route: /api/parse-prescription]
       │ (3) Validates request body & MIME type
       │ (4) Injects process.env.GEMINI_API_KEY (Server-Side Only)
       │ (5) Sends prompt + image payload to Google Generative AI API
       ▼
[Google Gemini 2.5 Flash Vision]
       │ (6) Extracts patient name, medicine names, dosages, timings, durations
       │ (7) Returns pure structured JSON
       ▼
[Next.js API Route: /api/parse-prescription]
       │ (8) Validates JSON structure against schema
       │ (9) Normalizes schedule slots (morning, afternoon, evening, night)
       ▼
[Client / Caregiver Dashboard]
       │ (10) Renders JSON output & mapped schedule cards
       │ (11) Updates daily medication timeline (Taken / Pending / Missed)
```

### Security Guarantees:
1. **Zero Client API Key Leakage**: The `GEMINI_API_KEY` is loaded strictly in server-side Next.js route handlers via `process.env`. It is never prefixed with `NEXT_PUBLIC_` and never bundled into client JavaScript.
2. **Payload Validation**: Requests missing image payloads are rejected with HTTP 400 Bad Request before making external calls.
3. **No Fabricated Production Claims**: The architecture clearly distinguishes between the active prototype state and the formal database design.

---

## 4. Architectural Evidence

An architectural diagram is maintained in this directory:
- [architecture-diagram.png](file:///d:/carecompanion-AI/docs/architecture/architecture-diagram.png)

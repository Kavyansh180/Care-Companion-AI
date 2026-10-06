# Team Contributions — Phase-1 Review 2

The following team members contributed to the design, architectural modeling, prototyping, and feasibility engineering of **CareCompanion AI** for the Capstone Project Phase-1 Review 2 milestone:

| Team Member | Registration No. | Phase 1 Execution |
|---|---|---|
| **Sahil Sahani** | 23BCE10123 | Designed responsive UI wireframes & dashboard mockups. |
| **Kavyansh Vats** | 23BCE10301 | Mapped backend architecture & serverless API flow. |
| **Samiksha Vijayvargiya** | 23BCE10725 | Built working PoC for Gemini prescription extraction. |
| **Pakhi Shukla** | 23BCE10847 | Evaluated TTS engines for multilingual voice reminders. |
| **Tanushri Sukhwal** | 23BCE10680 | Finalized database schemas for patients & schedules. |

---

## Detailed Execution Mapping

### 1. Sahil Sahani (23BCE10123) — Module 3: UI/UX Prototyping
- Formulated the responsive user interface layout for elder-friendly interactions.
- Designed the Caregiver Monitoring Dashboard wireframe showcasing the daily medication timeline.
- Implemented high-visibility visual states for `TAKEN`, `PENDING`, and `MISSED` medication routines.
- Reference: [docs/ui/README.md](file:///d:/carecompanion-AI/docs/ui/README.md)

### 2. Kavyansh Vats (23BCE10301) — Module 1: System Architecture
- Formulated the multi-tier client-serverless-AI architectural topology.
- Mapped the Next.js API route communication flow to protect API credentials server-side.
- Structured the end-to-end data pipeline from prescription capture to caregiver visualization.
- Reference: [docs/architecture/architecture.md](file:///d:/carecompanion-AI/docs/architecture/architecture.md)

### 3. Samiksha Vijayvargiya (23BCE10725) — Module 4: AI Proof of Concept
- Implemented the multimodal prescription parsing pipeline using Google Gemini 2.5 Flash Vision.
- Developed the structured JSON extraction schema (Patient, Medicine, Dosage, Timing, Duration).
- Verified handwritten prescription recognition using the benchmark test sample (Mr. Ramesh).
- Reference: [docs/ai-poc/README.md](file:///d:/carecompanion-AI/docs/ai-poc/README.md)

### 4. Pakhi Shukla (23BCE10847) — Voice Reminders Feasibility Evaluation
- Conducted the comparative evaluation of Text-to-Speech (TTS) engines for multilingual voice reminders.
- Analyzed browser-native `SpeechSynthesis` and neural cloud voice feasibility across Indian regional languages.
- Documented audio pacing parameters (0.80x–0.85x) for elderly comprehension.
- Reference: [docs/ui/tts-evaluation.md](file:///d:/carecompanion-AI/docs/ui/tts-evaluation.md)

### 5. Tanushri Sukhwal (23BCE10680) — Module 2: Database Schema
- Designed and normalized the relational database schemas for `PatientProfile`, `MedicationSchedule`, and `AdherenceLog`.
- Established primary key, foreign key cascade constraints, check constraints, and indexing strategies.
- Documented relational entity mappings and adherence calculation rationale.
- Reference: [docs/database/README.md](file:///d:/carecompanion-AI/docs/database/README.md) and [docs/database/schema.sql](file:///d:/carecompanion-AI/docs/database/schema.sql)

# Module 4 — AI Proof of Concept: Prescription Extraction

**Engineered by:** Samiksha Vijayvargiya (23BCE10725)  
**Milestone:** Phase-1 Review 2 AI Feasibility Proof of Concept  
**Endpoint:** `/api/parse-prescription`

---

## 1. Overview & Objective

Medical prescriptions in geriatric care are notoriously difficult to read due to cursive physician handwriting, Latin dosage abbreviations (`QD`, `BID`, `hs`, `ac`), and varying layouts. 

The objective of this Module 4 Proof of Concept is to test the **technical feasibility** of using multimodal large language models (Google Gemini 2.5 Flash Vision) via serverless Next.js API routes to convert unstructured prescription images into validated, machine-readable structured JSON.

---

## 2. End-to-End Processing Pipeline

```text
Handwritten Prescription Image (PNG / JPG)
                  │
                  ▼
   Next.js Server API (/api/parse-prescription)
   • Base64 image payload verification
   • Server-side API key injection
   • Strict JSON schema prompting
                  │
                  ▼
   Gemini 2.5 Flash Vision Engine
   • Multimodal visual token parsing
   • Cursive handwriting recognition
   • Clinical dosage & timing extraction
                  │
                  ▼
   Validated Structured JSON
   • Patient identity
   • Array of prescribed medications
                  │
                  ▼
   Direct Mapping to MedicationSchedule Model
   • Scheduled times (08:00 AM, 09:00 PM)
   • Daily routine slots (morning, night)
   • Timeline visualization in Caregiver Dashboard
```

---

## 3. Benchmark Sample Demonstration (Review 2 PPT)

### 3.1 Input (`docs/ai-poc/sample-prescription.txt`)
```text
Patient: Mr. Ramesh, 72 yrs
Diagnosis: Hypertension & Cardiovascular Health

Rx:
1. Tab Telmisartan 40 mg
   1 tab, morning, 30 days
   Take after breakfast

2. Tab Amlodipine 5 mg
   1 tab, night, 30 days
   Take at bedtime
```

### 3.2 Output (`docs/ai-poc/sample-output.json`)
```json
{
  "patient": "Mr. Ramesh",
  "medications": [
    {
      "name": "Telmisartan",
      "dosage": "40 mg",
      "timing": "Morning",
      "duration_days": 30
    },
    {
      "name": "Amlodipine",
      "dosage": "5 mg",
      "timing": "Night",
      "duration_days": 30
    }
  ]
}
```

---

## 4. Why Structured Output is Vital for Elder Care

1. **Elimination of Transcription Errors**: Eliminates the risk of elderly patients or family caregivers misinterpreting handwritten numbers (e.g. confusing 5mg with 50mg).
2. **Deterministic Timeline Mapping**: Structured fields (`timing`, `dosage`, `duration_days`) automatically map into the `MedicationSchedule` database entity and generate the daily timeline.
3. **Voice Reminder Synthesis**: Structured fields provide the exact text inputs required for spoken multilingual reminders.

---

## 5. Mapping into the Database Model

The extracted JSON fields directly populate the relational schema:

| AI Output JSON Field | Relational Schema Target (`MedicationSchedule`) | Example Value |
|---|---|---|
| `patient` | `PatientProfile.name` | `"Mr. Ramesh"` |
| `medications[].name` | `MedicationSchedule.medicine_name` | `"Telmisartan"` |
| `medications[].dosage` | `MedicationSchedule.dosage` | `"40 mg"` |
| `medications[].timing` | `MedicationSchedule.time_of_day` | `"morning"` |
| Inferred schedule time | `MedicationSchedule.exact_time` | `"08:00:00"` |
| `medications[].duration_days` | `MedicationSchedule.duration_days` | `30` |

---

## 6. Phase-1 Feasibility & Limitations

> [!IMPORTANT]
> **Academic Milestone Disclaimer**:
> This implementation is a technical feasibility proof of concept. 
> - No medical-grade or clinical certification is claimed.
> - No fabricated or arbitrary accuracy percentage is asserted.
> - Final clinical validation and production multi-model ensemble verification are reserved for future work.

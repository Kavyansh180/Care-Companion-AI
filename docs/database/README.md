# Module 2 — Database Schema Design

## 1. Executive Summary

As part of the **Phase-1 Review 2** milestone of CareCompanion AI, the relational data model was finalized by **Tanushri Sukhwal (23BCE10680)**. 

The design establishes three normalized relational tables that support elder medication management, dynamic schedule mapping from prescription AI extractions, and multi-state adherence monitoring.

---

## 2. Core Entities & Field Definitions

### 2.1 Entity: `PatientProfile`
Stores patient demographic data, chronic conditions, clinic contacts, and caregiver assignments.

| Column | Data Type | Constraint | Purpose |
|---|---|---|---|
| `patient_id` | `VARCHAR(64)` | **Primary Key** | Unique identifier for the patient account |
| `name` | `VARCHAR(255)` | `NOT NULL` | Full legal/preferred name of the patient |
| `age` | `INTEGER` | `CHECK (age > 0 AND age < 130)` | Age in years for geriatric dosing validation |
| `gender` | `VARCHAR(32)` | `NOT NULL` | Patient gender |
| `condition` | `TEXT` | `NOT NULL` | Primary medical condition(s) / diagnosis |
| `caregiver_name` | `VARCHAR(255)` | `NOT NULL` | Primary family member / caregiver name |
| `doctor_name` | `VARCHAR(255)` | `NOT NULL` | Attending physician |
| `clinic_name` | `VARCHAR(255)` | `NOT NULL` | Associated healthcare facility |
| `preferred_language`| `VARCHAR(64)` | `DEFAULT 'English'` | Language selected for voice reminder synthesis |
| `precautions` | `TEXT` | — | Clinical warnings (e.g. low-sodium, empty stomach) |
| `follow_up_date` | `DATE` | — | Next scheduled doctor consultation |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | `DEFAULT CURRENT_TIMESTAMP` | Record creation timestamp |

---

### 2.2 Entity: `MedicationSchedule`
Stores structured prescriptions, dosage quantities, frequencies, daily routines, and course durations.

| Column | Data Type | Constraint | Purpose |
|---|---|---|---|
| `medication_id` | `VARCHAR(64)` | **Primary Key** | Unique medication routine identifier |
| `patient_id` | `VARCHAR(64)` | **Foreign Key** (`PatientProfile`) | Links medication to the patient record (`ON DELETE CASCADE`) |
| `medicine_name` | `VARCHAR(255)` | `NOT NULL` | Drug brand/generic name (e.g. Telmisartan) |
| `dosage` | `VARCHAR(128)` | `NOT NULL` | Prescribed strength/dose (e.g. 40 mg) |
| `frequency` | `VARCHAR(64)` | `DEFAULT 'Daily'` | Administration frequency |
| `time_of_day` | `VARCHAR(64)` | `NOT NULL` | Time slot category: `morning`, `afternoon`, `evening`, `night` |
| `exact_time` | `TIME` | `NOT NULL` | Scheduled intake time (24h format, e.g. `08:00:00`) |
| `duration_days` | `INTEGER` | `CHECK (duration_days > 0)` | Length of treatment course in days |
| `start_date` | `DATE` | `DEFAULT CURRENT_DATE` | Prescription start date |
| `instructions` | `TEXT` | — | Intake notes (e.g. "Take after breakfast") |
| `active` | `BOOLEAN` | `DEFAULT TRUE` | Whether the prescription is currently active |

---

### 2.3 Entity: `AdherenceLog`
Maintains discrete time-stamped intake event logs to compute adherence metrics and display visual timeline states.

| Column | Data Type | Constraint | Purpose |
|---|---|---|---|
| `log_id` | `VARCHAR(64)` | **Primary Key** | Unique intake log identifier |
| `patient_id` | `VARCHAR(64)` | **Foreign Key** (`PatientProfile`) | Identifies patient for quick aggregation |
| `medication_id` | `VARCHAR(64)` | **Foreign Key** (`MedicationSchedule`) | Links log entry to the scheduled medicine |
| `log_date` | `DATE` | `DEFAULT CURRENT_DATE` | Target adherence date |
| `scheduled_time` | `TIME` | `NOT NULL` | Time the dose was due |
| `status` | `VARCHAR(16)` | `CHECK (status IN ('taken', 'pending', 'missed'))` | Visual adherence state |
| `recorded_at` | `TIMESTAMP WITH TIME ZONE` | — | Timestamp when patient/caregiver confirmed intake |

---

## 3. Entity Relationship Diagram (ERD)

```text
+-------------------------+
|     PatientProfile      |
+-------------------------+
| PK  patient_id          |
|     name                |
|     age                 |
|     condition           |
|     caregiver_name      |
+------------+------------+
             |
             | 1 : N (One patient has many medications)
             v
+-------------------------+          +-------------------------+
|   MedicationSchedule    |          |      AdherenceLog       |
+-------------------------+          +-------------------------+
| PK  medication_id       | <------- | PK  log_id              |
| FK  patient_id          | 1 : N    | FK  patient_id          |
|     medicine_name       |          | FK  medication_id       |
|     dosage              |          |     status (T/P/M)      |
|     exact_time          |          |     recorded_at         |
|     duration_days       |          +-------------------------+
+-------------------------+
```

---

## 4. Why This Structure Supports Medication Adherence

1. **Granular Temporal Tracking**: By modeling `exact_time` and `time_of_day` separately in `MedicationSchedule`, the system can group medications into intuitive daily routines for elderly users while maintaining second-level precision for scheduling triggers.
2. **Three-State Adherence Calculation**: The `CHECK (status IN ('taken', 'pending', 'missed'))` constraint on `AdherenceLog` ensures strict state integrity for computing compliance percentages. The app uses `taken / (taken + missed)` and leaves pending doses out until they are decided.
3. **Prescription PoC Interoperability**: The fields directly match the output emitted by the Gemini Vision extraction PoC (`patient`, `name`, `dosage`, `timing`, `duration_days`), allowing seamless mapping from optical recognition to database records.

---

## 5. Phase-1 Boundary Clarification

> **Important**: This database schema represents the finalized structural model for Phase 1. An actual relational database (PostgreSQL/MySQL) will be provisioned in Phase 2. The active Phase-1 application uses a synchronized in-memory/browser-state representation mirroring these exact schemas for deterministic academic review.

---

## 6. Migrations

| File | Status | What it contains |
|---|---|---|
| [`schema.sql`](schema.sql) | Phase-1 base design | `PatientProfile`, `MedicationSchedule`, `AdherenceLog`, indexes and the Review 2 seed data for Mr. Ramesh |
| [`migrations/002_adherence_intelligence.sql`](migrations/002_adherence_intelligence.sql) | **Design only, not applied anywhere** | Extends the base schema for the adherence-intelligence prototype (see below) |

**What `002_adherence_intelligence.sql` adds**

1. New `AdherenceLog` columns: `reminder_sent`, `reminder_acknowledged`, `taken_at`, `delay_minutes`. Two checks keep them consistent: a reminder cannot be acknowledged unless it was sent, and `taken_at` and `delay_minutes` can only be set when the status is `taken`. It also adds an index on `(patient_id, log_date)`.
2. `AppActivityEvent`: one row per app open, dashboard view or reminder response. Activity is not evidence that a dose was taken.
3. `ModelVersion`: one row per trained model (algorithm, training date, training-data hash, metrics as JSON, and a flag saying whether the training data was synthetic).
4. `RiskPrediction`: the estimated probability that a patient's next dose is missed, the model version that made it, the time of the estimate, the dose time it refers to, the risk band and the per-prediction factors. The risk bands are prototype thresholds, not medically validated.

**Where the data really lives today.** The running prototype keeps live data in browser `localStorage` (the browser field names are camelCase, for example `exactTime`, and only approximate these tables). The simulated analytics data is read from `ml/data/*.csv`. No code reads or runs either SQL file, and the app has no database driver.

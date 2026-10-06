# Module 3 — UI/UX Prototyping & Caregiver Dashboard

## 1. Executive Summary

Module 3 focused on UI/UX Prototyping and was executed by **Sahil Sahani (23BCE10123)**. 

The primary deliverable is a caregiver-facing dashboard and interactive medication timeline wireframe engineered to eliminate elderly medication non-adherence and provide immediate visual status clarity to remote family members.

---

## 2. Core Dashboard Components

### 2.1 Patient Identity & Health Profile
- Displays the active patient file (e.g. **Mr. Ramesh, Age 72, Hypertension**).
- Prominently showcases attending physician contacts, clinic affiliations, clinical instructions, and caregiver notes.
- Accessible via [Patient Profiles](file:///d:/carecompanion-AI/app/patients/page.tsx) and [Caregiver Dashboard](file:///d:/carecompanion-AI/app/caregiver/page.tsx).

### 2.2 Today's Medication Timeline
- Chronological breakdown of medications across four standard routine windows:
  - **Morning Routine** (06:00 – 11:59)
  - **Afternoon Routine** (12:00 – 16:59)
  - **Evening Routine** (17:00 – 19:59)
  - **Night Routine** (20:00 – 23:59)
- Displays medication name, dosage strength (e.g. `Telmisartan 40 mg`), scheduled time (`08:00 AM`), and clinical directives (`Take after breakfast`).

### 2.3 Visual Status Indicators (Taken / Pending / Missed)
To enable instant recognition without cognitive load, the interface uses high-contrast, universally recognizable visual indicators:

| Status | Color System | Visual Badge | Meaning |
|---|---|---|---|
| **TAKEN** | Emerald Green (`#059669`) | Green dot + Bold `TAKEN` badge + logged timestamp | Intake confirmed by patient/caregiver |
| **PENDING** | Amber Yellow (`#d97706`) | Pulsing amber dot + `PENDING` badge | Scheduled dose upcoming in today's routine |
| **MISSED** | Crimson Red (`#dc2626`) | Pulsing red dot + `MISSED` badge + urgent card border | Scheduled window passed without intake |

---

## 3. Prototype Demonstration Flow

The caregiver interface includes an interactive state toggle allowing reviewers to simulate:
1. Marking pending doses as **Taken** (updates adherence % in real time).
2. Marking missed doses as **Missed** (triggers caregiver warning alert).
3. Undoing logs to return items to **Pending**.

---

## 4. Academic Milestone Boundary

> **Note**: This interface is a high-fidelity prototype designed to validate caregiver UX and workflow feasibility. Real-time multi-device cloud synchronization and external SMS/WhatsApp push notifications are designated for Phase 2 implementation.

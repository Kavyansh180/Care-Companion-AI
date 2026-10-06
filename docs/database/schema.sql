-- ============================================================================
-- CARECOMPANION AI — PHASE-1 REVIEW 2 DATABASE SCHEMA DESIGN
-- Designed by: Tanushri Sukhwal (23BCE10680)
-- Description: Relational Data Model for Geriatric Medication Adherence
-- Entities:
--   1. PatientProfile
--   2. MedicationSchedule
--   3. AdherenceLog
-- ============================================================================

-- Table 1: PatientProfile
-- Stores demographic, clinical condition, primary caregiver, and medical contact information.
CREATE TABLE PatientProfile (
    patient_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age > 0 AND age < 130),
    gender VARCHAR(32) NOT NULL,
    condition TEXT NOT NULL,
    caregiver_name VARCHAR(255) NOT NULL,
    doctor_name VARCHAR(255) NOT NULL,
    clinic_name VARCHAR(255) NOT NULL,
    preferred_language VARCHAR(64) DEFAULT 'English',
    precautions TEXT,
    follow_up_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on patient name and caregiver
CREATE INDEX idx_patient_name ON PatientProfile(name);
CREATE INDEX idx_patient_caregiver ON PatientProfile(caregiver_name);


-- Table 2: MedicationSchedule
-- Stores structured medication routines, dosages, schedules, and duration prescribed for a patient.
CREATE TABLE MedicationSchedule (
    medication_id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(128) NOT NULL,
    frequency VARCHAR(64) NOT NULL DEFAULT 'Daily',
    time_of_day VARCHAR(64) NOT NULL, -- 'morning', 'afternoon', 'evening', 'night'
    exact_time TIME NOT NULL,         -- e.g. '08:00:00', '21:00:00'
    duration_days INTEGER NOT NULL CHECK (duration_days > 0),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    instructions TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_med_patient FOREIGN KEY (patient_id) 
        REFERENCES PatientProfile(patient_id) ON DELETE CASCADE
);

-- Index on patient foreign key and schedule times
CREATE INDEX idx_med_patient_id ON MedicationSchedule(patient_id);
CREATE INDEX idx_med_exact_time ON MedicationSchedule(exact_time);
CREATE INDEX idx_med_active ON MedicationSchedule(active);


-- Table 3: AdherenceLog
-- Records time-stamped intake verification logs for caregiver monitoring (Taken, Pending, Missed).
CREATE TABLE AdherenceLog (
    log_id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL,
    medication_id VARCHAR(64) NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_time TIME NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('taken', 'pending', 'missed')),
    recorded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_patient FOREIGN KEY (patient_id) 
        REFERENCES PatientProfile(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_log_medication FOREIGN KEY (medication_id) 
        REFERENCES MedicationSchedule(medication_id) ON DELETE CASCADE
);

-- Composite index for fast daily adherence lookups
CREATE INDEX idx_adherence_lookup ON AdherenceLog(patient_id, log_date, status);
CREATE INDEX idx_adherence_medication ON AdherenceLog(medication_id);


-- ============================================================================
-- SEED DATA — REVIEW 2 BENCHMARK (MR. RAMESH)
-- ============================================================================

INSERT INTO PatientProfile (
    patient_id, name, age, gender, condition, caregiver_name, doctor_name, clinic_name, preferred_language, precautions, follow_up_date
) VALUES (
    'profile-ramesh',
    'Mr. Ramesh',
    72,
    'Male',
    'Hypertension & Cardiovascular Care',
    'Anil',
    'Dr. Sarah Alcott',
    'Metro Health Cardiology Clinic',
    'English',
    'Maintain low sodium diet, avoid refined sugars, and walk 30 minutes daily.',
    '2026-07-15'
);

INSERT INTO MedicationSchedule (
    medication_id, patient_id, medicine_name, dosage, frequency, time_of_day, exact_time, duration_days, start_date, instructions, active
) VALUES 
(
    'med-telmisartan',
    'profile-ramesh',
    'Telmisartan',
    '40 mg',
    'Daily',
    'morning',
    '08:00:00',
    30,
    '2026-06-15',
    'Take 1 tablet in morning after breakfast',
    TRUE
),
(
    'med-amlodipine',
    'profile-ramesh',
    'Amlodipine',
    '5 mg',
    'Daily',
    'night',
    '21:00:00',
    30,
    '2026-06-15',
    'Take 1 tablet at night before bedtime',
    TRUE
);

INSERT INTO AdherenceLog (
    log_id, patient_id, medication_id, log_date, scheduled_time, status, recorded_at
) VALUES 
(
    'log-ramesh-telmisartan-today',
    'profile-ramesh',
    'med-telmisartan',
    CURRENT_DATE,
    '08:00:00',
    'taken',
    CURRENT_TIMESTAMP
),
(
    'log-ramesh-amlodipine-today',
    'profile-ramesh',
    'med-amlodipine',
    CURRENT_DATE,
    '21:00:00',
    'pending',
    NULL
);

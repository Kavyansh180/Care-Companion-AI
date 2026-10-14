-- ============================================================================
-- CARECOMPANION AI — MIGRATION 002: ADHERENCE INTELLIGENCE
--
-- DESIGN ONLY — not applied anywhere. The running prototype stores live data in
-- browser localStorage and reads the synthetic analytics dataset from
-- ml/data/*.csv. This migration shows how the adherence-intelligence data would
-- be stored in PostgreSQL in a later phase.
--
-- Extends docs/database/schema.sql (the Phase-1 base). Run it after that file.
--
-- What it adds:
--   1. AdherenceLog     : reminder and timing columns (ALTER TABLE)
--   2. AppActivityEvent : one row per app open, dashboard view or reminder response
--   3. ModelVersion     : one row per trained risk model
--   4. RiskPrediction   : one row per risk estimate for a patient's next dose
--
-- Note on the synthetic cohort: the 250 simulated patients (P001 to P250) have
-- no names or contact details, so they would not be loaded into PatientProfile
-- (name, caregiver_name and similar columns are NOT NULL). These tables only
-- show where real records would go.
--
-- Note on time: the prototype files hold naive local times in Asia/Kolkata.
-- Here they become TIMESTAMP WITH TIME ZONE, so a loader must attach the zone.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. AdherenceLog: reminder and timing details
--    These mirror the dose_events.csv columns reminder_sent, reminder_acknowledged,
--    taken_at and delay_minutes.
-- ----------------------------------------------------------------------------
ALTER TABLE AdherenceLog
    ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN reminder_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN taken_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN delay_minutes INTEGER CHECK (delay_minutes >= 0);

ALTER TABLE AdherenceLog
    -- A reminder cannot be acknowledged unless it was sent.
    ADD CONSTRAINT chk_log_ack_needs_sent
        CHECK (NOT reminder_acknowledged OR reminder_sent),
    -- taken_at and delay_minutes may only be set for a dose that was taken.
    ADD CONSTRAINT chk_log_taken_fields_only_if_taken
        CHECK (status = 'taken' OR (taken_at IS NULL AND delay_minutes IS NULL));

-- Index for per-patient date-range reads.
-- The base schema already has idx_adherence_lookup (patient_id, log_date, status),
-- whose first two columns cover the same lookups. This narrower index may be
-- redundant. Check with EXPLAIN on real data before applying and drop it if unused.
CREATE INDEX idx_adherence_patient_date ON AdherenceLog(patient_id, log_date);


-- ----------------------------------------------------------------------------
-- 2. AppActivityEvent
--    One row each time the patient uses the app. Mirrors app_activity.csv.
--    Activity is NOT evidence that a dose was taken: a patient can open the app
--    and still skip a dose. Never use these rows to set AdherenceLog.status.
-- ----------------------------------------------------------------------------
CREATE TABLE AppActivityEvent (
    activity_id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    activity_type VARCHAR(32) NOT NULL
        CHECK (activity_type IN ('app_open', 'dashboard_view', 'reminder_response')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_patient FOREIGN KEY (patient_id)
        REFERENCES PatientProfile(patient_id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_patient_time ON AppActivityEvent(patient_id, occurred_at);


-- ----------------------------------------------------------------------------
-- 3. ModelVersion
--    One row per trained model, so every stored prediction can be traced to the
--    model that made it. In the prototype the version string is the algorithm
--    name plus the first 8 hex characters of a SHA-256 hash of the training
--    table, for example 'logistic_regression-83bd2537'. The metrics column would
--    hold the contents of ml/metrics.json.
-- ----------------------------------------------------------------------------
CREATE TABLE ModelVersion (
    model_version VARCHAR(64) PRIMARY KEY,
    algorithm VARCHAR(64) NOT NULL,
    trained_at TIMESTAMP WITH TIME ZONE NOT NULL,
    training_data_hash VARCHAR(64) NOT NULL,
    metrics JSONB NOT NULL,
    is_synthetic_training_data BOOLEAN NOT NULL,   -- TRUE for every model in the prototype
    notes TEXT
);


-- ----------------------------------------------------------------------------
-- 4. RiskPrediction
--    The estimated probability that the patient's next scheduled dose is missed
--    (not taken within 120 minutes of its scheduled time).
--      knowledge_time   : the moment the estimate was made. Only doses whose
--                         outcome was already final then may be used as input.
--      target_dose_time : the scheduled time of the dose being predicted.
--    risk_band uses PROTOTYPE thresholds (low below 0.30, moderate 0.30 up to
--    0.60, high 0.60 and above). They are not medically validated, and the
--    database does not enforce them: the band is whatever the model service
--    reported for the stored probability.
--    factors holds the per-prediction explanation, for example
--    [{"feature": "adherence_7d", "label": "...", "value": 0.11,
--      "typical_value": 0.85, "effect": 0.30}].
-- ----------------------------------------------------------------------------
CREATE TABLE RiskPrediction (
    prediction_id VARCHAR(64) PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL,
    model_version VARCHAR(64) NOT NULL,
    knowledge_time TIMESTAMP WITH TIME ZONE NOT NULL,
    target_dose_time TIMESTAMP WITH TIME ZONE NOT NULL,
    probability NUMERIC(5, 4) NOT NULL CHECK (probability >= 0 AND probability <= 1),
    risk_band VARCHAR(16) NOT NULL CHECK (risk_band IN ('low', 'moderate', 'high')),
    factors JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_prediction_target_not_before_knowledge
        CHECK (target_dose_time >= knowledge_time),
    CONSTRAINT fk_prediction_patient FOREIGN KEY (patient_id)
        REFERENCES PatientProfile(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_prediction_model FOREIGN KEY (model_version)
        REFERENCES ModelVersion(model_version)
);

CREATE INDEX idx_prediction_patient_time ON RiskPrediction(patient_id, knowledge_time DESC);

COMMIT;

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { summarizeDoses, adherenceRate } from '../lib/adherence.ts';
import { formatTime12h } from '../lib/format.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

describe('CareCompanion AI — Phase-1 Review 2 Test Suite', () => {

  // ==========================================================================
  // 1. AI Proof-of-Concept Schema Tests (Module 4)
  // ==========================================================================
  describe('Module 4: AI Prescription PoC Schema Validation', () => {
    test('sample-output.json contains valid patient and medication array', () => {
      const samplePath = path.join(rootDir, 'docs', 'ai-poc', 'sample-output.json');
      assert.ok(fs.existsSync(samplePath), 'sample-output.json must exist in docs/ai-poc/');

      const data = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

      // Patient validation
      assert.ok(data.patient, 'Output must include a patient name');
      assert.equal(typeof data.patient, 'string');
      assert.equal(data.patient, 'Mr. Ramesh');

      // Medications array validation
      assert.ok(Array.isArray(data.medications), 'medications must be an array');
      assert.ok(data.medications.length >= 2, 'medications must contain at least 2 prescribed medicines');

      // Validate required fields for every medication
      data.medications.forEach((med, index) => {
        assert.ok(med.name, `Medication #${index + 1} must have a name`);
        assert.ok(med.dosage, `Medication #${index + 1} must have a dosage`);
        assert.ok(med.timing, `Medication #${index + 1} must have a timing`);
        assert.ok(typeof med.duration_days === 'number' && med.duration_days > 0, `Medication #${index + 1} must have a positive duration_days`);
      });

      // Check specific Review 2 benchmark drugs
      const medNames = data.medications.map(m => m.name.toLowerCase());
      assert.ok(medNames.some(n => n.includes('telmisartan')), 'Benchmark output must include Telmisartan');
      assert.ok(medNames.some(n => n.includes('amlodipine')), 'Benchmark output must include Amlodipine');
    });

    test('sample-prescription.txt input file exists and contains benchmark text', () => {
      const textPath = path.join(rootDir, 'docs', 'ai-poc', 'sample-prescription.txt');
      assert.ok(fs.existsSync(textPath), 'sample-prescription.txt must exist in docs/ai-poc/');

      const text = fs.readFileSync(textPath, 'utf8');
      assert.ok(text.includes('Ramesh'), 'Prescription must reference Ramesh');
      assert.ok(text.includes('Telmisartan'), 'Prescription must include Telmisartan');
      assert.ok(text.includes('Amlodipine'), 'Prescription must include Amlodipine');
    });
  });

  // ==========================================================================
  // 2. Database Model & Schema Tests (Module 2)
  // ==========================================================================
  describe('Module 2: Database Relational Schema Validation', () => {
    test('schema.sql exists and contains all three core entities with relational constraints', () => {
      const schemaPath = path.join(rootDir, 'docs', 'database', 'schema.sql');
      assert.ok(fs.existsSync(schemaPath), 'schema.sql must exist in docs/database/');

      const sql = fs.readFileSync(schemaPath, 'utf8');

      // Verify Table 1: PatientProfile
      assert.ok(sql.includes('CREATE TABLE PatientProfile'), 'Must define PatientProfile table');
      assert.ok(sql.includes('patient_id VARCHAR'), 'PatientProfile must have patient_id');
      assert.ok(sql.includes('PRIMARY KEY'), 'Must define PRIMARY KEY');
      assert.ok(sql.includes('caregiver_name'), 'PatientProfile must have caregiver_name');

      // Verify Table 2: MedicationSchedule
      assert.ok(sql.includes('CREATE TABLE MedicationSchedule'), 'Must define MedicationSchedule table');
      assert.ok(sql.includes('medication_id VARCHAR'), 'MedicationSchedule must have medication_id');
      assert.ok(sql.includes('medicine_name'), 'MedicationSchedule must have medicine_name');
      assert.ok(sql.includes('dosage'), 'MedicationSchedule must have dosage');
      assert.ok(sql.includes('exact_time'), 'MedicationSchedule must have exact_time');
      assert.ok(sql.includes('duration_days'), 'MedicationSchedule must have duration_days');
      assert.ok(sql.includes('REFERENCES PatientProfile'), 'MedicationSchedule must foreign-key to PatientProfile');

      // Verify Table 3: AdherenceLog
      assert.ok(sql.includes('CREATE TABLE AdherenceLog'), 'Must define AdherenceLog table');
      assert.ok(sql.includes('log_id VARCHAR'), 'AdherenceLog must have log_id');
      assert.ok(sql.includes('REFERENCES PatientProfile'), 'AdherenceLog must foreign-key to PatientProfile');
      assert.ok(sql.includes('REFERENCES MedicationSchedule'), 'AdherenceLog must foreign-key to MedicationSchedule');
      
      // Verify Status Constraint
      assert.ok(
        sql.includes("CHECK (status IN ('taken', 'pending', 'missed'))") ||
        sql.includes("CHECK(status IN ('taken', 'pending', 'missed'))"),
        'AdherenceLog must enforce status check constraint: taken, pending, missed'
      );
    });
  });

  // ==========================================================================
  // 3. UI/UX Prototype Data State Tests (Module 3)
  // ==========================================================================
  describe('Module 3: Caregiver Dashboard & Timeline Model State', () => {
    test('adherence calculation logic correctly handles Taken, Pending, and Missed states', () => {
      const mockDoses = [
        { id: '1', medicineName: 'Telmisartan 40mg', exactTime: '08:00', status: 'taken' },
        { id: '2', medicineName: 'Metformin 500mg', exactTime: '13:00', status: 'missed' },
        { id: '3', medicineName: 'Amlodipine 5mg', exactTime: '21:00', status: 'pending' },
      ];

      const summary = summarizeDoses(mockDoses);
      assert.equal(summary.total, 3);
      assert.equal(summary.taken, 1);
      assert.equal(summary.missed, 1);
      assert.equal(summary.pending, 1);

      // pending doses are excluded: 1 taken / (1 taken + 1 missed)
      assert.equal(adherenceRate(summary), 50);
    });

    test('validates 12-hour time formatter across all time slots', () => {
      assert.equal(formatTime12h('08:00'), '8:00 AM');
      assert.equal(formatTime12h('13:00'), '1:00 PM');
      assert.equal(formatTime12h('21:00'), '9:00 PM');
      assert.equal(formatTime12h('00:00'), '12:00 AM');
    });
  });

  // ==========================================================================
  // 4. API & Security Tests (Module 1)
  // ==========================================================================
  describe('Module 1: Serverless API & Security Constraints', () => {
    test('parse-prescription route file exists and does not expose client secrets', () => {
      const routePath = path.join(rootDir, 'app', 'api', 'parse-prescription', 'route.ts');
      assert.ok(fs.existsSync(routePath), 'API route must exist at app/api/parse-prescription/route.ts');

      const routeContent = fs.readFileSync(routePath, 'utf8');

      // Verify server-side secret usage
      assert.ok(routeContent.includes('process.env.GEMINI_API_KEY'), 'Must access GEMINI_API_KEY on server');
      assert.ok(!routeContent.includes('NEXT_PUBLIC_GEMINI_API_KEY'), 'Must NOT use client-exposed NEXT_PUBLIC_ for API key');

      // Verify 400 Bad Request error handling for missing image
      assert.ok(routeContent.includes('status: 400'), 'Must return status 400 when image is missing');
    });

    test('verifies all Phase-2 endpoints are deactivated/removed', () => {
      const consultationApi = path.join(rootDir, 'app', 'api', 'summarize-consultation');
      const healthInsightsApi = path.join(rootDir, 'app', 'api', 'health-insights');
      const consultationPage = path.join(rootDir, 'app', 'consultation');
      const reportPage = path.join(rootDir, 'app', 'report');

      assert.ok(!fs.existsSync(consultationApi), 'app/api/summarize-consultation must be removed');
      assert.ok(!fs.existsSync(healthInsightsApi), 'app/api/health-insights must be removed');
      assert.ok(!fs.existsSync(consultationPage), 'app/consultation page must be removed');
      assert.ok(!fs.existsSync(reportPage), 'app/report page must be removed');
    });
  });

  // ==========================================================================
  // 5. Team Attribution & Documentation Verification
  // ==========================================================================
  describe('Phase-1 Documentation & Attribution Verification', () => {
    test('team-contributions.md exists and contains all 5 team members with exact registration numbers', () => {
      const docPath = path.join(rootDir, 'docs', 'team-contributions.md');
      assert.ok(fs.existsSync(docPath), 'team-contributions.md must exist');

      const content = fs.readFileSync(docPath, 'utf8');
      assert.ok(content.includes('Sahil Sahani') && content.includes('23BCE10123'));
      assert.ok(content.includes('Kavyansh Vats') && content.includes('23BCE10301'));
      assert.ok(content.includes('Samiksha Vijayvargiya') && content.includes('23BCE10725'));
      assert.ok(content.includes('Pakhi Shukla') && content.includes('23BCE10847'));
      assert.ok(content.includes('Tanushri Sukhwal') && content.includes('23BCE10680'));
    });

    test('PHASE_1_REVIEW_2.md report exists and documents the four executed modules', () => {
      const docPath = path.join(rootDir, 'docs', 'PHASE_1_REVIEW_2.md');
      assert.ok(fs.existsSync(docPath), 'PHASE_1_REVIEW_2.md must exist');

      const content = fs.readFileSync(docPath, 'utf8');
      assert.ok(content.includes('Module 1 — System Architecture'));
      assert.ok(content.includes('Module 2 — Database Schema'));
      assert.ok(content.includes('Module 3 — UI/UX Prototyping'));
      assert.ok(content.includes('Module 4 — AI Proof of Concept'));
      assert.ok(content.includes('Current Limitations'));
      assert.ok(content.includes('Phase Boundary'));
    });

    test('tts-evaluation.md exists for Pakhi Shukla contribution', () => {
      const docPath = path.join(rootDir, 'docs', 'ui', 'tts-evaluation.md');
      assert.ok(fs.existsSync(docPath), 'tts-evaluation.md must exist');

      const content = fs.readFileSync(docPath, 'utf8');
      assert.ok(content.includes('Pakhi Shukla') && content.includes('23BCE10847'));
      assert.ok(content.includes('SpeechSynthesis') || content.includes('Web Speech API'));
    });
  });

});

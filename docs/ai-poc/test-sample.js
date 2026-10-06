/**
 * AI Proof-of-Concept Sample Validator
 * Validates the benchmark sample prescription JSON against the Phase-1 Review 2 schema.
 */

const fs = require('fs');
const path = require('path');

function validateSampleOutput() {
  const filePath = path.join(__dirname, 'sample-output.json');
  console.log(`[AI PoC Test] Reading sample output from: ${filePath}`);

  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);

  // 1. Verify patient field
  if (!data.patient || typeof data.patient !== 'string') {
    throw new Error('Validation Failed: "patient" field missing or not a string.');
  }
  console.log(`✓ Patient validated: ${data.patient}`);

  // 2. Verify medications array
  if (!Array.isArray(data.medications) || data.medications.length === 0) {
    throw new Error('Validation Failed: "medications" field missing or not a non-empty array.');
  }
  console.log(`✓ Medications array length: ${data.medications.length}`);

  // 3. Verify each medication structure
  const requiredFields = ['name', 'dosage', 'timing', 'duration_days'];
  data.medications.forEach((med, index) => {
    requiredFields.forEach((field) => {
      if (med[field] === undefined || med[field] === null || med[field] === '') {
        throw new Error(`Validation Failed: Medication #${index + 1} is missing required field "${field}".`);
      }
    });

    if (typeof med.duration_days !== 'number' || med.duration_days <= 0) {
      throw new Error(`Validation Failed: Medication #${index + 1} duration_days must be a positive integer.`);
    }

    console.log(`  ✓ Medication ${index + 1}: ${med.name} (${med.dosage}) - ${med.timing}, ${med.duration_days} days`);
  });

  console.log('\n[PASS] AI PoC Sample Output successfully passed all schema validation checks.');
  return true;
}

if (require.main === module) {
  try {
    validateSampleOutput();
    process.exit(0);
  } catch (err) {
    console.error(`\n[FAIL] ${err.message}`);
    process.exit(1);
  }
}

module.exports = { validateSampleOutput };

# CareCompanion AI: missed-dose risk model and service

> **Synthetic data only.** The model is trained and evaluated on simulated patients produced by `generate_synthetic_data.py`. Its scores say nothing about real-world or clinical validity. The risk thresholds (0.30 and 0.60) are prototype values, not medically validated. Risk bands are an indicator for caregiver follow-up, not a diagnosis.

## What this does

A scikit-learn model estimates the probability that a patient's **next scheduled dose will be missed**. A small FastAPI service exposes it to the Next.js app:

- `POST /predict-risk` scores one patient from the history the app sends.
- `GET /cohort-risk` returns precomputed scores for all 250 synthetic patients at the reporting cutoff.
- `GET /model-metrics` returns `metrics.json` (cross-validation, test results, importances, reliability notes).
- `GET /health` reports whether the model and data loaded.

## Files

| File | Purpose |
|---|---|
| `generate_synthetic_data.py`, `data/` | Synthetic dataset and its [data card](data/DATA_CARD.md) |
| `features.py` | The one feature definition used by training and the API, plus dataset loading and the batch builder |
| `train_model.py` | Builds the training table, selects a model, writes `models/adherence_risk.joblib` and `metrics.json` |
| `explain.py` | Scoring and per-prediction explanation, shared by `/predict-risk` and `/cohort-risk` |
| `api.py` | FastAPI app (`app`) |
| `tests/` | pytest suite (data, features, saved training artifacts, API) |

## Setup and commands

From the repository root:

```bash
python3 -m venv ml/.venv
ml/.venv/bin/pip install -r ml/requirements.txt

ml/.venv/bin/python ml/generate_synthetic_data.py     # regenerate data (byte-identical for the same seed)
ml/.venv/bin/python ml/train_model.py                 # train, evaluate, write model + metrics.json (~15 s)
cd ml && .venv/bin/python -m pytest tests -q          # run the tests (train first: they read the saved artifacts)
cd ml && .venv/bin/uvicorn api:app --port 8000        # run the API
```

If `models/adherence_risk.joblib` is missing the API still starts in degraded mode: `/health` reports `"status": "degraded"` and `/predict-risk` and `/cohort-risk` return 503. The service does not log request bodies or patient data.

## Prediction target

Probability that the patient's next scheduled dose is missed, meaning **not taken within 120 minutes of the scheduled time**. A dose taken later than that counts as missed, as in the data.

## Features

Computed by `features.compute_features(history, profile, activity_dates, knowledge_time, target_time)`. Training and the API call the same code.

| Feature | Label | Definition |
|---|---|---|
| `adherence_7d` | Adherence over the last 7 days | taken / (taken + missed) over resolved doses in the 7x24 h before the knowledge time; empty if none |
| `missed_7d` | Missed doses in the last 7 days | missed count in that window |
| `last_dose_missed` | Most recent dose was missed | 1/0 for the most recent resolved dose; empty if none |
| `reminder_ack_rate` | Reminder acknowledgement rate (last 14 days) | acknowledged / sent over resolved doses in the last 14 days; empty if none sent |
| `reminder_enabled` | Reminders switched on | 1/0 from the profile |
| `active_days_7d` | Days the app was opened (last 7 days) | distinct activity dates in the 7 calendar days before the knowledge date (the knowledge date itself is excluded) |
| `median_delay_min` | Typical delay before taking a dose (minutes, last 14 days) | median `delay_minutes` of taken doses in the last 14 days; empty if none |
| `daily_med_count` | Daily medicines | profile |
| `caregiver_support` | Family caregiver support | 1 if family, else 0 |
| `chronic_condition_count` | Chronic conditions | profile |
| `age_band` | Age band | 0 for 60-69, 1 for 70-79, 2 for 80+ |
| `slot` | Time of day of the next dose | from the target dose time: morning before 12:00, afternoon before 17:00, evening before 20:00, otherwise night |
| `is_weekend` | Next dose falls on a weekend | 1/0 from the target dose date |

Window edges: a dose is in the 7-day (14-day) window when it was scheduled strictly after `knowledge_time - 7 days` (`- 14 days`).

**Leakage rule.** A dose contributes to the features only if `scheduled_at + 120 minutes <= knowledge_time`, so its outcome was already final. The dose being predicted, any dose whose window is still open, and every `pending` row never contribute. `tests/test_features.py` changes the outcome of every such dose and checks that the features do not move.

Deliberately **not** used: `engagement_level` (the generator's hidden trait; using it would hand the model the simulation's ground truth) and `preferred_language` (no effect by construction).

## Training and evaluation

1. **Examples.** One per resolved (`taken` or `missed`) dose dated at least 7 days after the start of the data. Knowledge time and target time are both that dose's scheduled time. `pending` doses are never targets.
2. **Split.** `GroupShuffleSplit(test_size=0.2, random_state=42)` by patient, so no patient is in both sets (asserted in the code).
3. **Preprocessing.** Numeric features: median imputation (plus standardisation for logistic regression). `slot`: one-hot encoding.
4. **Candidates.** `baseline_prior` (predicts the training class share; reference only), `logistic_regression` (`max_iter=1000`), `random_forest` (200 trees, `max_depth=8`, `min_samples_leaf=50`, `random_state=42`).
5. **Selection.** `GroupKFold(n_splits=5)` cross-validation on the training patients only, scored by ROC-AUC. The better of logistic regression and random forest by mean CV ROC-AUC is saved. The test patients play no part in the choice.
6. **Test.** Every candidate is fitted on all training patients and evaluated once on the held-out patients at threshold 0.5.
7. **Importance.** `permutation_importance` on the test set for the selected model (ROC-AUC, 5 repeats), permuting the original feature columns.

The saved model is fitted on the training patients only, so the reported test numbers describe the deployed model.

## Results

Copied from `metrics.json` (model version `logistic_regression-83bd2537`). Re-run `train_model.py` and these numbers will change if the data or code changes.

**Data:** 43,512 examples; 200 training patients (35,338 examples) and 50 test patients (8,174 examples). Missed doses: 7,160 of 35,338 training examples (20.3%) and 1,756 of 8,174 test examples (21.5%).

**Cross-validation (training patients, 5 folds, ROC-AUC)**

| Model | Mean ROC-AUC | Std (5 folds) |
|---|---|---|
| `baseline_prior` | 0.5000 | 0.0000 |
| `logistic_regression` | 0.7807 | 0.0209 |
| `random_forest` | 0.7793 | 0.0208 |

Selected: **logistic regression** (0.781 vs 0.779). The gap (0.0014) is far smaller than the fold-to-fold spread (about 0.02), so the two candidates are effectively tied and the choice is not strongly supported.

**Held-out test patients (threshold 0.5)**

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC | Confusion matrix `[[tn, fp], [fn, tp]]` |
|---|---|---|---|---|---|---|
| `baseline_prior` | 0.7852 | 0.0000 | 0.0000 | 0.0000 | 0.5000 | `[[6418, 0], [1756, 0]]` |
| `logistic_regression` | 0.8361 | 0.6929 | 0.4254 | 0.5272 | 0.8040 | `[[6087, 331], [1009, 747]]` |
| `random_forest` | 0.8351 | 0.7012 | 0.4049 | 0.5134 | 0.8038 | `[[6115, 303], [1045, 711]]` |

At threshold 0.5 the selected model finds 42.5% of missed doses. Always predicting "taken" already scores 78.5% accuracy, so accuracy alone is misleading.

**Global feature importance (selected model; drop in test ROC-AUC when the feature is shuffled)**

| Feature | Importance | Std (5 repeats) |
|---|---|---|
| Adherence over the last 7 days (`adherence_7d`) | 0.0622 | 0.0033 |
| Most recent dose was missed (`last_dose_missed`) | 0.0137 | 0.0025 |
| Reminders switched on (`reminder_enabled`) | 0.0099 | 0.0016 |
| Missed doses in the last 7 days (`missed_7d`) | 0.0041 | 0.0021 |
| Reminder acknowledgement rate (last 14 days) (`reminder_ack_rate`) | 0.0031 | 0.0013 |
| Next dose falls on a weekend (`is_weekend`) | 0.0026 | 0.0006 |
| Days the app was opened (last 7 days) (`active_days_7d`) | 0.0019 | 0.0007 |
| Daily medicines (`daily_med_count`) | 0.0016 | 0.0005 |
| Time of day of the next dose (`slot`) | 0.0015 | 0.0007 |
| Family caregiver support (`caregiver_support`) | 0.0007 | 0.0003 |
| Age band (`age_band`) | 0.0007 | 0.0002 |
| Chronic conditions (`chronic_condition_count`) | 0.0002 | 0.0001 |
| Typical delay before taking a dose (minutes, last 14 days) (`median_delay_min`) | 0.0001 | 0.0001 |

Recent adherence dominates. That is expected: in the generator a missed dose makes the next one more likely to be missed, and some patients have multi-day "bad weeks", so recent behaviour carries most of the signal. Importance shows what this model leans on in this synthetic data, not what causes missed doses in real life.

## Reading the risk bands

| Band | Probability |
|---|---|
| low | below 0.30 |
| moderate | 0.30 up to (not including) 0.60 |
| high | 0.60 and above |

These cut-offs are prototype values chosen for the demo. They were not tuned on the results above, not calibrated, and not medically validated. Use a band to decide whom a caregiver might check in with first, never as a diagnosis or a reason to change treatment. The probability is a model score, not a literal frequency: no calibration check was done.

## How a single prediction is explained

Occlusion against typical values. For each feature the service replaces the patient's value with the typical value (training median, or most common `slot`), re-scores, and reports `effect = p_original - p_replaced`. Up to three features with `effect > 0.01` are returned, largest first, each with its label, the patient's value, the typical value and the effect.

This differs from the global importance table. Global importance says what the model relies on across the test patients. The per-prediction factors say what moved *this* estimate, and only upward (features that lower the estimate are not listed). Changing one feature at a time ignores interactions between features, and "typical" is a training median, not a clinical norm. Values are raw feature values (for example `age_band` is 0, 1 or 2).

## API

Base URL when run locally: `http://127.0.0.1:8000`. Times are naive local Asia/Kolkata, formatted `YYYY-MM-DDTHH:MM`; dates `YYYY-MM-DD`. There is no authentication; keep it on localhost or behind the web app's server.

### `GET /health`

```json
{"status": "ok", "model_loaded": true, "data_loaded": true, "model_version": "logistic_regression-83bd2537"}
```

`status` is `"degraded"` when the model or data is missing.

### `GET /model-metrics`

The contents of `metrics.json`; 503 if the file is missing.

### `POST /predict-risk`

`as_of` is the knowledge time and `next_dose_at` the dose being scored (must not be earlier than `as_of`). Unknown fields are rejected; invalid input returns 422 listing the field and reason without echoing the payload. 503 if the model is not loaded. Limits: 5,000 history items, 1,000 activity dates, `patient_id` 1 to 32 characters of `A-Za-z0-9_-`.

```json
{
  "patient_id": "P900",
  "as_of": "2026-10-13T14:00",
  "next_dose_at": "2026-10-13T18:00",
  "profile": {"age_band": "70-79", "chronic_condition_count": 2, "daily_med_count": 3,
              "caregiver_support": "none", "reminder_enabled": true},
  "dose_history": [
    {"scheduled_at": "2026-10-13T08:00", "status": "taken", "reminder_sent": true,
     "reminder_acknowledged": true, "delay_minutes": 10}
  ],
  "activity_dates": ["2026-10-12"]
}
```

Response (actual output for the request above):

```json
{
  "patient_id": "P900",
  "probability": 0.0775,
  "risk_band": "low",
  "model_version": "logistic_regression-83bd2537",
  "factors": [{"feature": "slot", "label": "Time of day of the next dose", "value": "evening",
               "typical_value": "morning", "effect": 0.0238}],
  "thresholds": {"moderate": 0.3, "high": 0.6},
  "note": "Prototype thresholds, not medically validated. Estimate for caregiver follow-up, not a diagnosis."
}
```

Send `status: "pending"` for doses whose outcome is not known; they are ignored. Doses whose 120-minute window has not closed by `as_of` are ignored too (leakage rule).

### `GET /cohort-risk?limit=N`

`limit` is 1 to 250 (default 250); anything else returns 422. The scores are computed once at startup with the same feature, prediction and explanation code as `/predict-risk`. Knowledge time is the reporting cutoff (2026-10-13T14:00). The target is each patient's next scheduled dose: the earliest dose time on the end date at or after 14:00, otherwise the earliest dose time on 2026-10-14. Sorted by probability (highest first), then `patient_id`. 503 if the model or data is not loaded.

```json
{
  "model_version": "logistic_regression-83bd2537",
  "reporting_cutoff": "2026-10-13T14:00",
  "timezone": "Asia/Kolkata",
  "thresholds": {"moderate": 0.3, "high": 0.6},
  "count": 1,
  "total": 250,
  "predictions": [{
    "patient_id": "P217", "probability": 0.9015, "risk_band": "high", "next_dose_at": "2026-10-13T17:45",
    "adherence_7d": 0.1111, "missed_7d": 24,
    "factors": [{"feature": "adherence_7d", "label": "Adherence over the last 7 days", "value": 0.1111,
                 "typical_value": 0.85, "effect": 0.3022}],
    "recent_days": [{"date": "2026-10-07", "taken": 1, "missed": 3, "pending": 0}]
  }]
}
```

(`factors` and `recent_days` are shortened here; the real response has up to 3 factors and 7 days.) `recent_days` covers the 7 calendar days ending on the end date, oldest first.

## Limitations

- **Synthetic data.** No real patient is represented. Rates, effect sizes and relationships were chosen by hand in the generator, so performance on this data is not evidence of performance anywhere else.
- **The model partly rediscovers the generator's rules.** Missed-dose streaks, "bad weeks", reminder and caregiver effects were written into the simulation; the model recovering them is expected.
- **Examples are correlated.** About 174 examples come from each patient, and only 50 patients are in the test set. The test metrics have no confidence intervals and are less certain than 8,174 examples would suggest. They come from a single split.
- **Class imbalance.** About one dose in five is missed; at threshold 0.5 recall is only 42.5%.
- **No calibration and no validated thresholds.** Probabilities were not checked for calibration; the bands are prototype values.
- **Training and serving differ slightly.** Training uses knowledge time equal to the target dose time. The cohort snapshot (14:00) scores doses that are later, so the latest doses may still be open there, a situation the training data never contains.
- **Simplified world.** One fixed schedule per medicine, no skipped days, refills, travel or illness; app use is independent of dose-taking apart from shared hidden traits.
- **Prototype service.** No authentication, no request-size limit beyond list caps, and the cohort snapshot is computed once at startup from the CSV files.

## What real use would require

- Real, consented patient data with an approved data-protection and privacy review, plus a stated way to handle missing and mis-recorded doses.
- A prospective or at least temporal (train earlier, test later) evaluation, subgroup checks (age, language, caregiver status), and calibration.
- Thresholds set with clinicians and caregivers against the cost of missed follow-ups versus false alarms, and a review of how the estimate is shown and used.
- Monitoring for drift after launch, and clinical and regulatory review before any decision depends on it.

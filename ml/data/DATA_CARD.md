# Data card: CareCompanion AI synthetic adherence dataset

## Purpose

Demonstration and development data for a medication-adherence analytics feature (dashboards and an ML pipeline that estimates the risk of missed doses). It lets the app and the model be built and tested end to end without any real patient information. It is not suitable for clinical decisions, research conclusions, or benchmarking against real populations.

## Provenance

- **Entirely synthetic.** Every row is produced by `ml/generate_synthetic_data.py` from a random number generator and hand-written rules. There are no real patients, and no names, contact details or identifiers of any kind.
- **Why synthetic.** No accessible, licensed, patient-level dataset suitable for this feature was found.
- **Background reading only.** The public data.gov / NIH catalogue entry "A cohort study of possible risk factors for over-reporting of antihypertensive adherence" only links to the article at https://www.ncbi.nlm.nih.gov/pmc/articles/PMC64641/. It offers no downloadable patient-level records and states no licence. It is cited as background reading and was **not used to generate rows**, set parameters, or calibrate anything.

## Files and fields

All files are UTF-8, comma separated, `\n` line endings, header row first. Booleans are the strings `true` / `false`. Missing values are empty strings.

### `patients.csv` (one row per patient)

| Column | Type | Allowed values |
|---|---|---|
| `patient_id` | string | `P001` ... `P250`, unique |
| `age_band` | string | `60-69`, `70-79`, `80+` |
| `chronic_condition_count` | int | 1 to 5 |
| `daily_med_count` | int | 1 to 4 (positively related to condition count) |
| `caregiver_support` | string | `none`, `family` |
| `reminder_enabled` | boolean | `true`, `false` |
| `preferred_language` | string | English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Spanish, French |
| `engagement_level` | string | `low`, `medium`, `high` (synthetic latent trait) |

### `dose_events.csv` (one row per scheduled dose per day)

| Column | Type | Allowed values |
|---|---|---|
| `event_id` | string | `E000001` ..., sequential after sorting by (`patient_id`, `event_date`, `scheduled_time`, `medication_id`) |
| `patient_id` | string | exists in `patients.csv` |
| `medication_id` | string | `{patient_id}-M{k}` with 1 <= k <= `daily_med_count` |
| `event_date` | date | `YYYY-MM-DD` |
| `scheduled_time` | time | `HH:MM`, between 07:30 and 21:30 |
| `reminder_sent` | boolean | `true` only if the patient has reminders enabled and the scheduled time is not after the reporting cutoff |
| `reminder_acknowledged` | boolean | always `false` when `reminder_sent` is `false` |
| `status` | string | `taken`, `missed`, `pending` |
| `taken_at` | datetime | `YYYY-MM-DD HH:MM`; filled only when `status` is `taken` |
| `delay_minutes` | int | 0 to the grace period (120); filled only when `status` is `taken` |

### `app_activity.csv` (one row per app session event)

| Column | Type | Allowed values |
|---|---|---|
| `activity_id` | string | `A000001` ..., sequential after sorting by (`patient_id`, `activity_date`, `activity_time`, `activity_type`) |
| `patient_id` | string | exists in `patients.csv` |
| `activity_date` | date | `YYYY-MM-DD` |
| `activity_time` | time | `HH:MM` |
| `activity_type` | string | `app_open`, `dashboard_view`, `reminder_response` |
| `reminder_interaction` | boolean | `true` exactly when `activity_type` is `reminder_response` |
| `dashboard_viewed` | boolean | `true` exactly when `activity_type` is `dashboard_view` |

### `metadata.json`

Generator arguments and conventions (seed, dates, grace period, cutoff, timezone) with `"synthetic": true`. Keys are sorted.

## Generation rules

Everything below is a modelling choice made for the demo, not a statement about real people.

**Patients.** Age band, condition count, caregiver support, reminder setting, language and engagement level are drawn at random. Older bands tend to have more conditions, and the number of daily medicines grows with the number of conditions. Reminders are more likely to be on for higher-engagement patients. Each patient also gets hidden traits that are never written out: a random patient effect, an optional gradual decline over the period (about one patient in five), an optional one or two "bad week" episodes of 5 to 10 days (about one patient in three), and a schedule offset.

**Schedule.** Medication k has one fixed daily slot. One medicine: 08:00. Two: 08:00 and 21:00. Three: 08:00, 13:00 and 21:00. Four: 08:00, 13:00, 18:00 and 21:00. Each patient's slots are shifted by one offset drawn once from -30, -15, 0, 15 or 30 minutes.

**Taking a dose.** The chance of taking a dose is a logistic function of:

- Raises it: high engagement, family caregiver support, reminders enabled, and the reminder for this dose having been acknowledged.
- Lowers it: low engagement, more daily medicines, age 80+ (and slightly 70-79), a lower afternoon and evening slot, weekends, having missed the previous dose, a bad week (strongly), and the gradual decline for the patients that have one.
- A per-patient random effect shifts it up or down.

**Acknowledging a reminder.** If a reminder was sent, it is acknowledged with probability 0.35 (low), 0.60 (medium) or 0.80 (high engagement), reduced by 40% during bad weeks.

**Delay.** A patient who takes a dose does so after a delay drawn from a lognormal distribution, shorter when the reminder was acknowledged (median 12 minutes versus 30). If the delay exceeds the grace period, the dose counts as `missed` and `taken_at` / `delay_minutes` stay empty.

**App activity.** Generated only from engagement level, bad weeks and day of week, never from whether doses were taken. App use is not evidence of taking medicine. Some patient-days have no activity. Patients with reminders off have no `reminder_response` rows. The latent engagement level and bad weeks drive both dose-taking and app activity, so the two are correlated through those shared causes only.

## Reporting boundaries

- **Timezone:** all dates and times are naive local times in Asia/Kolkata (IST, UTC+05:30). There are no UTC offsets in the files.
- **Date range:** 2026-07-16 to 2026-10-13 inclusive (90 days).
- **Reporting cutoff:** 2026-10-13 at 14:00.
- **Grace period:** 120 minutes. A dose is on time if taken within 120 minutes of its scheduled time.
- A dose may be `missed` only once its scheduled time plus 120 minutes is at or before the cutoff.
- **`pending`** means the outcome is not known yet at the cutoff: scheduled time plus 120 minutes is after the cutoff and the dose was not taken by the cutoff. It includes every dose scheduled after 14:00 on the end date. `pending` occurs only on the end date and has empty `taken_at` and `delay_minutes`. Pending doses should be excluded when computing adherence.
- Reminders are only sent for doses scheduled at or before the cutoff. App activity on the end date stops at 14:00.

## Reproduction

```
ml/.venv/bin/python ml/generate_synthetic_data.py
```

Defaults: `--seed 42 --end-date 2026-10-13 --days 90 --cutoff 14:00 --grace-minutes 120 --patients 250`. The same seed and arguments produce byte-identical files (`ml/tests/test_data.py` checks this).

## Summary statistics

Printed by the generator for the committed files (seed 42, default arguments):

```
patients: 250  dose_events: 47430  app_activity: 26002
patient mix: low=74, medium=92, high=84; family support=110; reminders on=173
doses: taken=37639 missed=9562 pending=229
missed share among resolved doses: 0.2026
missed share by reminder setting: on=0.1427, off=0.3464
per-patient adherence (taken/resolved): min=0.0670 median=0.8663 max=0.9944; <0.50: 18 patients; >=0.95: 45 patients
activity types: app_open=12351, dashboard_view=6570, reminder_response=7081
active patients on 2026-10-13 (until cutoff): 113
daily active patients: min=109 median=146 max=164
```

"Resolved" means `taken` or `missed`. Per-patient adherence is taken divided by resolved doses. The gap between reminders on and off is a direct result of the rules above, not a finding.

## Assumptions

- One fixed daily time slot per medication, the same every day, with a single per-patient offset.
- One reminder per dose, sent only if the patient has reminders enabled.
- A dose taken after the 120-minute grace period is treated as missed.
- Effect sizes in the rules were chosen by hand so the overall missed share lands in a plausible demo range with wide variation between patients.

## Limitations

- Synthetic: it does not describe any real person or population, and its rates and relationships say nothing about real-world prevalence or about what drives non-adherence in practice.
- Not clinical: not validated, and not for diagnosis, treatment or care decisions.
- Any model trained on it learns the generator's rules back, so model quality here is not evidence of real-world performance.
- Simplified schedules: no skipped days, dose changes, refills, travel, hospital stays, or medicines taken with food.
- App activity is independent of dose-taking by construction, apart from shared latent drivers.
- Preferred language is assigned independently of every other field and has no effect on adherence; the age, language and engagement mixes are arbitrary.

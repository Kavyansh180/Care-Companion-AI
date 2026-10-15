#!/usr/bin/env python3
"""Generate SYNTHETIC medication-adherence data for CareCompanion AI.

No real patients. All dates/times are naive local times in Asia/Kolkata (IST, UTC+05:30).
Same arguments -> byte-identical files (numpy default_rng only, fixed draw order).
"""
import argparse
import csv
import json
import math
from datetime import date, datetime, time, timedelta
from pathlib import Path

import numpy as np

AGE_BANDS = ["60-69", "70-79", "80+"]
AGE_P = [0.45, 0.35, 0.20]
AGE_COND_P = {"60-69": 0.30, "70-79": 0.40, "80+": 0.50}  # binomial(4, p) + 1 conditions
AGE_LOGIT = {"60-69": 0.0, "70-79": -0.1, "80+": -0.4}
LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi",
             "Bengali", "Spanish", "French"]
LANG_P = [0.30, 0.18, 0.08, 0.08, 0.06, 0.06, 0.06, 0.06, 0.07, 0.05]
ENGAGEMENT = ["low", "medium", "high"]
ENG_P = [0.30, 0.40, 0.30]
REMINDER_P = {"low": 0.45, "medium": 0.70, "high": 0.85}
ENG_LOGIT = {"low": -0.9, "medium": 0.0, "high": 0.7}
ACK_P = {"low": 0.35, "medium": 0.60, "high": 0.80}
ACTIVE_P = {"low": 0.35, "medium": 0.60, "high": 0.85}  # chance of any app use on a day
EXTRA_SESSIONS = {"low": 0.3, "medium": 0.8, "high": 1.5}  # poisson mean on top of 1
RESPONSE_P = {"low": 0.20, "medium": 0.30, "high": 0.40}  # only if reminders are enabled
DASHBOARD_P = {"low": 0.10, "medium": 0.20, "high": 0.30}
SLOTS = {1: [480], 2: [480, 1260], 3: [480, 780, 1260], 4: [480, 780, 1080, 1260]}  # minutes
INTERCEPT = 2.6
PATIENT_HEADER = ["patient_id", "age_band", "chronic_condition_count", "daily_med_count",
                  "caregiver_support", "reminder_enabled", "preferred_language", "engagement_level"]
DOSE_HEADER = ["event_id", "patient_id", "medication_id", "event_date", "scheduled_time",
               "reminder_sent", "reminder_acknowledged", "status", "taken_at", "delay_minutes"]
ACTIVITY_HEADER = ["activity_id", "patient_id", "activity_date", "activity_time", "activity_type",
                   "reminder_interaction", "dashboard_viewed"]


def tf(b):
    return "true" if b else "false"


def hhmm(minutes):
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def make_patients(rng, n, days):
    patients = []
    for i in range(1, n + 1):
        age = str(rng.choice(AGE_BANDS, p=AGE_P))
        conditions = 1 + int(rng.binomial(4, AGE_COND_P[age]))
        meds = int(np.clip(round(0.7 * conditions + rng.normal(0.3, 0.6)), 1, 4))
        eng = str(rng.choice(ENGAGEMENT, p=ENG_P))
        family = bool(rng.random() < (0.50 if age == "80+" else 0.35))
        reminders = bool(rng.random() < REMINDER_P[eng])
        lang = str(rng.choice(LANGUAGES, p=LANG_P))
        # Latent traits: used by the simulation, never written out.
        bad = np.zeros(days, dtype=bool)
        if rng.random() < 0.35:  # some patients have 1-2 "bad week" episodes of 5-10 days
            for _ in range(int(rng.integers(1, 3))):
                length = int(rng.integers(5, 11))
                start = int(rng.integers(0, max(days - length, 0) + 1))
                bad[start:start + length] = True
        patients.append({
            "patient_id": f"P{i:03d}", "age_band": age, "chronic_condition_count": conditions,
            "daily_med_count": meds, "caregiver_support": "family" if family else "none",
            "reminder_enabled": reminders, "preferred_language": lang, "engagement_level": eng,
            "effect": float(rng.normal(0, 1.0)),
            "decline": float(rng.uniform(1.0, 2.5)) if rng.random() < 0.20 else 0.0,
            "offset": int(rng.choice([-30, -15, 0, 15, 30])),
            "bad": bad,
        })
    return patients


def simulate_doses(rng, p, start, days, grace, cutoff):
    n, eng = p["daily_med_count"], p["engagement_level"]
    shape = (days, n)
    u_ack, u_take, z = rng.random(shape), rng.random(shape), rng.standard_normal(shape)
    base = (INTERCEPT + ENG_LOGIT[eng] + AGE_LOGIT[p["age_band"]] + p["effect"]
            - 0.25 * (n - 1) + (0.5 if p["caregiver_support"] == "family" else 0.0)
            + (0.4 if p["reminder_enabled"] else 0.0))
    rows, prev_missed = [], False
    for d in range(days):
        day = start + timedelta(days=d)
        bad = bool(p["bad"][d])
        for k, slot in enumerate(SLOTS[n]):
            minute = slot + p["offset"]
            sched = datetime.combine(day, time()) + timedelta(minutes=minute)
            sent = p["reminder_enabled"] and sched <= cutoff
            ack = bool(sent and u_ack[d, k] < ACK_P[eng] * (0.6 if bad else 1.0))
            logit = (base - p["decline"] * d / max(days - 1, 1)
                     + (0.0 if minute < 720 else -0.2 if minute < 1020 else -0.3)  # time of day
                     - (0.3 if day.weekday() >= 5 else 0.0)
                     - (0.8 if prev_missed else 0.0)
                     - (2.0 if bad else 0.0)
                     + (0.6 if ack else 0.0))
            takes = u_take[d, k] < 1 / (1 + math.exp(-logit))
            median, sigma = (12, 0.8) if ack else (30, 0.9)  # lognormal delay, faster if acked
            delay = int(round(median * math.exp(sigma * z[d, k])))
            in_window = bool(takes) and delay <= grace  # a late "take" counts as missed
            prev_missed = not in_window
            taken_at = sched + timedelta(minutes=delay)
            if sched + timedelta(minutes=grace) <= cutoff:  # window closed: outcome is final
                status = "taken" if in_window else "missed"
            else:  # window still open at the reporting cutoff
                status = "taken" if in_window and taken_at <= cutoff else "pending"
            rows.append((p["patient_id"], f"{p['patient_id']}-M{k + 1}", day.isoformat(),
                         hhmm(minute), tf(sent), tf(ack), status,
                         taken_at.strftime("%Y-%m-%d %H:%M") if status == "taken" else "",
                         delay if status == "taken" else ""))
    return rows


def simulate_activity(rng, p, start, days, cutoff):
    # Deliberately independent of dose outcomes: app use is not evidence of taking medicine.
    eng, rows = p["engagement_level"], []
    resp = RESPONSE_P[eng] if p["reminder_enabled"] else 0.0
    for d in range(days):
        day = start + timedelta(days=d)
        p_active = ACTIVE_P[eng] * (0.5 if p["bad"][d] else 1.0) * (0.85 if day.weekday() >= 5 else 1.0)
        if rng.random() >= p_active:
            continue
        for _ in range(1 + int(rng.poisson(EXTRA_SESSIONS[eng]))):
            minute, r = int(rng.integers(7 * 60, 22 * 60 + 30)), rng.random()
            if day == cutoff.date() and minute > cutoff.hour * 60 + cutoff.minute:
                continue
            kind = ("reminder_response" if r < resp else
                    "dashboard_view" if r < resp + DASHBOARD_P[eng] else "app_open")
            rows.append((p["patient_id"], day.isoformat(), hhmm(minute), kind,
                         tf(kind == "reminder_response"), tf(kind == "dashboard_view")))
    return rows


def write_csv(path, header, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(header)
        w.writerows(rows)


def numbered(prefix, rows, key):
    return [(f"{prefix}{i:06d}", *r) for i, r in enumerate(sorted(rows, key=key), 1)]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--end-date", type=date.fromisoformat, default=date(2026, 10, 13))
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--cutoff", type=time.fromisoformat, default=time(14, 0), help="HH:MM on end date")
    ap.add_argument("--grace-minutes", type=int, default=120)
    ap.add_argument("--patients", type=int, default=250)
    ap.add_argument("--out-dir", type=Path, default=Path(__file__).parent / "data")
    a = ap.parse_args(argv)

    start = a.end_date - timedelta(days=a.days - 1)
    cutoff = datetime.combine(a.end_date, a.cutoff)
    rng = np.random.default_rng(a.seed)
    patients = make_patients(rng, a.patients, a.days)
    doses, activity = [], []
    for p in patients:  # fixed order: all draws for one patient, then the next
        doses += simulate_doses(rng, p, start, a.days, a.grace_minutes, cutoff)
        activity += simulate_activity(rng, p, start, a.days, cutoff)

    dose_rows = numbered("E", doses, key=lambda r: (r[0], r[2], r[3], r[1]))  # patient, date, time, med
    activity_rows = numbered("A", activity, key=lambda r: (r[0], r[1], r[2], r[3]))

    a.out_dir.mkdir(parents=True, exist_ok=True)
    write_csv(a.out_dir / "patients.csv", PATIENT_HEADER,
              [[p[c] if c != "reminder_enabled" else tf(p[c]) for c in PATIENT_HEADER] for p in patients])
    write_csv(a.out_dir / "dose_events.csv", DOSE_HEADER, dose_rows)
    write_csv(a.out_dir / "app_activity.csv", ACTIVITY_HEADER, activity_rows)
    meta = {"days": a.days, "end_date": a.end_date.isoformat(), "generator": "ml/generate_synthetic_data.py",
            "grace_minutes": a.grace_minutes, "patients": a.patients,
            "reporting_cutoff": f"{a.end_date.isoformat()}T{a.cutoff:%H:%M}", "seed": a.seed,
            "start_date": start.isoformat(), "synthetic": True, "timezone": "Asia/Kolkata"}
    (a.out_dir / "metadata.json").write_text(json.dumps(meta, indent=2, sort_keys=True) + "\n")

    summarize(patients, dose_rows, activity_rows, a.end_date.isoformat(), a.out_dir)


def summarize(patients, dose_rows, activity_rows, end_date, out_dir):
    status = [r[7] for r in dose_rows]
    taken, missed, pending = (status.count(s) for s in ("taken", "missed", "pending"))
    per = {}
    for r in dose_rows:
        if r[7] != "pending":
            t, n = per.get(r[1], (0, 0))
            per[r[1]] = (t + (r[7] == "taken"), n + 1)
    adh = np.array(sorted(t / n for t, n in per.values()))
    by_day = {}
    for r in activity_rows:
        by_day.setdefault(r[2], set()).add(r[1])
    daily = np.array([len(s) for s in by_day.values()])
    kinds = [r[4] for r in activity_rows]
    on = {p["patient_id"]: p["reminder_enabled"] for p in patients}
    share = {v: [0, 0] for v in (True, False)}  # [missed, resolved] by reminder setting
    for r in dose_rows:
        if r[7] != "pending":
            share[on[r[1]]][0] += r[7] == "missed"
            share[on[r[1]]][1] += 1
    count = lambda key, val: sum(p[key] == val for p in patients)
    print(f"wrote {out_dir}")
    print(f"patients: {len(patients)}  dose_events: {len(dose_rows)}  app_activity: {len(activity_rows)}")
    print("patient mix: " + ", ".join(f"{k}={count('engagement_level', k)}" for k in ENGAGEMENT)
          + f"; family support={count('caregiver_support', 'family')}; reminders on={count('reminder_enabled', True)}")
    print(f"doses: taken={taken} missed={missed} pending={pending}")
    print(f"missed share among resolved doses: {missed / (taken + missed):.4f}")
    print("missed share by reminder setting: " + ", ".join(
        f"{'on' if k else 'off'}={m / n:.4f}" for k, (m, n) in share.items()))
    print(f"per-patient adherence (taken/resolved): min={adh.min():.4f} median={np.median(adh):.4f} "
          f"max={adh.max():.4f}; <0.50: {(adh < 0.5).sum()} patients; >=0.95: {(adh >= 0.95).sum()} patients")
    print("activity types: " + ", ".join(f"{k}={kinds.count(k)}" for k in
                                          ("app_open", "dashboard_view", "reminder_response")))
    print(f"active patients on {end_date} (until cutoff): {len(by_day.get(end_date, ()))}")
    print(f"daily active patients: min={daily.min()} median={int(np.median(daily))} max={daily.max()}")


if __name__ == "__main__":
    main()

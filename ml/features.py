"""Feature engineering shared by training and the API.

`compute_features` is the only place features are defined. Training calls the same core
(`_features`) once per dose, so there is no train/serve skew.

LEAKAGE RULE: a dose contributes only if `scheduled_at + grace_minutes <= knowledge_time`
(its outcome is final by then). Pending rows are dropped on ingestion and never contribute.
All times are naive local (Asia/Kolkata) datetimes.
"""
import csv
import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).resolve().parent / "data"
GRACE_MINUTES = 120
MIN_HISTORY_DAYS = 7  # a training target needs a week of history before it

FEATURE_LABELS = {
    "adherence_7d": "Adherence over the last 7 days",
    "missed_7d": "Missed doses in the last 7 days",
    "last_dose_missed": "Most recent dose was missed",
    "reminder_ack_rate": "Reminder acknowledgement rate (last 14 days)",
    "reminder_enabled": "Reminders switched on",
    "active_days_7d": "Days the app was opened (last 7 days)",
    "median_delay_min": "Typical delay before taking a dose (minutes, last 14 days)",
    "daily_med_count": "Daily medicines",
    "caregiver_support": "Family caregiver support",
    "chronic_condition_count": "Chronic conditions",
    "age_band": "Age band",
    "slot": "Time of day of the next dose",
    "is_weekend": "Next dose falls on a weekend",
}
FEATURES = list(FEATURE_LABELS)
CATEGORICAL = ["slot"]
NUMERIC = [f for f in FEATURES if f not in CATEGORICAL]
AGE_BAND_CODE = {"60-69": 0, "70-79": 1, "80+": 2}

_EPOCH = datetime(1970, 1, 1)
_MIN_PER_DAY = 1440


def _mins(dt):
    return (dt - _EPOCH) // timedelta(minutes=1)


def slot_of(dt):
    minute = dt.hour * 60 + dt.minute
    return "morning" if minute < 720 else "afternoon" if minute < 1020 else "evening" if minute < 1200 else "night"


class _History:
    """Resolved (taken/missed) doses sorted by scheduled time, as flat arrays for window slicing."""

    def __init__(self, rows):
        rows = [r for r in rows if r["status"] in ("taken", "missed")]
        sched = np.array([_mins(r["scheduled_at"]) for r in rows], dtype=np.int64)
        missed = np.array([r["status"] == "missed" for r in rows], dtype=bool)
        sent = np.array([bool(r["reminder_sent"]) for r in rows], dtype=bool)
        ack = np.array([bool(r["reminder_acknowledged"]) for r in rows], dtype=bool) & sent
        delay = np.array([np.nan if r["status"] == "missed" or r["delay_minutes"] is None
                          else float(r["delay_minutes"]) for r in rows], dtype=float)
        order = np.lexsort((missed, sched))  # equal times: missed sorts last, so input order never matters
        self.sched, self.missed, self.sent, self.ack, self.delay = (
            a[order] for a in (sched, missed, sent, ack, delay))


def _day_index(activity_dates):
    return np.unique(np.array([d.toordinal() for d in activity_dates], dtype=np.int64))


def _features(h, profile, active_days, knowledge_time, target_time, grace):
    k = _mins(knowledge_time)
    hi = int(np.searchsorted(h.sched, k - grace, side="right"))  # prefix pointer: sched + grace <= k
    lo7 = min(int(np.searchsorted(h.sched, k - 7 * _MIN_PER_DAY, side="right")), hi)
    lo14 = min(int(np.searchsorted(h.sched, k - 14 * _MIN_PER_DAY, side="right")), hi)

    n7, missed7 = hi - lo7, int(h.missed[lo7:hi].sum())
    sent14 = int(h.sent[lo14:hi].sum())
    taken_delay = h.delay[lo14:hi][~h.missed[lo14:hi]]
    taken_delay = taken_delay[~np.isnan(taken_delay)]
    kd = knowledge_time.date().toordinal()  # the knowledge date itself is excluded
    active = int(np.searchsorted(active_days, kd) - np.searchsorted(active_days, kd - 7))

    return {
        "adherence_7d": (n7 - missed7) / n7 if n7 else np.nan,
        "missed_7d": missed7,
        "last_dose_missed": float(h.missed[hi - 1]) if hi else np.nan,
        "reminder_ack_rate": h.ack[lo14:hi].sum() / sent14 if sent14 else np.nan,
        "reminder_enabled": int(profile["reminder_enabled"]),
        "active_days_7d": active,
        "median_delay_min": float(np.median(taken_delay)) if taken_delay.size else np.nan,
        "daily_med_count": profile["daily_med_count"],
        "caregiver_support": int(profile["caregiver_support"] == "family"),
        "chronic_condition_count": profile["chronic_condition_count"],
        "age_band": AGE_BAND_CODE[profile["age_band"]],
        "slot": slot_of(target_time),
        "is_weekend": int(target_time.weekday() >= 5),
    }


def compute_features(history, profile, activity_dates, knowledge_time, target_time,
                     grace_minutes=GRACE_MINUTES):
    """history: dicts with scheduled_at (datetime), status, reminder_sent, reminder_acknowledged,
    delay_minutes. profile: age_band, chronic_condition_count, daily_med_count, caregiver_support
    ('none'|'family'), reminder_enabled. activity_dates: iterable of date."""
    return _features(_History(history), profile, _day_index(activity_dates),
                     knowledge_time, target_time, grace_minutes)


# ---- dataset loading and the batch builder used for training ----

@dataclass
class Dataset:
    meta: dict
    profiles: dict   # patient_id -> profile dict (see compute_features)
    doses: dict      # patient_id -> dose rows sorted by (scheduled_at, medication_id)
    activity: dict   # patient_id -> set of activity dates


def _read(path):
    with open(path, newline="", encoding="utf-8") as f:
        yield from csv.DictReader(f)


def load_dataset(data_dir=DATA_DIR):
    data_dir = Path(data_dir)
    meta = json.loads((data_dir / "metadata.json").read_text())
    profiles = {r["patient_id"]: {
        "age_band": r["age_band"], "chronic_condition_count": int(r["chronic_condition_count"]),
        "daily_med_count": int(r["daily_med_count"]), "caregiver_support": r["caregiver_support"],
        "reminder_enabled": r["reminder_enabled"] == "true",
    } for r in _read(data_dir / "patients.csv")}
    doses = {pid: [] for pid in profiles}
    for r in _read(data_dir / "dose_events.csv"):
        doses[r["patient_id"]].append({
            "medication_id": r["medication_id"],
            "scheduled_at": datetime.strptime(f"{r['event_date']} {r['scheduled_time']}", "%Y-%m-%d %H:%M"),
            "status": r["status"], "reminder_sent": r["reminder_sent"] == "true",
            "reminder_acknowledged": r["reminder_acknowledged"] == "true",
            "delay_minutes": int(r["delay_minutes"]) if r["delay_minutes"] else None,
        })
    for rows in doses.values():
        rows.sort(key=lambda r: (r["scheduled_at"], r["medication_id"]))
    activity = {pid: set() for pid in profiles}
    for r in _read(data_dir / "app_activity.csv"):
        activity[r["patient_id"]].add(date.fromisoformat(r["activity_date"]))
    return Dataset(meta, profiles, doses, activity)


def build_training_table(data):
    """One row per resolved dose with >= MIN_HISTORY_DAYS of history before it.
    knowledge_time = target_time = the dose's own scheduled time, so the dose itself and any dose
    whose window is still open are excluded from its features."""
    grace = data.meta["grace_minutes"]
    first = datetime.fromisoformat(data.meta["start_date"]) + timedelta(days=MIN_HISTORY_DAYS)
    out = []
    for pid, rows in data.doses.items():
        h, days = _History(rows), _day_index(data.activity[pid])
        for r in rows:
            if r["status"] == "pending" or r["scheduled_at"] < first:
                continue
            t = r["scheduled_at"]
            out.append({"patient_id": pid, "target_at": t, **_features(h, data.profiles[pid], days, t, t, grace),
                        "missed": int(r["status"] == "missed")})
    table = pd.DataFrame(out, columns=["patient_id", "target_at", *FEATURES, "missed"])
    table[NUMERIC] = table[NUMERIC].astype(float)
    return table

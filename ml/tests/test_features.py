import math
from datetime import date, datetime, timedelta

import numpy as np
import pytest

from features import FEATURES, build_training_table, compute_features, load_dataset

GRACE = 120
K = datetime(2026, 10, 10, 12, 0)  # a Saturday
PROFILE = {"age_band": "70-79", "chronic_condition_count": 3, "daily_med_count": 2,
           "caregiver_support": "family", "reminder_enabled": True}


def dose(when, status, sent=False, ack=False, delay=None):
    return {"scheduled_at": when, "status": status, "reminder_sent": sent,
            "reminder_acknowledged": ack, "delay_minutes": delay}


def same(a, b):
    assert a.keys() == b.keys()
    for k in a:
        if isinstance(a[k], float) and math.isnan(a[k]):
            assert isinstance(b[k], float) and math.isnan(b[k]), k
        else:
            assert a[k] == b[k], k


@pytest.fixture(scope="module")
def data():
    return load_dataset()


@pytest.fixture(scope="module")
def table(data):
    return build_training_table(data)


def hand_history():
    """Doses placed on every window edge relative to K (grace 120 -> eligible if sched <= 10:00 on 10-10)."""
    return [
        dose(datetime(2026, 10, 10, 9, 0), "taken", True, True, 20),
        dose(datetime(2026, 10, 10, 10, 0), "missed"),                 # sched + grace == K: eligible
        dose(datetime(2026, 10, 10, 10, 30), "taken", True, True, 5),  # window still open at K: excluded
        dose(datetime(2026, 10, 9, 21, 0), "missed", True, False),
        dose(datetime(2026, 10, 9, 8, 0), "taken", True, True, 40),
        dose(datetime(2026, 10, 4, 12, 0), "taken", False, False, 10),  # 6 days back: inside both windows
        dose(datetime(2026, 10, 3, 12, 0), "missed", True, False),     # exactly 7 days back: outside 7d, inside 14d
        dose(datetime(2026, 9, 28, 8, 0), "taken", True, False, 60),    # 14d window only
        dose(datetime(2026, 9, 26, 12, 0), "taken", True, True, 99),    # exactly 14 days back: outside both
    ]


ACTIVITY = [date(2026, 10, 10), date(2026, 10, 9), date(2026, 10, 9), date(2026, 10, 5),
            date(2026, 10, 3), date(2026, 10, 2)]


def test_feature_list_is_the_documented_one():
    assert FEATURES == ["adherence_7d", "missed_7d", "last_dose_missed", "reminder_ack_rate", "reminder_enabled",
                        "active_days_7d", "median_delay_min", "daily_med_count", "caregiver_support",
                        "chronic_condition_count", "age_band", "slot", "is_weekend"]


@pytest.mark.parametrize("known_before_target_min", [0, 90])
@pytest.mark.parametrize("pid", ["P001", "P117", "P250"])
def test_no_leakage_from_unresolved_doses(data, pid, known_before_target_min):
    rows = data.doses[pid]
    target = rows[len(rows) // 2]["scheduled_at"]  # a dose in the middle of the period
    knowledge = target - timedelta(minutes=known_before_target_min)
    args = (data.profiles[pid], data.activity[pid], knowledge, target)
    before = compute_features(rows, *args)

    flipped = []
    for r in rows:
        r = dict(r)
        if r["scheduled_at"] + timedelta(minutes=GRACE) > knowledge:  # outcome not known yet (incl. the target)
            r.update(status="taken" if r["status"] != "taken" else "missed",
                     delay_minutes=1 if r["status"] != "taken" else None,
                     reminder_sent=not r["reminder_sent"], reminder_acknowledged=not r["reminder_acknowledged"])
        flipped.append(r)
    assert flipped != rows
    same(before, compute_features(flipped, *args))


def test_windows_on_hand_built_history():
    f = compute_features(hand_history(), PROFILE, ACTIVITY, K, K, GRACE)
    # 7d window holds 10-10 09:00 T, 10:00 M, 10-09 21:00 M, 10-09 08:00 T, 10-04 T -> 3 taken, 2 missed
    assert f["adherence_7d"] == pytest.approx(0.6)
    assert f["missed_7d"] == 2
    assert f["last_dose_missed"] == 1.0  # the 10:00 dose closes exactly at K
    # 14d window sends: 09:00, 21:00, 08:00, 10-03, 09-28 = 5; acknowledged: 09:00, 08:00 = 2
    assert f["reminder_ack_rate"] == pytest.approx(2 / 5)
    assert f["median_delay_min"] == 30.0  # taken delays 20, 40, 10, 60; the 99 is outside the window
    assert f["active_days_7d"] == 3  # 10-09, 10-05, 10-03; the knowledge date and 10-02 do not count
    assert (f["reminder_enabled"], f["daily_med_count"], f["caregiver_support"],
            f["chronic_condition_count"], f["age_band"]) == (1, 2, 1, 3, 1)
    assert f["is_weekend"] == 1 and f["slot"] == "afternoon"


def test_empty_history_gives_nan_not_zero():
    f = compute_features([], PROFILE, [], K, K, GRACE)
    for name in ("adherence_7d", "last_dose_missed", "reminder_ack_rate", "median_delay_min"):
        assert math.isnan(f[name]), name
    assert f["missed_7d"] == 0 and f["active_days_7d"] == 0


def test_pending_rows_never_contribute():
    base = hand_history()
    pending = [dose(datetime(2026, 10, 10, 10, 0), "pending", True, True, 5),  # latest eligible-by-time row
               dose(datetime(2026, 10, 9, 12, 0), "pending", True, True, 5),
               dose(datetime(2026, 10, 6, 12, 0), "pending", True, True, 5)]
    same(compute_features(base, PROFILE, ACTIVITY, K, K, GRACE),
         compute_features(base + pending, PROFILE, ACTIVITY, K, K, GRACE))
    only_pending = compute_features(pending, PROFILE, [], K, K, GRACE)
    assert math.isnan(only_pending["adherence_7d"]) and math.isnan(only_pending["last_dose_missed"])


@pytest.mark.parametrize("hhmm, slot", [((6, 0), "morning"), ((11, 59), "morning"), ((12, 0), "afternoon"),
                                         ((16, 59), "afternoon"), ((17, 0), "evening"), ((19, 59), "evening"),
                                         ((20, 0), "night"), ((23, 30), "night")])
def test_slot_boundaries(hhmm, slot):
    target = datetime(2026, 10, 12, *hhmm)  # a Monday
    f = compute_features([], PROFILE, [], target, target, GRACE)
    assert f["slot"] == slot and f["is_weekend"] == 0


def test_batch_builder_matches_single_call_path(data, table):
    for pid in ("P003", "P042", "P240"):
        for _, row in table[table.patient_id == pid].sample(5, random_state=1).iterrows():
            t = row["target_at"].to_pydatetime()
            f = compute_features(data.doses[pid], data.profiles[pid], data.activity[pid], t, t, GRACE)
            same({k: float(v) if k != "slot" else v for k, v in f.items()}, {k: row[k] for k in FEATURES})


def test_training_table_targets(data, table):
    first = datetime(2026, 7, 23)  # start_date + 7 days
    resolved = sum(r["status"] != "pending" and r["scheduled_at"] >= first for rows in data.doses.values() for r in rows)
    assert len(table) == resolved
    assert table["target_at"].min() >= first
    assert set(table["missed"].unique()) == {0, 1}
    assert not table[FEATURES].drop(columns=["slot"]).isin([np.inf, -np.inf]).any().any()

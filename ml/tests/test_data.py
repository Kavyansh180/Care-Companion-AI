import csv
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

import pytest

ML = Path(__file__).resolve().parents[1]
DATA = ML / "data"
FILES = ["patients.csv", "dose_events.csv", "app_activity.csv", "metadata.json"]
END_DATE = "2026-10-13"
CUTOFF = datetime(2026, 10, 13, 14, 0)
GRACE = timedelta(minutes=120)


def read(name):
    with open(DATA / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


@pytest.fixture(scope="module")
def patients():
    return {r["patient_id"]: r for r in read("patients.csv")}


@pytest.fixture(scope="module")
def doses():
    return read("dose_events.csv")


@pytest.fixture(scope="module")
def activity():
    return read("app_activity.csv")


def sched(r):
    return datetime.strptime(f"{r['event_date']} {r['scheduled_time']}", "%Y-%m-%d %H:%M")


def test_patients(patients):
    assert list(patients) == [f"P{i:03d}" for i in range(1, 251)]


def test_foreign_keys(patients, doses, activity):
    assert {r["patient_id"] for r in activity} <= set(patients)
    for r in doses:
        p = patients[r["patient_id"]]
        k = int(r["medication_id"].removeprefix(f"{r['patient_id']}-M"))
        assert r["medication_id"] == f"{r['patient_id']}-M{k}" and 1 <= k <= int(p["daily_med_count"])


def test_dose_count_per_patient(patients, doses):
    counts = {}
    for r in doses:
        counts[r["patient_id"]] = counts.get(r["patient_id"], 0) + 1
    assert counts == {pid: int(p["daily_med_count"]) * 90 for pid, p in patients.items()}


def test_status_and_taken_fields(doses):
    assert {r["status"] for r in doses} <= {"taken", "missed", "pending"}
    for r in doses:
        if r["status"] == "taken":
            assert r["taken_at"] and 0 <= int(r["delay_minutes"]) <= 120
        else:
            assert r["taken_at"] == "" and r["delay_minutes"] == ""


def test_reporting_day_rule(doses):
    for r in doses:
        closed = sched(r) + GRACE <= CUTOFF
        if r["status"] == "missed":
            assert closed
        if r["status"] == "pending":
            assert r["event_date"] == END_DATE and not closed and r["taken_at"] == ""
        if r["status"] == "taken":
            assert datetime.strptime(r["taken_at"], "%Y-%m-%d %H:%M") <= CUTOFF
    assert any(r["status"] == "pending" for r in doses)


def test_activity_not_after_cutoff(activity):
    for r in activity:
        assert datetime.strptime(f"{r['activity_date']} {r['activity_time']}", "%Y-%m-%d %H:%M") <= CUTOFF
        assert r["reminder_interaction"] == str(r["activity_type"] == "reminder_response").lower()
        assert r["dashboard_viewed"] == str(r["activity_type"] == "dashboard_view").lower()


def test_reminder_flags(patients, doses, activity):
    for r in doses:
        if r["reminder_sent"] == "false":
            assert r["reminder_acknowledged"] == "false"
        if patients[r["patient_id"]]["reminder_enabled"] == "false":
            assert r["reminder_sent"] == "false"
    off = {pid for pid, p in patients.items() if p["reminder_enabled"] == "false"}
    assert not any(r["activity_type"] == "reminder_response" for r in activity if r["patient_id"] in off)


def test_reproducible(tmp_path):
    subprocess.run([sys.executable, str(ML / "generate_synthetic_data.py"), "--out-dir", str(tmp_path)],
                   check=True, capture_output=True)
    for name in FILES:
        assert (tmp_path / name).read_bytes() == (DATA / name).read_bytes(), name

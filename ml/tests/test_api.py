from copy import deepcopy
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

import api
from features import load_dataset

FMT = "%Y-%m-%dT%H:%M"
VALID = {
    "patient_id": "P900", "as_of": "2026-10-13T14:00", "next_dose_at": "2026-10-13T18:00",
    "profile": {"age_band": "70-79", "chronic_condition_count": 2, "daily_med_count": 3,
                "caregiver_support": "none", "reminder_enabled": True},
    "dose_history": [
        {"scheduled_at": "2026-10-13T08:00", "status": "taken", "reminder_sent": True,
         "reminder_acknowledged": True, "delay_minutes": 10},
        {"scheduled_at": "2026-10-12T21:00", "status": "missed", "reminder_sent": True,
         "reminder_acknowledged": False, "delay_minutes": None},
        {"scheduled_at": "2026-10-13T13:00", "status": "pending", "reminder_sent": True,
         "reminder_acknowledged": False, "delay_minutes": None},
    ],
    "activity_dates": ["2026-10-12", "2026-10-10"],
}


@pytest.fixture(scope="module")
def client():
    with TestClient(api.app) as c:  # context manager runs the lifespan (loads model, builds the cohort)
        yield c


def band(p):
    return "low" if p < 0.3 else "moderate" if p < 0.6 else "high"


def test_health(client):
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["model_loaded"] and body["data_loaded"]
    assert body["model_version"]


def test_model_metrics(client):
    body = client.get("/model-metrics").json()
    assert {"disclaimer", "selected_model", "cross_validation", "test_metrics", "reliability_notes"} <= set(body)


def test_predict_risk_valid(client):
    r = client.post("/predict-risk", json=VALID)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["patient_id"] == "P900" and 0 <= body["probability"] <= 1
    assert body["risk_band"] == band(body["probability"])
    assert body["thresholds"] == {"moderate": 0.3, "high": 0.6}
    assert body["model_version"] == client.get("/health").json()["model_version"]
    assert len(body["factors"]) <= 3
    assert [f["effect"] for f in body["factors"]] == sorted((f["effect"] for f in body["factors"]), reverse=True)
    assert all(f["effect"] > 0.01 for f in body["factors"])
    assert "not a diagnosis" in body["note"]


def test_predict_risk_matches_cohort_for_the_same_inputs(client):
    """Same feature/predict/explain path: rebuilding a cohort patient's request must give the same answer."""
    data = load_dataset()
    cohort = {p["patient_id"]: p for p in client.get("/cohort-risk").json()["predictions"]}
    for pid in ("P217", "P250", "P042"):
        body = {
            "patient_id": pid, "as_of": "2026-10-13T14:00", "next_dose_at": cohort[pid]["next_dose_at"],
            "profile": data.profiles[pid],
            "dose_history": [{k: v for k, v in r.items() if k != "medication_id"}
                             | {"scheduled_at": r["scheduled_at"].strftime(FMT)} for r in data.doses[pid]],
            "activity_dates": sorted(d.isoformat() for d in data.activity[pid]),
        }
        got = client.post("/predict-risk", json=body)
        assert got.status_code == 200, got.text
        assert got.json()["probability"] == cohort[pid]["probability"]
        assert got.json()["factors"] == cohort[pid]["factors"]


def mutate(path, value):
    body = deepcopy(VALID)
    target = body
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value
    return body


@pytest.mark.parametrize("body", [
    mutate(["dose_history", 0, "status"], "late"),
    mutate(["next_dose_at"], "2026-10-13T13:59"),
    {**VALID, "unexpected": 1},
    mutate(["profile", "extra"], 1),
    mutate(["patient_id"], "P 900"),
    mutate(["patient_id"], ""),
    mutate(["patient_id"], "P" * 33),
    mutate(["as_of"], "2026-10-13 14:00"),
    mutate(["as_of"], "2026-13-13T14:00"),
    mutate(["activity_dates"], ["2026-10-1"]),
    mutate(["profile", "age_band"], "50-59"),
    mutate(["profile", "daily_med_count"], 9),
    mutate(["profile", "reminder_enabled"], "yes"),
    mutate(["dose_history", 0, "delay_minutes"], 1441),
    mutate(["dose_history", 0, "delay_minutes"], 2.5),
    mutate(["dose_history"], [VALID["dose_history"][0]] * 5001),
    mutate(["activity_dates"], ["2026-10-01"] * 1001),
], ids=lambda b: "")
def test_predict_risk_rejects_invalid_input(client, body):
    r = client.post("/predict-risk", json=body)
    assert r.status_code == 422
    assert len(r.text) < 5000  # the error names the field; it does not echo the submitted payload


def test_cohort_risk(client):
    r = client.get("/cohort-risk", params={"limit": 5})
    assert r.status_code == 200
    body = r.json()
    assert (body["count"], body["total"], len(body["predictions"])) == (5, 250, 5)
    assert body["reporting_cutoff"] == "2026-10-13T14:00" and body["timezone"] == "Asia/Kolkata"
    probs = [p["probability"] for p in body["predictions"]]
    assert probs == sorted(probs, reverse=True)
    first = body["predictions"][0]
    assert len(first["recent_days"]) == 7
    assert [d["date"] for d in first["recent_days"]] == sorted(d["date"] for d in first["recent_days"])
    assert first["recent_days"][-1]["date"] == "2026-10-13"
    assert datetime.strptime(first["next_dose_at"], FMT) >= datetime(2026, 10, 13, 14, 0)


def test_cohort_risk_full_list_is_ordered_and_complete(client):
    body = client.get("/cohort-risk").json()
    assert body["count"] == body["total"] == 250
    keys = [(-p["probability"], p["patient_id"]) for p in body["predictions"]]
    assert keys == sorted(keys)
    assert all(p["risk_band"] == band(p["probability"]) for p in body["predictions"])


@pytest.mark.parametrize("limit", [0, 251, -1, "abc"])
def test_cohort_risk_rejects_bad_limit(client, limit):
    assert client.get("/cohort-risk", params={"limit": limit}).status_code == 422


def test_degraded_mode_when_model_file_is_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(api, "MODEL_PATH", tmp_path / "missing.joblib")
    monkeypatch.setattr(api, "STATE", {})  # keep the module-scoped client's loaded state intact
    with TestClient(api.app) as c:
        health = c.get("/health").json()
        assert health == {"status": "degraded", "model_loaded": False, "data_loaded": True, "model_version": None}
        assert c.post("/predict-risk", json=VALID).status_code == 503
        assert c.get("/cohort-risk").status_code == 503
        assert c.get("/model-metrics").status_code == 200


def test_model_metrics_503_when_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(api, "METRICS_PATH", tmp_path / "missing.json")
    monkeypatch.setattr(api, "STATE", {})
    with TestClient(api.app) as c:
        assert c.get("/model-metrics").status_code == 503

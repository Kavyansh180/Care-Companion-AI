"""CareCompanion AI risk service (FastAPI). Run: cd ml && .venv/bin/uvicorn api:app --port 8000

Predictions are prototype estimates from a model trained on SYNTHETIC data; see ml/README.md.
Request bodies and patient data are never logged.
"""
import json
import logging
import re
from collections import Counter
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Annotated, Literal

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, model_validator

from explain import NOTE, assess, load_bundle
from features import DATA_DIR, load_dataset

ML_DIR = Path(__file__).resolve().parent
MODEL_PATH = ML_DIR / "models" / "adherence_risk.joblib"
METRICS_PATH = ML_DIR / "metrics.json"
TIMEZONE = "Asia/Kolkata"

log = logging.getLogger("carecompanion.ml")
STATE: dict = {}  # bundle, metrics, data, cohort; filled at startup


# ---- request/response models ----

def _stamp(pattern, fmt, as_date=False):
    """Accept only the exact documented string format (strptime alone tolerates missing zero padding)."""
    def parse(v):
        if not isinstance(v, str) or not re.fullmatch(pattern, v):
            raise ValueError("expected a string in the documented format")
        parsed = datetime.strptime(v, fmt)
        return parsed.date() if as_date else parsed
    return BeforeValidator(parse)


Minute = Annotated[datetime, _stamp(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", "%Y-%m-%dT%H:%M")]
Day = Annotated[date, _stamp(r"\d{4}-\d{2}-\d{2}", "%Y-%m-%d", as_date=True)]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Profile(Strict):
    age_band: Literal["60-69", "70-79", "80+"]
    chronic_condition_count: int = Field(ge=0, le=15)
    daily_med_count: int = Field(ge=1, le=8)
    caregiver_support: Literal["none", "family"]
    reminder_enabled: bool


class Dose(Strict):
    scheduled_at: Minute
    status: Literal["taken", "missed", "pending"]
    reminder_sent: bool
    reminder_acknowledged: bool
    delay_minutes: int | None = Field(default=None, ge=0, le=1440)


class PredictRequest(Strict):
    patient_id: str = Field(min_length=1, max_length=32, pattern=r"^[A-Za-z0-9_-]+$")
    as_of: Minute
    next_dose_at: Minute
    profile: Profile
    dose_history: list[Dose] = Field(max_length=5000)
    activity_dates: list[Day] = Field(max_length=1000)

    @model_validator(mode="after")
    def _not_in_past(self):
        if self.next_dose_at < self.as_of:
            raise ValueError("next_dose_at must be at or after as_of")
        return self


class Thresholds(BaseModel):
    moderate: float
    high: float


class Factor(BaseModel):
    feature: str
    label: str
    value: float | int | str | None
    typical_value: float | int | str | None
    effect: float


class Prediction(BaseModel):
    patient_id: str
    probability: float
    risk_band: Literal["low", "moderate", "high"]
    model_version: str
    factors: list[Factor]
    thresholds: Thresholds
    note: str


class RecentDay(BaseModel):
    date: str
    taken: int
    missed: int
    pending: int


class CohortEntry(BaseModel):
    patient_id: str
    probability: float
    risk_band: Literal["low", "moderate", "high"]
    next_dose_at: str
    adherence_7d: float | None
    missed_7d: int
    factors: list[Factor]
    recent_days: list[RecentDay]


class Cohort(BaseModel):
    model_version: str
    reporting_cutoff: str
    timezone: str
    thresholds: Thresholds
    count: int
    total: int
    predictions: list[CohortEntry]


# ---- startup ----

def _nan_to_none(x):
    return None if x != x else round(float(x), 4)


def build_cohort(bundle, data):
    """Score every patient at the reporting cutoff with the same assess() path as /predict-risk."""
    cutoff = datetime.fromisoformat(data.meta["reporting_cutoff"])
    end = date.fromisoformat(data.meta["end_date"])
    week = [end - timedelta(days=i) for i in range(6, -1, -1)]
    out = []
    for pid, rows in data.doses.items():
        times = sorted({r["scheduled_at"] for r in rows if r["scheduled_at"].date() == end})
        nxt = next((t for t in times if t >= cutoff), times[0] + timedelta(days=1))
        a = assess(bundle, rows, data.profiles[pid], data.activity[pid], cutoff, nxt)
        seen = Counter((r["scheduled_at"].date(), r["status"]) for r in rows)
        out.append({
            "patient_id": pid, "probability": a["probability"], "risk_band": a["risk_band"],
            "next_dose_at": nxt.strftime("%Y-%m-%dT%H:%M"),
            "adherence_7d": _nan_to_none(a["features"]["adherence_7d"]),
            "missed_7d": int(a["features"]["missed_7d"]), "factors": a["factors"],
            "recent_days": [{"date": d.isoformat(), "taken": seen[d, "taken"], "missed": seen[d, "missed"],
                             "pending": seen[d, "pending"]} for d in week],
        })
    return sorted(out, key=lambda e: (-e["probability"], e["patient_id"]))


def load_state():
    """Load whatever is available; a missing or unreadable piece degrades the service, never crashes it."""
    state = {"bundle": None, "metrics": None, "data": None, "cohort": None}
    for key, loader, path in (("bundle", load_bundle, MODEL_PATH),
                              ("metrics", lambda p: json.loads(Path(p).read_text()), METRICS_PATH),
                              ("data", load_dataset, DATA_DIR)):
        try:
            state[key] = loader(path)
        except Exception as exc:  # noqa: BLE001 - report the kind of failure, never any data
            log.warning("could not load %s (%s)", key, type(exc).__name__)
    if state["bundle"] and state["data"]:
        state["cohort"] = build_cohort(state["bundle"], state["data"])
    return state


@asynccontextmanager
async def lifespan(_app):
    STATE.clear()
    STATE.update(load_state())
    yield


app = FastAPI(title="CareCompanion AI risk service", version="1.0.0", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def _invalid(_request: Request, exc: RequestValidationError):
    # Default handler echoes the submitted input back; keep only where and why.
    errors = [{"loc": [str(p) for p in e["loc"]], "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": errors})


# ---- endpoints ----

@app.get("/health")
def health():
    model, data = STATE.get("bundle"), STATE.get("data")
    return {"status": "ok" if model and data else "degraded", "model_loaded": model is not None,
            "data_loaded": data is not None, "model_version": model["model_version"] if model else None}


@app.get("/model-metrics")
def model_metrics():
    if STATE.get("metrics") is None:
        raise HTTPException(503, "metrics.json is not available; run train_model.py")
    return STATE["metrics"]


@app.post("/predict-risk", response_model=Prediction)
def predict_risk(req: PredictRequest):
    bundle = STATE.get("bundle")
    if bundle is None:
        raise HTTPException(503, "model is not loaded; run train_model.py")
    history = [d.model_dump() for d in req.dose_history]
    a = assess(bundle, history, req.profile.model_dump(), req.activity_dates, req.as_of, req.next_dose_at)
    return {"patient_id": req.patient_id, "probability": a["probability"], "risk_band": a["risk_band"],
            "model_version": bundle["model_version"], "factors": a["factors"],
            "thresholds": bundle["thresholds"], "note": NOTE}


@app.get("/cohort-risk", response_model=Cohort)
def cohort_risk(limit: int = Query(250, ge=1, le=250)):
    bundle, cohort = STATE.get("bundle"), STATE.get("cohort")
    if bundle is None or cohort is None:
        raise HTTPException(503, "model or data is not loaded")
    meta = STATE["data"].meta
    return {"model_version": bundle["model_version"], "reporting_cutoff": meta["reporting_cutoff"],
            "timezone": TIMEZONE, "thresholds": bundle["thresholds"], "count": min(limit, len(cohort)),
            "total": len(cohort), "predictions": cohort[:limit]}

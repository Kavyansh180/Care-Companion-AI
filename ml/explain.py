"""Scoring and per-prediction explanation, used identically by /predict-risk and /cohort-risk."""
import math

import joblib
import pandas as pd

from features import FEATURE_LABELS, FEATURES, NUMERIC, compute_features

MIN_EFFECT = 0.01
MAX_FACTORS = 3
NOTE = "Prototype thresholds, not medically validated. Estimate for caregiver follow-up, not a diagnosis."


def load_bundle(path):
    bundle = joblib.load(path)
    # Tiny batches: a thread pool per predict_proba call costs more than it saves.
    for step in bundle["pipeline"].named_steps.values():
        if hasattr(step, "n_jobs"):
            step.n_jobs = 1
    return bundle


def risk_band(probability, thresholds):
    return ("high" if probability >= thresholds["high"]
            else "moderate" if probability >= thresholds["moderate"] else "low")


def _plain(v):
    """JSON-friendly scalar: NaN -> None, whole floats -> int, others rounded."""
    if isinstance(v, str):
        return v
    if v is None or math.isnan(v):
        return None
    v = round(float(v), 4)
    return int(v) if v.is_integer() else v


def _frame(rows):
    df = pd.DataFrame(rows, columns=FEATURES)
    df[NUMERIC] = df[NUMERIC].astype(float)
    return df


def score(bundle, feats):
    """Return (probability, factors). Occlusion: swap one feature at a time for its typical
    (training-median / mode) value; effect = p_original - p_swapped. A positive effect means
    this patient's value pushes the estimate above what the typical value would give."""
    typical = bundle["typical_values"]
    rows = [feats] + [{**feats, f: typical[f]} for f in FEATURES]
    p = bundle["pipeline"].predict_proba(_frame(rows))[:, 1]
    effects = [(f, float(p[0] - p[i + 1])) for i, f in enumerate(FEATURES)]
    top = sorted((e for e in effects if e[1] > MIN_EFFECT), key=lambda e: -e[1])[:MAX_FACTORS]  # stable sort
    factors = [{"feature": f, "label": FEATURE_LABELS[f], "value": _plain(feats[f]),
                "typical_value": _plain(typical[f]), "effect": round(e, 4)} for f, e in top]
    return float(p[0]), factors


def assess(bundle, history, profile, activity_dates, as_of, next_dose_at):
    feats = compute_features(history, profile, activity_dates, as_of, next_dose_at, bundle["grace_minutes"])
    p, factors = score(bundle, feats)
    p = round(p, 4)  # band is derived from the number the client sees
    return {"probability": p, "risk_band": risk_band(p, bundle["thresholds"]), "features": feats,
            "factors": factors}

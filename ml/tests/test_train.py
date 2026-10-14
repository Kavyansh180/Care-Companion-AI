"""Checks the saved artifacts (run `python train_model.py` first); nothing is retrained here."""
import json

import joblib
import pytest

from features import FEATURE_LABELS, FEATURES, build_training_table, load_dataset
from train_model import METRICS_PATH, MODEL_PATH, split_by_patient, table_hash

CANDIDATES = ("logistic_regression", "random_forest")
UNIT = ("accuracy", "precision", "recall", "f1", "roc_auc")


@pytest.fixture(scope="module")
def metrics():
    return json.loads(METRICS_PATH.read_text())


@pytest.fixture(scope="module")
def table():
    return build_training_table(load_dataset())


def test_split_is_by_patient_and_matches_saved_counts(table, metrics):
    train_idx, test_idx = split_by_patient(table)
    train, test = table.iloc[train_idx], table.iloc[test_idx]
    assert not set(train.patient_id) & set(test.patient_id)
    assert metrics["data"] == {"examples": len(table), "train_patients": train.patient_id.nunique(),
                               "test_patients": test.patient_id.nunique(), "train_examples": len(train),
                               "test_examples": len(test)}
    for name, part in (("train", train), ("test", test)):
        assert metrics["class_distribution"][name] == {"missed": int(part.missed.sum()),
                                                       "taken": int((part.missed == 0).sum())}
    assert metrics["model_version"].endswith(table_hash(table))  # artifacts belong to the current data


def test_required_keys(metrics):
    assert set(metrics) == {"disclaimer", "model_version", "selected_model", "selection_reason", "target", "data",
                            "class_distribution", "cross_validation", "test_metrics", "feature_importance",
                            "risk_thresholds", "reliability_notes"}
    assert "synthetic" in metrics["disclaimer"].lower()
    assert set(metrics["cross_validation"]) == set(metrics["test_metrics"]) == {"baseline_prior", *CANDIDATES}
    for cv in metrics["cross_validation"].values():
        assert set(cv) == {"roc_auc_mean", "roc_auc_std"}
    for t in metrics["test_metrics"].values():
        assert set(t) == {*UNIT, "confusion_matrix"}
    assert metrics["risk_thresholds"] == {"moderate": 0.3, "high": 0.6,
                                          "note": "Prototype thresholds, not medically validated."}


def test_selected_model_has_the_higher_cv_mean(metrics):
    cv = {k: metrics["cross_validation"][k]["roc_auc_mean"] for k in CANDIDATES}
    assert metrics["selected_model"] in CANDIDATES
    assert cv[metrics["selected_model"]] == max(cv.values())
    assert metrics["model_version"].startswith(metrics["selected_model"] + "-")
    assert f"{max(cv.values()):.3f}" in metrics["selection_reason"]


def test_numbers_are_in_range_and_consistent(metrics):
    for cv in metrics["cross_validation"].values():
        assert 0 <= cv["roc_auc_mean"] <= 1 and 0 <= cv["roc_auc_std"] <= 1
    n = metrics["data"]["test_examples"]
    for t in metrics["test_metrics"].values():
        assert all(t[k] is None or 0 <= t[k] <= 1 for k in UNIT)
        (tn, fp), (fn, tp) = t["confusion_matrix"]
        assert tn + fp + fn + tp == n
        assert t["accuracy"] == pytest.approx((tn + tp) / n, abs=1e-4)
        assert t["recall"] == pytest.approx(tp / (tp + fn), abs=1e-4)
    assert metrics["test_metrics"]["baseline_prior"]["roc_auc"] == 0.5


def test_feature_importance_lists_every_feature_sorted(metrics):
    imp = metrics["feature_importance"]
    assert sorted(i["feature"] for i in imp) == sorted(FEATURES)
    assert all(i["label"] == FEATURE_LABELS[i["feature"]] for i in imp)
    means = [i["importance_mean"] for i in imp]
    assert means == sorted(means, reverse=True)


def test_reliability_notes_state_the_caveats(metrics):
    text = " ".join(metrics["reliability_notes"]).lower()
    for word in ("synthetic", "correlated", "recall", "minority"):
        assert word in text
    recall = metrics["test_metrics"][metrics["selected_model"]]["recall"]
    assert f"{recall:.1%}" in " ".join(metrics["reliability_notes"])


def test_bundle_matches_metrics(metrics):
    bundle = joblib.load(MODEL_PATH)
    assert bundle["features"] == FEATURES
    assert bundle["model_version"] == metrics["model_version"]
    assert bundle["thresholds"] == {"moderate": 0.3, "high": 0.6}
    assert bundle["grace_minutes"] == 120
    assert set(bundle["typical_values"]) == set(FEATURES)
    assert MODEL_PATH.stat().st_size < 10_000_000

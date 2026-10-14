// Contract between the Next.js app and the Python ML service (ml/api.py).
// Pure types + runtime guards with no imports, so Node tests can load this file directly.

export type RiskBand = "low" | "moderate" | "high";

export interface RiskFactor {
  feature: string;
  label: string;
  value: number | string | null;
  typical_value: number | string | null;
  effect: number; // rise in predicted probability versus the typical (training median/mode) value
}

export interface RecentDay {
  date: string; // YYYY-MM-DD
  taken: number;
  missed: number;
  pending: number;
}

export interface CohortPrediction {
  patient_id: string;
  probability: number; // 0..1
  risk_band: RiskBand;
  next_dose_at: string; // YYYY-MM-DDTHH:MM, Asia/Kolkata
  adherence_7d: number | null; // 0..1, null when no known outcomes in the window
  missed_7d: number;
  factors: RiskFactor[];
  recent_days: RecentDay[];
}

export interface CohortRisk {
  model_version: string;
  reporting_cutoff: string;
  timezone: string;
  thresholds: { moderate: number; high: number };
  count: number;
  total: number;
  predictions: CohortPrediction[];
}

export interface ClassificationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number | null;
  confusion_matrix: number[][]; // [[tn, fp], [fn, tp]]
}

export interface FeatureImportance {
  feature: string;
  label: string;
  importance_mean: number;
  importance_std: number;
}

export interface ModelMetrics {
  disclaimer: string;
  model_version: string;
  selected_model: string;
  selection_reason: string;
  target: string;
  data: { examples: number; train_patients: number; test_patients: number; train_examples: number; test_examples: number };
  class_distribution: Record<string, { missed: number; taken: number }>;
  cross_validation: Record<string, { roc_auc_mean: number; roc_auc_std: number }>;
  test_metrics: Record<string, ClassificationMetrics>;
  feature_importance: FeatureImportance[];
  risk_thresholds: { moderate: number; high: number; note: string };
  reliability_notes: string[];
}

export type MlResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "unavailable" | "timeout" | "bad_response"; message: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const isStr = (x: unknown): x is string => typeof x === "string";

function isPrediction(x: unknown): x is CohortPrediction {
  return (
    isObj(x) &&
    isStr(x.patient_id) &&
    isNum(x.probability) &&
    x.probability >= 0 &&
    x.probability <= 1 &&
    (x.risk_band === "low" || x.risk_band === "moderate" || x.risk_band === "high") &&
    isStr(x.next_dose_at) &&
    (x.adherence_7d === null || isNum(x.adherence_7d)) &&
    isNum(x.missed_7d) &&
    Array.isArray(x.factors) &&
    x.factors.every((f) => isObj(f) && isStr(f.feature) && isStr(f.label) && isNum(f.effect)) &&
    Array.isArray(x.recent_days) &&
    x.recent_days.every((d) => isObj(d) && isStr(d.date) && isNum(d.taken) && isNum(d.missed) && isNum(d.pending))
  );
}

export function isCohortRisk(x: unknown): x is CohortRisk {
  return (
    isObj(x) &&
    isStr(x.model_version) &&
    isStr(x.reporting_cutoff) &&
    isStr(x.timezone) &&
    isObj(x.thresholds) &&
    isNum(x.thresholds.moderate) &&
    isNum(x.thresholds.high) &&
    isNum(x.count) &&
    isNum(x.total) &&
    Array.isArray(x.predictions) &&
    x.predictions.every(isPrediction)
  );
}

export function isModelMetrics(x: unknown): x is ModelMetrics {
  return (
    isObj(x) &&
    isStr(x.disclaimer) &&
    isStr(x.model_version) &&
    isStr(x.selected_model) &&
    isObj(x.data) &&
    isObj(x.test_metrics) &&
    isObj(x.cross_validation) &&
    Array.isArray(x.feature_importance) &&
    x.feature_importance.every((f) => isObj(f) && isStr(f.feature) && isStr(f.label) && isNum(f.importance_mean)) &&
    isObj(x.risk_thresholds) &&
    isNum(x.risk_thresholds.moderate) &&
    isNum(x.risk_thresholds.high) &&
    Array.isArray(x.reliability_notes)
  );
}

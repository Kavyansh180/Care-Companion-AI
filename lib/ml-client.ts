// Server-side client for the Python ML service (ml/api.py). Never throws; every failure becomes an MlResult.
// Response bodies are never logged: they can contain per-patient predictions.
import { isCohortRisk, isModelMetrics } from "./ml-types.ts";
import type { CohortRisk, MlResult, ModelMetrics } from "./ml-types.ts";

export interface MlHealth {
  status: "ok" | "degraded";
  model_loaded: boolean;
  data_loaded: boolean;
  model_version: string | null;
}

export interface MlRequestOptions {
  timeoutMs?: number;
  fetchImpl?: typeof fetch; // injected by tests
}

export function isMlHealth(x: unknown): x is MlHealth {
  if (typeof x !== "object" || x === null) return false;
  const h = x as Record<string, unknown>;
  return (
    (h.status === "ok" || h.status === "degraded") &&
    typeof h.model_loaded === "boolean" &&
    typeof h.data_loaded === "boolean" &&
    (h.model_version === null || typeof h.model_version === "string")
  );
}

async function mlGet<T>(pathAndQuery: string, guard: (x: unknown) => x is T, opts: MlRequestOptions): Promise<MlResult<T>> {
  const base = (process.env.ML_SERVICE_URL ?? "http://127.0.0.1:8000").replace(/\/+$/, "");
  const timeoutMs = opts.timeoutMs ?? 3000;
  const doFetch = opts.fetchImpl ?? fetch;

  // AbortController + a ref'd timer (not AbortSignal.timeout, whose timer is unref'd) so the deadline also
  // holds for a fetchImpl that ignores the signal.
  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
      reject(new Error("timeout"));
    }, timeoutMs);
  });

  const request = async (): Promise<MlResult<T>> => {
    const res = await doFetch(`${base}${pathAndQuery}`, { cache: "no-store", signal: controller.signal });
    if (!res.ok) return { ok: false, reason: "unavailable", message: `Model service responded with HTTP ${res.status}.` };
    let body: unknown;
    try {
      body = await res.json();
    } catch (e) {
      if (timedOut) throw e;
      return { ok: false, reason: "bad_response", message: "Model service returned a response that is not valid JSON." };
    }
    return guard(body)
      ? { ok: true, data: body }
      : { ok: false, reason: "bad_response", message: "Model service returned data in an unexpected shape." };
  };

  try {
    return await Promise.race([request(), deadline]);
  } catch {
    return timedOut
      ? { ok: false, reason: "timeout", message: `Model service did not answer within ${timeoutMs} ms.` }
      : { ok: false, reason: "unavailable", message: "Could not reach the model service." };
  } finally {
    clearTimeout(timer);
  }
}

export function getModelMetrics(opts: MlRequestOptions = {}): Promise<MlResult<ModelMetrics>> {
  return mlGet("/model-metrics", isModelMetrics, opts);
}

export function getCohortRisk(limit: number, opts: MlRequestOptions = {}): Promise<MlResult<CohortRisk>> {
  return mlGet(`/cohort-risk?limit=${encodeURIComponent(String(limit))}`, isCohortRisk, opts);
}

export function getMlHealth(opts: MlRequestOptions = {}): Promise<MlResult<MlHealth>> {
  return mlGet("/health", isMlHealth, opts);
}

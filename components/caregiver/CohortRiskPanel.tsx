"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { isCohortRisk, type CohortPrediction, type CohortRisk, type RecentDay, type RiskBand, type RiskFactor } from "@/lib/ml-types";
import { formatDisplayDate } from "@/lib/dates";
import { formatTime12h } from "@/lib/format";
import { buttonClass } from "@/components/ui/styles";
import Notice from "@/components/ui/Notice";
import Loading from "@/components/ui/Loading";

// The caregiver page points its <section aria-labelledby> at this heading.
export const COHORT_RISK_HEADING_ID = "cohort-risk-heading";

// ---------- Pure helpers (exported so they are easy to unit test) ----------

const toNum = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

// 1 / true / "yes" -> true, 0 / false / "no" -> false, anything else -> null (unknown).
const toFlag = (v: unknown): boolean | null => {
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (s === "1" || s === "true" || s === "yes") return true;
  if (s === "0" || s === "false" || s === "no") return false;
  return null;
};

const percent = (fraction: number) => `${Math.round(fraction * 100)}%`;

const AGE_BANDS = ["60–69", "70–79", "80+"];

/** Plain-words version of a factor's value (or its typical value) for one model feature. */
export function formatFactorValue(feature: string, value: unknown): string {
  if (value === null || value === undefined) return "not recorded";
  const n = toNum(value);
  const raw = String(value);
  switch (feature) {
    case "adherence_7d":
    case "reminder_ack_rate":
      return n === null ? raw : percent(n);
    case "missed_7d":
    case "active_days_7d":
    case "daily_med_count":
    case "chronic_condition_count":
      return n === null ? raw : String(Math.round(n));
    case "median_delay_min": {
      if (n === null) return raw;
      const minutes = Math.round(n);
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
    }
    case "reminder_enabled":
    case "last_dose_missed":
    case "is_weekend": {
      const flag = toFlag(value);
      return flag === null ? raw : flag ? "Yes" : "No";
    }
    case "caregiver_support": {
      if (raw.toLowerCase() === "family") return "Family support";
      if (raw.toLowerCase() === "none") return "No family caregiver";
      const flag = toFlag(value);
      return flag === null ? raw : flag ? "Family support" : "No family caregiver";
    }
    case "age_band":
      if (n !== null && AGE_BANDS[n]) return AGE_BANDS[n];
      return raw.replace(/^(\d{2})-(\d{2})$/, "$1–$2");
    case "slot":
      return raw.charAt(0).toUpperCase() + raw.slice(1);
    default:
      return raw;
  }
}

/** "+14 points": percentage points this factor adds to the estimate versus a typical value. */
export function formatEffect(effect: number): string {
  const points = Math.round(effect * 100);
  if (points < 1) return "+<1 point";
  return `+${points} ${points === 1 ? "point" : "points"}`;
}

/** Only factors that raise the estimate, largest effect first, at most 3. */
export function topFactors(factors: RiskFactor[], max = 3): RiskFactor[] {
  return factors
    .filter((f) => f.effect > 0)
    .sort((a, b) => b.effect - a.effect)
    .slice(0, max);
}

const CHECK_IN = "Several recent doses were missed. A friendly check-in call may help.";

// Returns null when the factor's actual value does not match what the sentence claims.
function suggestionFor(f: RiskFactor): string | null {
  switch (f.feature) {
    case "reminder_enabled":
      return toFlag(f.value) === true ? null : "Reminders are switched off. Check whether they should be turned on.";
    case "reminder_ack_rate":
      return "Reminders often go unanswered. Check the phone volume and that reminders can be heard.";
    case "active_days_7d":
      return "They have rarely opened the app lately. Ask whether they need help using it.";
    case "median_delay_min":
      return "Doses are often taken late. Check whether the reminder times fit their daily routine.";
    case "caregiver_support":
      return formatFactorValue("caregiver_support", f.value) === "Family support"
        ? null
        : "No family caregiver is linked. Consider arranging a regular check-in.";
    case "adherence_7d":
    case "missed_7d":
    case "last_dose_missed":
      return CHECK_IN;
    default:
      return null;
  }
}

/** Non-medical suggestions derived only from the factors shown for this patient (deduplicated, max 3). */
export function suggestionsFor(factors: RiskFactor[]): string[] {
  const out = new Set<string>();
  for (const f of topFactors(factors)) {
    const s = suggestionFor(f);
    if (s) out.add(s);
  }
  return [...out].slice(0, 3);
}

const SHORT_DAY: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
const DATE_TIME = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}:\d{2}))?/;

/** "2026-10-14T14:00" -> "Wed, 14 Oct, 2:00 PM IST". Unparseable input is returned unchanged. */
export function formatNextDose(nextDoseAt: string): string {
  const m = DATE_TIME.exec(nextDoseAt);
  if (!m) return nextDoseAt;
  const date = formatDisplayDate(m[1], SHORT_DAY);
  return m[2] ? `${date}, ${formatTime12h(m[2])} IST` : date;
}

/** Reporting cutoff, e.g. "14 Oct 2026, 14:00 IST". The 14:00 cutoff time is used when the value is a date only. */
export function formatCutoff(cutoff: string): string {
  const m = DATE_TIME.exec(cutoff);
  if (!m) return cutoff;
  return `${formatDisplayDate(m[1], { day: "numeric", month: "short", year: "numeric" })}, ${m[2] ?? "14:00"} IST`;
}

export function formatRecentDay(d: RecentDay): string {
  if (d.taken + d.missed + d.pending === 0) return "No doses recorded";
  const parts = [`${d.taken} taken`, `${d.missed} missed`];
  if (d.pending > 0) parts.push(`${d.pending} pending`);
  return parts.join(" · ");
}

const last7 = (days: RecentDay[]) => [...days].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

const BAND = {
  high: { Icon: XCircle, label: "High risk", tone: "bg-missed-bg text-missed-fg border-missed-border" },
  moderate: { Icon: Clock, label: "Moderate risk", tone: "bg-pending-bg text-pending-fg border-pending-border" },
  low: { Icon: CheckCircle2, label: "Low risk", tone: "bg-taken-bg text-taken-fg border-taken-border" },
} as const satisfies Record<RiskBand, unknown>;

// ---------- UI ----------

const FIXED_ADVICE = "Do not change medicines or doses — talk to their doctor if you have concerns.";
const SUB_HEADING = "text-base font-semibold text-fg";

type State = { status: "loading" } | { status: "unavailable" } | { status: "ready"; data: CohortRisk };

function PredictionCard({ p }: { p: CohortPrediction }) {
  const { Icon, label, tone } = BAND[p.risk_band];
  const factors = topFactors(p.factors);
  const suggestions = suggestionsFor(p.factors);
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-fg">
          {p.patient_id} <span className="font-normal text-fg-muted">· simulated</span>
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${tone}`}
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </span>
      </div>

      <p className="mt-2 text-base text-fg">
        Estimated {Math.round(p.probability * 100)}% chance of missing the next dose ({formatNextDose(p.next_dose_at)})
      </p>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-fg-muted">7-day adherence</dt>
          <dd className="text-base text-fg">{p.adherence_7d === null ? "No data" : percent(p.adherence_7d)}</dd>
        </div>
        <div>
          <dt className="text-sm text-fg-muted">Missed in last 7 days</dt>
          <dd className="text-base text-fg">{p.missed_7d}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <h4 className={SUB_HEADING}>Last 7 days</h4>
        {p.recent_days.length === 0 ? (
          <p className="mt-1 text-base text-fg-muted">No recent history.</p>
        ) : (
          <ul className="mt-1 divide-y divide-border">
            {last7(p.recent_days).map((d) => (
              <li key={d.date} className="flex flex-wrap justify-between gap-x-4 py-1.5 text-base">
                <span className="text-fg">{formatDisplayDate(d.date, SHORT_DAY)}</span>
                <span className="text-fg-muted">{formatRecentDay(d)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <h4 className={SUB_HEADING}>Why the model flagged this patient</h4>
        {factors.length === 0 ? (
          <p className="mt-1 text-base text-fg-muted">
            No single factor stands out; the estimate comes from the overall pattern.
          </p>
        ) : (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-fg">
            {factors.map((f) => (
              <li key={f.feature}>
                <span className="font-semibold">{f.label}:</span> {formatFactorValue(f.feature, f.value)}
                {f.typical_value !== null && f.typical_value !== undefined && (
                  <> (typical {formatFactorValue(f.feature, f.typical_value)})</>
                )}{" "}
                <span className="text-sm text-fg-muted">{formatEffect(f.effect)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <h4 className={SUB_HEADING}>Supportive next steps</h4>
        {suggestions.length > 0 ? (
          <ul className="mt-1 list-disc space-y-1 pl-5 text-base text-fg">
            {suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-base text-fg-muted">No specific step stands out from the factors above.</p>
        )}
        <p className="mt-2 text-sm text-fg-muted">{FIXED_ADVICE}</p>
      </div>
    </li>
  );
}

export default function CohortRiskPanel() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/ml/cohort-risk?limit=5", { signal: ctrl.signal });
        const json: unknown = res.ok ? await res.json() : null;
        setState(isCohortRisk(json) ? { status: "ready", data: json } : { status: "unavailable" });
      } catch {
        if (!ctrl.signal.aborted) setState({ status: "unavailable" });
      }
    })();
    return () => ctrl.abort();
  }, [attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((a) => a + 1);
  };

  const data = state.status === "ready" ? state.data : null;
  const { moderate, high } = data?.thresholds ?? { moderate: 0.3, high: 0.6 };

  return (
    <>
      <h2 id={COHORT_RISK_HEADING_ID} className="text-xl font-semibold text-fg">
        Simulated cohort — patients to follow up
      </h2>

      <Notice tone="info" className="mt-4">
        <p>
          Demo analytics — simulated patient and activity data. These {data?.total ?? 250} patients are simulated, not
          real people, and are separate from the patient shown above.
        </p>
        <p className="mt-2">Risk is an estimate to help decide who to check on first. It is not a diagnosis.</p>
        {data && (
          <p className="mt-2 text-sm">
            Model version {data.model_version} · data up to {formatCutoff(data.reporting_cutoff)}
          </p>
        )}
      </Notice>

      <div className="mt-6">
        {state.status === "loading" && <Loading label="Loading follow-up suggestions…" />}

        {state.status === "unavailable" && (
          <Notice
            tone="warning"
            title="Risk model unavailable"
            action={
              <button type="button" onClick={retry} className={buttonClass("secondary", "md")}>
                Try again
              </button>
            }
          >
            <p>Predictions are not shown because the model service is not running.</p>
            <code className="mt-2 block overflow-x-auto rounded-lg bg-surface px-3 py-2 text-sm text-fg">
              cd ml &amp;&amp; .venv/bin/uvicorn api:app --port 8000
            </code>
          </Notice>
        )}

        {data && data.predictions.length === 0 && <p className="text-base text-fg-muted">No predictions available.</p>}

        {data && data.predictions.length > 0 && (
          <>
            <ul className="space-y-4">
              {data.predictions.map((p) => (
                <PredictionCard key={p.patient_id} p={p} />
              ))}
            </ul>
            <p className="mt-4 text-sm text-fg-muted">
              Risk bands: low is below {percent(moderate)}, moderate is {percent(moderate)} to {percent(high)}, high is{" "}
              {percent(high)} and above. These are prototype thresholds, not medically validated. Points show how much
              a factor adds to the estimate compared with a typical value.
            </p>
          </>
        )}
      </div>
    </>
  );
}

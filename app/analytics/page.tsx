import type { Metadata } from "next";
import { Database, ServerCrash } from "lucide-react";
import { computeAnalytics } from "@/lib/analytics";
import type { AnalyticsSummary, CaregiverSupport, ReminderState } from "@/lib/analytics";
import { loadDemoDataset } from "@/lib/demo-dataset";
import { getCohortRisk, getModelMetrics } from "@/lib/ml-client";
import type { CohortRisk, MlResult, ModelMetrics, RiskBand } from "@/lib/ml-types";
import { formatDisplayDate } from "@/lib/dates";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { cardClass } from "@/components/ui/styles";
import BandPill from "@/components/analytics/BandPill";
import RiskTable from "@/components/analytics/RiskTable";
import ChartFigure from "@/components/charts/ChartFigure";
import LineChart from "@/components/charts/LineChart";
import BarChart from "@/components/charts/BarChart";
import { CHART_COLORS, fmtInt } from "@/components/charts/chart-utils";

export const metadata: Metadata = { title: "Adherence analytics — CareCompanion AI" };

// Reads CSV files and calls a live service on every request, so never prerender this page
// (route segment config `dynamic`; Cache Components is not enabled in next.config.ts).
export const dynamic = "force-dynamic";

const START_COMMAND = "cd ml && .venv/bin/uvicorn api:app --port 8000";
const SOURCE = "Source: simulated data.";

const shortDate = (d: string) => formatDisplayDate(d, { day: "numeric", month: "short" });
const longDate = (d: string) => formatDisplayDate(d, { day: "numeric", month: "short", year: "numeric" });
const pct1 = (n: number | null) => (n === null ? "No data" : `${n.toFixed(1)}%`);
const pctTick = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
const thresholdPct = (t: number) => `${Math.round(t * 100)}%`;
const unavailableText = (r: Extract<MlResult<unknown>, { ok: false }>) =>
  r.reason === "timeout" ? "The service did not answer in time." : r.reason === "bad_response" ? "The service answered with data this page cannot use." : "The service could not be reached.";

const reminderLabel: Record<ReminderState, string> = {
  acknowledged: "Reminder acknowledged",
  not_acknowledged: "Reminder sent, not acknowledged",
  not_sent: "No reminder sent",
};
const supportLabel: Record<CaregiverSupport, string> = { family: "Family caregiver support", none: "No caregiver support" };

export default async function AnalyticsPage() {
  const [dataset, metrics, cohort] = await Promise.all([loadDemoDataset(), getModelMetrics(), getCohortRisk(250)]);
  const a = dataset ? computeAnalytics(dataset) : null;

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Analytics"
        title="Adherence analytics"
        description="How a simulated cohort of patients takes its medicines, how often they open the app, and which patients the prototype model flags as likely to miss the next dose."
      />

      <Notice tone="info" title="Demo analytics — simulated patient and activity data.">
        {a ? (
          <p>
            {fmtInt(a.enrolledPatients)} simulated patients, not real people. Reporting date {formatDisplayDate(a.reportingDate)}, cutoff {a.cutoff}
            {a.timezone === "Asia/Kolkata" ? " IST" : ""} ({a.timezone}). A dose counts as missed only after a {a.graceMinutes}-minute grace period; pending doses are
            excluded from adherence.
          </p>
        ) : (
          <p>All numbers on this page come from generated, simulated data, not real people. Pending doses are excluded from adherence.</p>
        )}
      </Notice>

      {a ? (
        <>
          <Kpis a={a} cohort={cohort} />
          <Charts a={a} />
        </>
      ) : (
        <EmptyState
          icon={<Database aria-hidden="true" className="size-6" />}
          title="No demo data found"
          description="Generate the simulated dataset from the project folder, then reload this page:"
          action={<code className="rounded-lg bg-surface-muted px-3 py-2 text-sm text-fg">ml/.venv/bin/python ml/generate_synthetic_data.py</code>}
        />
      )}

      <section aria-labelledby="model-heading" className="space-y-4">
        <h2 id="model-heading" className="text-2xl font-bold tracking-tight text-fg">
          Risk model
        </h2>
        {metrics.ok ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <ModelSummary m={metrics.data} />
            <ImportanceChart m={metrics.data} />
          </div>
        ) : (
          <ModelUnavailable what="Model details and feature importance" result={metrics} />
        )}
      </section>

      <section aria-labelledby="risk-table-heading" className="space-y-4">
        <h2 id="risk-table-heading" className="text-2xl font-bold tracking-tight text-fg">
          Patient risk table
        </h2>
        {cohort.ok ? (
          <>
            <p className="max-w-3xl text-base text-fg-muted">
              Predicted probability that a simulated patient misses the next dose, using prototype thresholds (low &lt; {thresholdPct(cohort.data.thresholds.moderate)},
              moderate {thresholdPct(cohort.data.thresholds.moderate)}–{thresholdPct(cohort.data.thresholds.high)}, high ≥ {thresholdPct(cohort.data.thresholds.high)}). Scores are
              estimates from simulated data, not a clinical assessment.
            </p>
            <div className={cardClass}>
              <RiskTable predictions={cohort.data.predictions} modelVersion={cohort.data.model_version} />
            </div>
          </>
        ) : (
          <ModelUnavailable what="The patient risk table" result={cohort} />
        )}
      </section>
    </div>
  );
}

function ModelUnavailable({ what, result }: { what: string; result: Extract<MlResult<unknown>, { ok: false }> }) {
  return (
    <Notice tone="warning" title="Model service unavailable">
      <p>
        {what} cannot be shown because the model service did not respond. {unavailableText(result)} No predictions are shown rather than guessed ones.
      </p>
      <p className="mt-2">Start the service in a terminal, then reload:</p>
      <p className="mt-1">
        <code className="rounded bg-surface-muted px-1.5 py-0.5 text-sm text-fg">{START_COMMAND}</code>
      </p>
    </Notice>
  );
}

/* ---------- KPI cards ---------- */

function Kpi({ label, explanation, children }: { label: string; explanation: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={cardClass}>
      <dt className="text-base font-semibold text-fg">{label}</dt>
      <dd className="mt-2">{children}</dd>
      <dd className="mt-3 text-sm text-fg-muted">{explanation}</dd>
    </div>
  );
}

const Big = ({ children }: { children: React.ReactNode }) => <span className="text-3xl font-bold text-fg">{children}</span>;

function Rows({ rows }: { rows: Array<{ label: React.ReactNode; value: string | number }> }) {
  return (
    <ul className="space-y-1.5">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center justify-between gap-3">
          <span className="text-base text-fg">{r.label}</span>
          <span className="text-xl font-bold text-fg tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Kpis({ a, cohort }: { a: AnalyticsSummary; cohort: MlResult<CohortRisk> }) {
  const bands: Record<RiskBand, number> = { high: 0, moderate: 0, low: 0 };
  if (cohort.ok) for (const p of cohort.data.predictions) bands[p.risk_band]++;
  const f = a.fullyAdherentToday;

  return (
    <section aria-labelledby="kpi-heading" className="space-y-4">
      <h2 id="kpi-heading" className="text-2xl font-bold tracking-tight text-fg">
        Key numbers
      </h2>
      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Kpi label="Enrolled simulated patients" explanation="Patients in the simulated cohort. They are generated data, not real people.">
          <Big>{fmtInt(a.enrolledPatients)}</Big> <span className="text-base text-fg-muted">patients</span>
        </Kpi>

        <Kpi
          label="Active patients"
          explanation="Distinct patients with at least one app open, dashboard view or reminder response. Each patient is counted once per period, however many times they used the app."
        >
          <Rows
            rows={[
              { label: `Today (${shortDate(a.reportingDate)})`, value: a.activePatients.today },
              { label: "Yesterday", value: a.activePatients.yesterday },
              { label: "Last 7 days", value: a.activePatients.last7Days },
            ]}
          />
        </Kpi>

        <Kpi
          label="Doses today"
          explanation={`Dose counts, not patient counts, for ${shortDate(a.reportingDate)}. Pending doses are not yet due or still inside the ${a.graceMinutes}-minute grace period; they are not counted as missed.`}
        >
          <Rows
            rows={[
              { label: "Scheduled", value: a.today.scheduled },
              { label: `Due by ${a.cutoff}`, value: a.today.dueByCutoff },
              { label: <StatusBadge status="taken" />, value: a.today.taken },
              { label: <StatusBadge status="pending" />, value: a.today.pending },
              { label: <StatusBadge status="missed" />, value: a.today.missed },
            ]}
          />
        </Kpi>

        <Kpi
          label="Fully adherent patients today"
          explanation={
            <>
              {f.patients} of {f.eligiblePatients} patients with doses due by {a.cutoff} took every one. Patients with no dose due by then are left out.
            </>
          }
        >
          <Big>{f.patients}</Big> <span className="text-base text-fg-muted">of {f.eligiblePatients} patients</span>
        </Kpi>

        <Kpi
          label="Overall dose adherence rate"
          explanation={`${fmtInt(a.overall.taken)} taken of ${fmtInt(a.overall.known)} doses with a known outcome, over all ${a.days} days. Pending doses are excluded.`}
        >
          <Big>{pct1(a.overall.adherenceRate)}</Big>
        </Kpi>

        <Kpi
          label="Model risk bands"
          explanation={
            cohort.ok
              ? `Patients grouped by predicted risk of missing the next dose (model ${cohort.data.model_version}). Prototype thresholds, not medically validated.`
              : "Run the model service to see predicted risk bands."
          }
        >
          {cohort.ok ? (
            <Rows
              rows={[
                { label: <BandPill band="high" />, value: bands.high },
                { label: <BandPill band="moderate" />, value: bands.moderate },
                { label: <BandPill band="low" />, value: bands.low },
              ]}
            />
          ) : (
            <p className="inline-flex items-center gap-2 text-base font-semibold text-pending-fg">
              <ServerCrash aria-hidden="true" className="size-5 shrink-0" />
              Model service unavailable
            </p>
          )}
        </Kpi>
      </dl>
    </section>
  );
}

/* ---------- Charts ---------- */

function Charts({ a }: { a: AnalyticsSummary }) {
  const d = a.daily;
  const first = d[0].date;
  const range = `Last ${d.length} days, ${shortDate(first)} to ${longDate(a.reportingDate)}.`;
  const partial = `The final day is partial: doses after ${a.cutoff} are still pending.`;

  const rates = d.map((x) => x.adherenceRate).filter((r): r is number => r !== null);
  const lastDay = d[d.length - 1];
  const dayLabels = d.map((x) => shortDate(x.date));

  const bins = a.patientAdherence;
  const binned = bins.reduce((sum, b) => sum + b.patients, 0);
  const modal = bins.reduce((best, b) => (b.patients > best.patients ? b : best), bins[0]);

  const groups = a.byReminderAndSupport;
  const reminders: ReminderState[] = ["acknowledged", "not_acknowledged", "not_sent"];
  const supports: CaregiverSupport[] = ["family", "none"];
  const groupOf = (r: ReminderState, s: CaregiverSupport) => groups.find((g) => g.reminder === r && g.support === s)!;

  return (
    <section aria-labelledby="charts-heading" className="space-y-4">
      <h2 id="charts-heading" className="text-2xl font-bold tracking-tight text-fg">
        Trends and distributions
      </h2>
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartFigure
          id="adherence-daily"
          title="Daily dose adherence"
          caption={`${range} Percent of doses with a known outcome that were taken; pending doses are excluded. ${partial} ${SOURCE}`}
          table={{
            columns: ["Date", "Adherence (%)", "Taken (doses)", "Missed (doses)", "Pending, excluded (doses)"],
            rows: d.map((x) => [longDate(x.date), x.adherenceRate === null ? "No data" : x.adherenceRate.toFixed(1), x.taken, x.missed, x.pending]),
          }}
        >
          <LineChart
            ariaLabel={`Line chart of daily dose adherence in percent over the last ${d.length} days. ${rates.length ? `Lowest ${pctTick(Math.min(...rates))}, highest ${pctTick(Math.max(...rates))}; latest ${pct1(lastDay.adherenceRate)} on ${longDate(lastDay.date)}.` : "No doses with a known outcome."}`}
            points={d.map((x, i) => ({
              label: dayLabels[i],
              value: x.adherenceRate,
              tooltip:
                x.adherenceRate === null
                  ? `${longDate(x.date)}: no doses with a known outcome`
                  : `${longDate(x.date)}: ${x.adherenceRate.toFixed(1)}% adherence (${x.taken} taken of ${x.taken + x.missed} doses with a known outcome)`,
            }))}
            yMax={100}
            yTicks={[0, 25, 50, 75, 100]}
            xAxisLabel="Date"
            yAxisLabel="Adherence (% taken)"
            formatValue={pctTick}
          />
        </ChartFigure>

        <ChartFigure
          id="doses-daily"
          title="Taken and missed doses per day"
          caption={`${range} Dose counts, not patients. Pending doses are not drawn (listed in the table). ${partial} ${SOURCE}`}
          legend={[
            { label: "Taken", color: CHART_COLORS.taken },
            { label: "Missed", color: CHART_COLORS.missed, hatched: true },
          ]}
          table={{
            columns: ["Date", "Taken (doses)", "Missed (doses)", "Pending (doses)"],
            rows: d.map((x) => [longDate(x.date), x.taken, x.missed, x.pending]),
          }}
        >
          <BarChart
            id="doses-daily"
            ariaLabel={`Stacked bar chart of taken and missed doses per day over the last ${d.length} days. On ${longDate(lastDay.date)}: ${lastDay.taken} taken and ${lastDay.missed} missed so far.`}
            categories={dayLabels}
            series={[
              { name: "Taken", color: CHART_COLORS.taken, values: d.map((x) => x.taken) },
              { name: "Missed", color: CHART_COLORS.missed, hatched: true, values: d.map((x) => x.missed) },
            ]}
            mode="stacked"
            tickEvery={5}
            categoryAxisLabel="Date"
            valueAxisLabel="Doses per day"
            formatValue={fmtInt}
            tooltip={(c) => `${longDate(d[c].date)}: ${d[c].taken} taken, ${d[c].missed} missed (${d[c].pending} pending, not drawn)`}
          />
        </ChartFigure>

        <ChartFigure
          id="active-daily"
          title="Daily active simulated patients"
          caption={`${range} Distinct patients per day with any app open, dashboard view or reminder response, out of ${fmtInt(a.enrolledPatients)} enrolled. ${SOURCE}`}
          table={{
            columns: ["Date", "Active patients"],
            rows: d.map((x) => [longDate(x.date), x.activePatients]),
          }}
        >
          <LineChart
            ariaLabel={`Line chart of daily active simulated patients over the last ${d.length} days. Latest: ${lastDay.activePatients} patients on ${longDate(lastDay.date)}.`}
            points={d.map((x, i) => ({
              label: dayLabels[i],
              value: x.activePatients,
              tooltip: `${longDate(x.date)}: ${x.activePatients} active patients`,
            }))}
            xAxisLabel="Date"
            yAxisLabel="Active patients"
            formatValue={fmtInt}
          />
        </ChartFigure>

        <ChartFigure
          id="adherence-distribution"
          title={`Distribution of patient adherence over ${a.days} days`}
          caption={`All ${a.days} days, ${fmtInt(binned)} patients with at least one known dose outcome. Each bar counts patients, in 10-point bands (the last band includes 100%). Pending doses are excluded. ${SOURCE}`}
          table={{
            columns: ["Adherence band (%)", "Patients"],
            rows: bins.map((b) => [b.label, b.patients]),
          }}
        >
          <BarChart
            id="adherence-distribution"
            ariaLabel={`Histogram of patient adherence over ${a.days} days in ten 10-point bands. The most common band is ${modal.label} percent with ${modal.patients} patients.`}
            categories={bins.map((b) => b.label)}
            series={[{ name: "Patients", color: CHART_COLORS.primary, values: bins.map((b) => b.patients) }]}
            maxBar={32}
            valueLabels
            categoryAxisLabel="Adherence over the period (% of known doses taken)"
            valueAxisLabel="Patients"
            formatValue={fmtInt}
            tooltip={(c) => `${bins[c].label}% adherence: ${bins[c].patients} patients`}
          />
        </ChartFigure>

        <div className="min-w-0 xl:col-span-2 [&_svg[role=img]]:mx-auto [&_svg[role=img]]:max-w-2xl">
          <ChartFigure
            id="adherence-reminder-support"
            title="Observed adherence by reminder response and caregiver support"
            caption={`All ${a.days} days, doses with a known outcome only (pending excluded). Percent of those doses taken, grouped by what happened to the reminder and by the patient's caregiver support. This describes the simulated data; it does not show that reminders or caregivers cause better adherence. ${SOURCE}`}
            legend={[
              { label: supportLabel.family, color: CHART_COLORS.primary },
              { label: supportLabel.none, color: CHART_COLORS.muted, hatched: true },
            ]}
            table={{
              columns: ["Reminder", "Caregiver support", "Adherence (%)", "Taken (doses)", "Known outcomes (doses)"],
              rows: reminders.flatMap((r) =>
                supports.map((s) => {
                  const g = groupOf(r, s);
                  return [reminderLabel[r], supportLabel[s], g.adherenceRate === null ? "No data" : g.adherenceRate.toFixed(1), g.taken, g.known];
                }),
              ),
            }}
          >
            <BarChart
              id="adherence-reminder-support"
              ariaLabel={`Grouped bar chart of observed dose adherence in percent for three reminder outcomes, split by family caregiver support or none. ${reminders
                .map((r) => `${reminderLabel[r]}: ${supports.map((s) => `${supportLabel[s]} ${pct1(groupOf(r, s).adherenceRate)}`).join(", ")}`)
                .join("; ")}.`}
              categories={reminders.map((r) => reminderLabel[r])}
              series={supports.map((s) => ({
                name: supportLabel[s],
                color: s === "family" ? CHART_COLORS.primary : CHART_COLORS.muted,
                hatched: s === "none",
                values: reminders.map((r) => groupOf(r, s).adherenceRate),
              }))}
              yMax={100}
              yTicks={[0, 25, 50, 75, 100]}
              valueLabels
              maxBar={44}
              wrapAt={24}
              categoryAxisLabel="Reminder outcome"
              valueAxisLabel="Adherence (% taken)"
              formatValue={pctTick}
              tooltip={(c, s) => {
                const g = groupOf(reminders[c], supports[s]);
                return `${reminderLabel[g.reminder]}, ${supportLabel[g.support]}: ${pct1(g.adherenceRate)} (${fmtInt(g.taken)} taken of ${fmtInt(g.known)} doses with a known outcome)`;
              }}
            />
          </ChartFigure>
        </div>
      </div>
    </section>
  );
}

/* ---------- Model ---------- */

function ImportanceChart({ m }: { m: ModelMetrics }) {
  const features = [...m.feature_importance].sort((x, y) => y.importance_mean - x.importance_mean).slice(0, 12);
  return (
    <ChartFigure
      id="feature-importance"
      title="Model feature importance"
      caption={`Global importance across the test set — not an explanation for any one patient. Permutation importance: how much the model's test score drops when one input is shuffled (top ${features.length}). ${SOURCE}`}
      table={{
        columns: ["Feature", "Importance (mean)", "Std. deviation"],
        rows: features.map((f) => [f.label, f.importance_mean.toFixed(4), f.importance_std.toFixed(4)]),
      }}
    >
      <BarChart
        id="feature-importance"
        ariaLabel={`Horizontal bar chart of permutation importance for the top ${features.length} model features. ${features[0] ? `Largest: ${features[0].label}, ${features[0].importance_mean.toFixed(3)}.` : ""}`}
        categories={features.map((f) => f.label)}
        series={[{ name: "Importance", color: CHART_COLORS.primary, values: features.map((f) => f.importance_mean) }]}
        orientation="horizontal"
        valueLabels
        wrapAt={28}
        categoryAxisLabel="Feature"
        valueAxisLabel="Permutation importance (drop in test score)"
        formatValue={(n) => n.toFixed(3)}
        tooltip={(c) => `${features[c].label}: importance ${features[c].importance_mean.toFixed(4)} (± ${features[c].importance_std.toFixed(4)})`}
      />
    </ChartFigure>
  );
}

function ModelSummary({ m }: { m: ModelMetrics }) {
  const rocs = Object.entries(m.test_metrics).map(([name, t]) => ({
    name,
    roc: t.roc_auc,
    // train_model.py names the reference model "baseline_prior" (DummyClassifier predicting the class prior).
    role: name === m.selected_model ? "Selected model" : name.startsWith("baseline") ? "Baseline" : "Comparison model",
  }));
  const t = m.risk_thresholds;

  return (
    <div className={`${cardClass} min-w-0`}>
      <h3 className="text-lg font-semibold text-fg">Model summary</h3>
      <dl className="mt-3 grid grid-cols-1 gap-y-0.5 text-base sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:gap-y-2 [&_dd]:mb-2 sm:[&_dd]:mb-0 [&_dd]:break-words">
        <dt className="text-fg-muted">Selected model</dt>
        <dd className="font-semibold text-fg">{m.selected_model}</dd>
        <dt className="text-fg-muted">Model version</dt>
        <dd className="font-semibold text-fg">{m.model_version}</dd>
        {rocs.map((r) => (
          <div key={r.name} className="contents">
            <dt className="text-fg-muted">
              Test ROC-AUC
              {r.role === "Selected model" ? " (selected)" : `, ${r.role.toLowerCase()} (${r.name})`}
            </dt>
            <dd className="font-semibold text-fg tabular-nums">{r.roc === null ? "Not available" : r.roc.toFixed(3)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-base text-fg-muted">
        Tested on {fmtInt(m.data.test_examples)} dose examples from {fmtInt(m.data.test_patients)} held-out simulated patients; trained on {fmtInt(m.data.train_examples)} examples from{" "}
        {fmtInt(m.data.train_patients)} patients.
      </p>

      <p className="mt-4 text-base text-fg">{m.disclaimer}</p>
      {m.reliability_notes.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-base text-fg-muted">
          {m.reliability_notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-base font-semibold text-fg">
        Risk bands use prototype thresholds (low &lt; {thresholdPct(t.moderate)}, moderate {thresholdPct(t.moderate)}–{thresholdPct(t.high)}, high ≥ {thresholdPct(t.high)}), not
        medically validated cutoffs.
      </p>
    </div>
  );
}

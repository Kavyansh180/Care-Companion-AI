"use client";

import { useId, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { CohortPrediction, RiskBand } from "@/lib/ml-types";
import BandPill from "./BandPill";
import EmptyState from "@/components/ui/EmptyState";
import { buttonClass, inputClass, labelClass } from "@/components/ui/styles";

type SortKey = "patient_id" | "adherence_7d" | "missed_7d" | "probability" | "risk_band";
type SortDir = "asc" | "desc";
type BandFilter = "all" | RiskBand;

const bandRank: Record<RiskBand, number> = { low: 0, moderate: 1, high: 2 };

const columns: Array<{ key: SortKey | null; label: string; numeric?: boolean }> = [
  { key: "patient_id", label: "Patient ID" },
  { key: "adherence_7d", label: "7-day adherence", numeric: true },
  { key: "missed_7d", label: "Missed doses (7 days)", numeric: true },
  { key: "probability", label: "Predicted probability of missing next dose", numeric: true },
  { key: "risk_band", label: "Risk band" },
  { key: null, label: "Model version" },
];

// Missing 7-day adherence ("No data") always sorts last, in either direction.
function compare(a: CohortPrediction, b: CohortPrediction, key: SortKey, dir: SortDir): number {
  const sign = dir === "asc" ? 1 : -1;
  let diff = 0;
  switch (key) {
    case "patient_id":
      diff = a.patient_id.localeCompare(b.patient_id);
      break;
    case "adherence_7d":
      if (a.adherence_7d === null || b.adherence_7d === null) {
        if (a.adherence_7d === b.adherence_7d) return a.patient_id.localeCompare(b.patient_id);
        return a.adherence_7d === null ? 1 : -1;
      }
      diff = a.adherence_7d - b.adherence_7d;
      break;
    case "missed_7d":
      diff = a.missed_7d - b.missed_7d;
      break;
    case "probability":
      diff = a.probability - b.probability;
      break;
    case "risk_band":
      diff = bandRank[a.risk_band] - bandRank[b.risk_band];
      break;
  }
  return diff !== 0 ? sign * diff : a.patient_id.localeCompare(b.patient_id);
}

export default function RiskTable({ predictions, modelVersion }: { predictions: CohortPrediction[]; modelVersion: string }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: "probability", dir: "desc" });
  const [band, setBand] = useState<BandFilter>("all");
  const [query, setQuery] = useState("");
  const bandId = useId();
  const searchId = useId();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return predictions
      .filter((p) => (band === "all" || p.risk_band === band) && (q === "" || p.patient_id.toLowerCase().includes(q)))
      .sort((a, b) => compare(a, b, sort.key, sort.dir));
  }, [predictions, band, query, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "patient_id" ? "asc" : "desc" }));
  const filtered = band !== "all" || query.trim() !== "";

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <label htmlFor={bandId} className={labelClass}>
            Risk band
          </label>
          <select id={bandId} value={band} onChange={(e) => setBand(e.target.value as BandFilter)} className={`${inputClass} mt-1`}>
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="moderate">Moderate</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="sm:w-64">
          <label htmlFor={searchId} className={labelClass}>
            Patient ID
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="For example P042"
            autoComplete="off"
            className={`${inputClass} mt-1`}
          />
        </div>
        <p aria-live="polite" className="text-base text-fg-muted sm:ml-auto sm:pb-2.5">
          {rows.length} of {predictions.length} patients
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No patients match these filters"
            description="Change the risk band or the patient ID to see more rows."
            action={
              <button
                type="button"
                className={buttonClass("secondary", "md")}
                onClick={() => {
                  setBand("all");
                  setQuery("");
                }}
              >
                Clear filters
              </button>
            }
          />
        </div>
      ) : (
        <div
          className="mt-4 max-h-[36rem] overflow-auto rounded-xl border border-border"
          role="region"
          aria-label="Patient risk table, scrolls sideways on small screens"
          tabIndex={0}
        >
          <table className="w-full min-w-[46rem] border-collapse text-left text-base">
            <caption className="sr-only">
              Simulated patients with predicted risk of missing the next dose{filtered ? " (filtered)" : ""}
            </caption>
            <thead className="sticky top-0 z-10 bg-surface-muted text-fg">
              <tr>
                {columns.map((col) => {
                  const active = col.key !== null && sort.key === col.key;
                  const SortIcon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <th
                      key={col.label}
                      scope="col"
                      aria-sort={col.key === null ? undefined : active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
                      className={`border-b border-border px-3 py-2 align-bottom text-sm font-semibold ${col.numeric ? "text-right" : ""}`}
                    >
                      {col.key === null ? (
                        col.label
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key as SortKey)}
                          className={`inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-md px-1 text-left font-semibold hover:text-primary-text`}
                        >
                          <span>{col.label}</span>
                          <SortIcon aria-hidden="true" className={`size-4 shrink-0 ${active ? "text-primary-text" : "text-fg-muted"}`} />
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {rows.map((p) => (
                <tr key={p.patient_id}>
                  <th scope="row" className="px-3 py-2 font-semibold whitespace-nowrap">
                    {p.patient_id}
                  </th>
                  <td className="px-3 py-2 text-right tabular-nums">{p.adherence_7d === null ? "No data" : `${Math.round(p.adherence_7d * 100)}%`}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{p.missed_7d}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{(p.probability * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2">
                    <BandPill band={p.risk_band} />
                  </td>
                  <td className="px-3 py-2 text-fg-muted whitespace-nowrap">{modelVersion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

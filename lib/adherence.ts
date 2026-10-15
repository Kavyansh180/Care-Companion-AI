// Adherence = taken / (taken + missed); pending doses are excluded, never counted as missed.
export type DoseStatus = "taken" | "missed" | "pending";

export interface DoseSummary {
  total: number;
  taken: number;
  missed: number;
  pending: number;
  known: number; // taken + missed
}

export function summarizeDoses(doses: ReadonlyArray<{ status: DoseStatus }>): DoseSummary {
  const taken = doses.filter((d) => d.status === "taken").length;
  const missed = doses.filter((d) => d.status === "missed").length;
  const pending = doses.filter((d) => d.status === "pending").length;
  return { total: doses.length, taken, missed, pending, known: taken + missed };
}

// Unrounded percentage; null when there is nothing decided yet.
export function adherenceRate(summary: DoseSummary): number | null {
  return summary.known === 0 ? null : (summary.taken / summary.known) * 100;
}

export function missedRate(summary: DoseSummary): number | null {
  return summary.known === 0 ? null : (summary.missed / summary.known) * 100;
}

// null when nothing is due (patient is excluded from the count); true only if every due dose is taken.
export function isFullyAdherent(dueDoses: ReadonlyArray<{ status: DoseStatus }>): boolean | null {
  return dueDoses.length === 0 ? null : dueDoses.every((d) => d.status === "taken");
}

// Pure analytics over the synthetic demo dataset. No I/O, no clock: "today" is the dataset's reporting date.
// Erasable TypeScript only and a single explicit-.ts import so Node's test runner can load this file directly.
// Dates are "YYYY-MM-DD" and times "HH:MM" (naive Asia/Kolkata); they are compared as strings on purpose.
import { summarizeDoses, adherenceRate, isFullyAdherent } from "./adherence.ts";

export type DoseOutcome = "taken" | "missed" | "pending";
export type CaregiverSupport = "none" | "family";
export type ReminderState = "acknowledged" | "not_acknowledged" | "not_sent";

export interface Patient {
  patientId: string;
  ageBand: string;
  chronicConditionCount: number;
  dailyMedCount: number;
  caregiverSupport: CaregiverSupport;
  reminderEnabled: boolean;
  preferredLanguage: string;
  engagementLevel: string;
}

export interface DoseEvent {
  patientId: string;
  medicationId: string;
  date: string;
  time: string;
  status: DoseOutcome;
  reminderSent: boolean;
  reminderAcknowledged: boolean;
  takenAt: string | null;
  delayMinutes: number | null;
}

export interface ActivityEvent {
  patientId: string;
  date: string;
  time: string;
  type: string; // app_open | dashboard_view | reminder_response; every row is qualifying activity
}

export interface DatasetMeta {
  days: number;
  startDate: string;
  endDate: string;
  reportingCutoff: string; // "YYYY-MM-DDTHH:MM"
  graceMinutes: number;
  timezone: string;
  patients: number;
  seed: number;
  synthetic: boolean;
  generator: string;
}

export interface AnalyticsInput {
  patients: ReadonlyArray<Patient>;
  doses: ReadonlyArray<DoseEvent>;
  activity: ReadonlyArray<ActivityEvent>;
  meta: DatasetMeta;
}

export interface DailyPoint {
  date: string;
  taken: number; // dose counts
  missed: number;
  pending: number;
  adherenceRate: number | null; // percent, pending excluded
  activePatients: number; // patient count
}

export interface AdherenceBin {
  label: string; // "0–10", ..., "90–100"
  from: number;
  to: number;
  patients: number; // patient count
}

export interface ReminderSupportGroup {
  reminder: ReminderState;
  support: CaregiverSupport;
  taken: number; // dose counts, resolved doses only
  known: number;
  adherenceRate: number | null;
}

export interface AnalyticsSummary {
  reportingDate: string;
  cutoff: string; // "HH:MM"
  timezone: string;
  graceMinutes: number;
  startDate: string;
  days: number;
  enrolledPatients: number;
  activePatients: { today: number; yesterday: number; last7Days: number }; // distinct patients
  today: { scheduled: number; dueByCutoff: number; taken: number; missed: number; pending: number }; // doses
  fullyAdherentToday: { patients: number; eligiblePatients: number }; // patients
  overall: { taken: number; missed: number; pending: number; known: number; adherenceRate: number | null }; // doses
  daily: DailyPoint[];
  patientAdherence: AdherenceBin[];
  byReminderAndSupport: ReminderSupportGroup[];
}

const DAY_MS = 86_400_000;
export const DAILY_WINDOW_DAYS = 30;
export const ACTIVE_WINDOW_DAYS = 7;

// UTC arithmetic on the calendar date only, so there are no timezone or DST surprises.
export function addDays(date: string, delta: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + delta * DAY_MS).toISOString().slice(0, 10);
}

function groupBy<T>(items: ReadonlyArray<T>, key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = out.get(k);
    if (list) list.push(item);
    else out.set(k, [item]);
  }
  return out;
}

export function computeAnalytics({ patients, doses, activity, meta }: AnalyticsInput): AnalyticsSummary {
  const reportingDate = meta.endDate;
  const cutoff = meta.reportingCutoff.slice(11, 16);

  // Distinct patients with any activity row, per calendar day.
  const activeByDate = new Map<string, Set<string>>();
  for (const a of activity) {
    const set = activeByDate.get(a.date);
    if (set) set.add(a.patientId);
    else activeByDate.set(a.date, new Set([a.patientId]));
  }
  const activeOn = (date: string) => activeByDate.get(date)?.size ?? 0;
  const week = new Set<string>();
  for (let i = 0; i < ACTIVE_WINDOW_DAYS; i++) {
    for (const id of activeByDate.get(addDays(reportingDate, -i)) ?? []) week.add(id);
  }

  const dosesByDate = groupBy(doses, (d) => d.date);
  const todayDoses = dosesByDate.get(reportingDate) ?? [];
  const todaySummary = summarizeDoses(todayDoses);
  const dueToday = todayDoses.filter((d) => d.time <= cutoff);

  // Patient-level: eligible = at least one dose due by the cutoff; fully adherent = every due dose taken.
  let eligiblePatients = 0;
  let fullyAdherentPatients = 0;
  for (const due of groupBy(dueToday, (d) => d.patientId).values()) {
    const full = isFullyAdherent(due);
    if (full === null) continue;
    eligiblePatients++;
    if (full) fullyAdherentPatients++;
  }

  const overall = summarizeDoses(doses);

  const daily: DailyPoint[] = [];
  for (let i = DAILY_WINDOW_DAYS - 1; i >= 0; i--) {
    const date = addDays(reportingDate, -i);
    const s = summarizeDoses(dosesByDate.get(date) ?? []);
    daily.push({
      date,
      taken: s.taken,
      missed: s.missed,
      pending: s.pending,
      adherenceRate: adherenceRate(s),
      activePatients: activeOn(date),
    });
  }

  // Ten bins [0,10) ... [90,100]. Integer maths (taken * 10 / known) keeps exact boundaries exact.
  const patientAdherence: AdherenceBin[] = Array.from({ length: 10 }, (_, i) => ({
    label: `${i * 10}–${i * 10 + 10}`,
    from: i * 10,
    to: i * 10 + 10,
    patients: 0,
  }));
  for (const own of groupBy(doses, (d) => d.patientId).values()) {
    const s = summarizeDoses(own);
    if (s.known === 0) continue;
    patientAdherence[Math.min(9, Math.floor((s.taken * 10) / s.known))].patients++;
  }

  const supportById = new Map(patients.map((p) => [p.patientId, p.caregiverSupport]));
  const reminders: ReminderState[] = ["acknowledged", "not_acknowledged", "not_sent"];
  const supports: CaregiverSupport[] = ["none", "family"];
  const buckets = new Map<string, DoseEvent[]>();
  for (const d of doses) {
    const support = supportById.get(d.patientId);
    if (!support || d.status === "pending") continue;
    const reminder: ReminderState = !d.reminderSent ? "not_sent" : d.reminderAcknowledged ? "acknowledged" : "not_acknowledged";
    const k = `${reminder}|${support}`;
    const list = buckets.get(k);
    if (list) list.push(d);
    else buckets.set(k, [d]);
  }
  const byReminderAndSupport: ReminderSupportGroup[] = reminders.flatMap((reminder) =>
    supports.map((support) => {
      const s = summarizeDoses(buckets.get(`${reminder}|${support}`) ?? []);
      return { reminder, support, taken: s.taken, known: s.known, adherenceRate: adherenceRate(s) };
    }),
  );

  return {
    reportingDate,
    cutoff,
    timezone: meta.timezone,
    graceMinutes: meta.graceMinutes,
    startDate: meta.startDate,
    days: meta.days,
    enrolledPatients: patients.length,
    activePatients: {
      today: activeOn(reportingDate),
      yesterday: activeOn(addDays(reportingDate, -1)),
      last7Days: week.size,
    },
    today: {
      scheduled: todaySummary.total,
      dueByCutoff: dueToday.length,
      taken: todaySummary.taken,
      missed: todaySummary.missed,
      pending: todaySummary.pending,
    },
    fullyAdherentToday: { patients: fullyAdherentPatients, eligiblePatients },
    overall: {
      taken: overall.taken,
      missed: overall.missed,
      pending: overall.pending,
      known: overall.known,
      adherenceRate: adherenceRate(overall),
    },
    daily,
    patientAdherence,
    byReminderAndSupport,
  };
}

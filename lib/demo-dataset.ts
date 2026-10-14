// Server-only: reads the synthetic CSV files written by ml/generate_synthetic_data.py.
// Never import this from a client component (node:fs).
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { ActivityEvent, CaregiverSupport, DatasetMeta, DoseEvent, DoseOutcome, Patient } from "./analytics.ts";

export interface DemoDataset {
  patients: Patient[];
  doses: DoseEvent[];
  activity: ActivityEvent[];
  meta: DatasetMeta;
}

const PATIENT_COLUMNS = "patient_id,age_band,chronic_condition_count,daily_med_count,caregiver_support,reminder_enabled,preferred_language,engagement_level";
const DOSE_COLUMNS = "event_id,patient_id,medication_id,event_date,scheduled_time,reminder_sent,reminder_acknowledged,status,taken_at,delay_minutes";
const ACTIVITY_COLUMNS = "activity_id,patient_id,activity_date,activity_time,activity_type,reminder_interaction,dashboard_viewed";

const dataDir = () => path.join(process.cwd(), "ml", "data");

// shortcut: naive CSV split, upgrade to a real parser if the data source changes
function readRows(file: string, text: string, expectedHeader: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l !== "");
  if (lines[0] !== expectedHeader) {
    throw new Error(`ml/data/${file}: unexpected header. Expected "${expectedHeader}" but found "${lines[0] ?? ""}". Regenerate the data with ml/generate_synthetic_data.py.`);
  }
  const width = expectedHeader.split(",").length;
  return lines.slice(1).map((line, i) => {
    const cells = line.split(",");
    if (cells.length !== width) throw new Error(`ml/data/${file}: line ${i + 2} has ${cells.length} fields, expected ${width}.`);
    return cells;
  });
}

function bool(file: string, v: string): boolean {
  if (v === "true") return true;
  if (v === "false") return false;
  throw new Error(`ml/data/${file}: expected "true" or "false" but found "${v}".`);
}

function int(file: string, v: string): number {
  const n = Number(v);
  if (v === "" || !Number.isInteger(n)) throw new Error(`ml/data/${file}: expected an integer but found "${v}".`);
  return n;
}

function oneOf<T extends string>(file: string, v: string, allowed: ReadonlyArray<T>): T {
  if (!(allowed as ReadonlyArray<string>).includes(v)) throw new Error(`ml/data/${file}: unexpected value "${v}".`);
  return v as T;
}

async function read(): Promise<DemoDataset> {
  const dir = dataDir();
  const [patientsText, dosesText, activityText, metaText] = await Promise.all(
    ["patients.csv", "dose_events.csv", "app_activity.csv", "metadata.json"].map((f) => readFile(path.join(dir, f), "utf8")),
  );

  const patients: Patient[] = readRows("patients.csv", patientsText, PATIENT_COLUMNS).map((c) => ({
    patientId: c[0],
    ageBand: c[1],
    chronicConditionCount: int("patients.csv", c[2]),
    dailyMedCount: int("patients.csv", c[3]),
    caregiverSupport: oneOf<CaregiverSupport>("patients.csv", c[4], ["none", "family"]),
    reminderEnabled: bool("patients.csv", c[5]),
    preferredLanguage: c[6],
    engagementLevel: c[7],
  }));

  const doses: DoseEvent[] = readRows("dose_events.csv", dosesText, DOSE_COLUMNS).map((c) => ({
    patientId: c[1],
    medicationId: c[2],
    date: c[3],
    time: c[4],
    reminderSent: bool("dose_events.csv", c[5]),
    reminderAcknowledged: bool("dose_events.csv", c[6]),
    status: oneOf<DoseOutcome>("dose_events.csv", c[7], ["taken", "missed", "pending"]),
    takenAt: c[8] === "" ? null : c[8],
    delayMinutes: c[9] === "" ? null : int("dose_events.csv", c[9]),
  }));

  const activity: ActivityEvent[] = readRows("app_activity.csv", activityText, ACTIVITY_COLUMNS).map((c) => ({
    patientId: c[1],
    date: c[2],
    time: c[3],
    type: c[4],
  }));

  const m = JSON.parse(metaText) as Record<string, unknown>;
  const str = (k: string) => {
    if (typeof m[k] !== "string") throw new Error(`ml/data/metadata.json: "${k}" is missing or not a string.`);
    return m[k] as string;
  };
  const num = (k: string) => {
    if (typeof m[k] !== "number") throw new Error(`ml/data/metadata.json: "${k}" is missing or not a number.`);
    return m[k] as number;
  };
  const meta: DatasetMeta = {
    days: num("days"),
    startDate: str("start_date"),
    endDate: str("end_date"),
    reportingCutoff: str("reporting_cutoff"),
    graceMinutes: num("grace_minutes"),
    timezone: str("timezone"),
    patients: num("patients"),
    seed: num("seed"),
    synthetic: m.synthetic === true,
    generator: str("generator"),
  };

  return { patients, doses, activity, meta };
}

// Parsed once per file version: re-parsed only when dose_events.csv changes on disk (e.g. the data was regenerated).
let cache: { mtimeMs: number; promise: Promise<DemoDataset> } | null = null;

// Returns null when the data has not been generated yet. Throws on malformed files.
export async function loadDemoDataset(): Promise<DemoDataset | null> {
  let mtimeMs: number;
  try {
    mtimeMs = (await stat(path.join(dataDir(), "dose_events.csv"))).mtimeMs;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
  if (!cache || cache.mtimeMs !== mtimeMs) {
    const entry = { mtimeMs, promise: read() };
    cache = entry;
    entry.promise.catch(() => {
      if (cache === entry) cache = null; // never keep a failed load
    });
  }
  try {
    return await cache.promise;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; // another file is missing
    throw e;
  }
}

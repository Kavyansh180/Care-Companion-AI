"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, RotateCcw, Upload } from "lucide-react";
import { useAppState, generateUniqueId } from "@/context/AppContext";
import { localDateString } from "@/lib/dates";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Notice from "@/components/ui/Notice";
import Loading from "@/components/ui/Loading";
import { buttonClass, cardClass, hintClass, inputClass, labelClass } from "@/components/ui/styles";

type Stage = "idle" | "reading" | "review" | "error";
type Slot = "morning" | "afternoon" | "evening" | "night";

interface OriginalOcrData {
  name?: string;
  dosage?: string;
  exactTime?: string;
  duration?: number;
  notes?: string;
}

// A medicine as it comes back from the API (or from the built-in sample).
interface ParsedMed {
  name?: string;
  dosage?: string;
  frequency?: string;
  timeOfDay?: string[];
  exactTime?: string;
  duration?: number;
  notes?: string;
  originalOcrData?: OriginalOcrData;
}

// A medicine in the editable review list.
interface ReviewMed {
  include: boolean;
  name: string;
  dosage: string;
  duration: string; // kept as text so the field can be cleared while typing
  notes: string;
  frequency: string;
  reminderTimes: { timeSlot: Slot; time: string }[];
  originalOcrData: OriginalOcrData;
}

const SLOT_DEFAULT_TIME: Record<Slot, string> = {
  morning: "08:00",
  afternoon: "13:00",
  evening: "18:00",
  night: "21:00",
};
const SLOT_LABEL: Record<Slot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};
const isSlot = (s: string): s is Slot => s in SLOT_DEFAULT_TIME;

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
// Some browsers report an empty type for HEIC files, so fall back to the extension.
const TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};
const MAX_BYTES = 5 * 1024 * 1024;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const SAMPLE_PRESCRIPTION_TEXT = `Patient: Mr. Ramesh, 72 yrs
Diagnosis: Hypertension & Cardiovascular Care

Rx:
1. Tab Telmisartan 40 mg
   1 tab, morning, 30 days
   Take after breakfast

2. Tab Amlodipine 5 mg
   1 tab, night, 30 days
   Take at bedtime`;

const SAMPLE_JSON = {
  patient: "Mr. Ramesh",
  medications: [
    {
      name: "Telmisartan",
      dosage: "40 mg",
      timing: "Morning",
      timeOfDay: ["morning"],
      exactTime: "08:00",
      duration_days: 30,
      instructions: "Take after breakfast",
    },
    {
      name: "Amlodipine",
      dosage: "5 mg",
      timing: "Night",
      timeOfDay: ["night"],
      exactTime: "21:00",
      duration_days: 30,
      instructions: "Take at bedtime",
    },
  ],
};

const SAMPLE_MEDS: ParsedMed[] = [
  {
    name: "Telmisartan",
    dosage: "40 mg",
    frequency: "Daily",
    timeOfDay: ["morning"],
    exactTime: "08:00",
    duration: 30,
    notes: "Take after breakfast",
    originalOcrData: { name: "Telmisartan", dosage: "40 mg", exactTime: "08:00", duration: 30, notes: "Take after breakfast" },
  },
  {
    name: "Amlodipine",
    dosage: "5 mg",
    frequency: "Daily",
    timeOfDay: ["night"],
    exactTime: "21:00",
    duration: 30,
    notes: "Take at bedtime",
    originalOcrData: { name: "Amlodipine", dosage: "5 mg", exactTime: "21:00", duration: 30, notes: "Take at bedtime" },
  },
];

function toReviewMed(m: ParsedMed): ReviewMed {
  const slots = [...new Set((m.timeOfDay ?? []).filter(isSlot))];
  return {
    include: true,
    name: m.name ?? "",
    dosage: m.dosage ?? "",
    duration: String(m.duration ?? 30),
    notes: m.notes ?? "",
    frequency: m.frequency || "Daily",
    // Only the first slot has a parsed time; the others start from the usual time for that part of the day.
    reminderTimes: (slots.length > 0 ? slots : (["morning"] as Slot[])).map((timeSlot, i) => ({
      timeSlot,
      time: i === 0 && m.exactTime ? m.exactTime : SLOT_DEFAULT_TIME[timeSlot],
    })),
    originalOcrData: m.originalOcrData ?? {
      name: m.name,
      dosage: m.dosage,
      exactTime: m.exactTime,
      duration: m.duration,
      notes: m.notes,
    },
  };
}

function medErrors(m: ReviewMed) {
  const days = Number(m.duration);
  const e = {
    name: m.name.trim() ? "" : "Enter the medicine name.",
    dosage: m.dosage.trim() ? "" : "Enter the dosage, for example 40 mg.",
    duration: Number.isInteger(days) && days >= 1 ? "" : "Enter a whole number of days, 1 or more.",
    times: m.reminderTimes.map((rt) => (TIME_PATTERN.test(rt.time) ? "" : "Enter a valid time.")),
  };
  return { ...e, invalid: !!(e.name || e.dosage || e.duration || e.times.some(Boolean)) };
}

// "Mr. Ramesh" and "Ramesh Kumar" count as the same person; "Sita" does not.
function namesMatch(a: string, b: string): boolean {
  const words = (s: string) =>
    s
      .toLowerCase()
      .replace(/\./g, " ")
      .replace(/^\s*(mr|mrs|ms|dr)\s+/, "")
      .split(/\s+/)
      .filter(Boolean);
  const wa = words(a);
  const wb = words(b);
  return wa.every((w) => wb.includes(w)) || wb.every((w) => wa.includes(w));
}

function mediaTypeOf(file: File): string {
  return file.type || TYPE_BY_EXTENSION[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  className = "",
  min,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "number" | "time";
  className?: string;
  min?: number;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        min={min}
        step={type === "number" ? 1 : undefined}
        inputMode={type === "number" ? "numeric" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`${inputClass} mt-1 ${error ? "border-missed-fg!" : ""}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-missed-fg">
          {error}
        </p>
      )}
    </div>
  );
}

export default function PrescriptionUploadPage() {
  const router = useRouter();
  const { activeProfile, addMedicines } = useAppState();

  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [patientOnRx, setPatientOnRx] = useState<string | null>(null);
  const [meds, setMeds] = useState<ReviewMed[]>([]);
  const [rawJson, setRawJson] = useState<unknown>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitAttempt, setSubmitAttempt] = useState(0);
  const [imported, setImported] = useState(false);

  const runId = useRef(0); // ignores the result of a read the user has already abandoned
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => () => clearTimeout(redirectTimer.current), []);

  useEffect(() => {
    if (submitAttempt > 0) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitAttempt]);

  const patientLabel = activeProfile ? `${activeProfile.name}'s` : "the patient's";

  function openReview(patient: string | null, parsed: ParsedMed[], raw: unknown, sample: boolean) {
    setIsSample(sample);
    setPatientOnRx(patient);
    setMeds(parsed.map(toReviewMed));
    setRawJson(raw);
    setShowErrors(false);
    setStage("review");
  }

  function handleReset() {
    runId.current++;
    clearTimeout(redirectTimer.current);
    setStage("idle");
    setFile(null);
    setFileError(null);
    setReadError(null);
    setIsSample(false);
    setMeds([]);
    setRawJson(null);
    setShowErrors(false);
    setImported(false);
  }

  function loadSample() {
    runId.current++;
    setFile(null);
    setFileError(null);
    setReadError(null);
    openReview(SAMPLE_JSON.patient, SAMPLE_MEDS, SAMPLE_JSON, true);
  }

  async function readPrescription(chosen: File) {
    const id = ++runId.current;
    setFile(chosen);
    setReadError(null);
    setStage("reading");

    const failWith = (message: string) => {
      setReadError(message);
      setStage("error");
    };

    try {
      const imageBase64 = await fileToBase64(chosen);
      const res = await fetch("/api/parse-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType: mediaTypeOf(chosen) }),
      });
      const data = await res.json().catch(() => null);
      if (id !== runId.current) return;

      if (!res.ok || !data || data.error) {
        failWith(data?.error || `The server answered with status ${res.status}. Please try again.`);
        return;
      }
      if (!Array.isArray(data.meds) || data.meds.length === 0) {
        failWith("No medicines were found in this photo. Try a clearer, well-lit photo of the whole prescription.");
        return;
      }
      openReview(data.patient || null, data.meds, { patient: data.patient ?? null, medications: data.medications ?? [] }, false);
    } catch {
      if (id === runId.current) failWith("The prescription reader could not be reached. Check your connection and try again.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    const problem = !ACCEPTED_TYPES.includes(mediaTypeOf(chosen))
      ? "Choose a JPG, PNG, WebP or HEIC photo."
      : chosen.size > MAX_BYTES
        ? "That photo is larger than 5 MB. Choose a smaller one."
        : null;
    setFileError(problem);
    if (problem) {
      e.target.value = ""; // lets the same file be chosen again after it is fixed
      return;
    }
    readPrescription(chosen);
  }

  const updateMed = (i: number, patch: Partial<ReviewMed>) =>
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const updateTime = (i: number, j: number, time: string) =>
    setMeds((prev) =>
      prev.map((m, idx) =>
        idx === i ? { ...m, reminderTimes: m.reminderTimes.map((rt, k) => (k === j ? { ...rt, time } : rt)) } : m
      )
    );

  const errors = meds.map(medErrors);
  const includedCount = meds.filter((m) => m.include).length;
  const hasErrors = meds.some((m, i) => m.include && errors[i].invalid);
  const nameMismatch = !!(activeProfile && patientOnRx && !namesMatch(patientOnRx, activeProfile.name));

  function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (imported || includedCount === 0) return;
    setShowErrors(true);
    if (hasErrors) {
      setSubmitAttempt((n) => n + 1);
      return;
    }

    addMedicines(
      meds
        .filter((m) => m.include)
        .map((m) => {
          const reminderTimes = m.reminderTimes.map((rt) => ({ id: generateUniqueId("rt"), timeSlot: rt.timeSlot, time: rt.time }));
          return {
            name: m.name.trim(),
            dosage: m.dosage.trim(),
            frequency: m.frequency,
            timeOfDay: reminderTimes.map((rt) => rt.timeSlot),
            exactTime: reminderTimes.map((rt) => rt.time).sort()[0],
            reminderTimes,
            duration: Number(m.duration),
            startDate: localDateString(),
            notes: m.notes.trim(),
            originalOcrData: m.originalOcrData,
          };
        })
    );
    setImported(true);
    redirectTimer.current = setTimeout(() => router.push("/dashboard"), 1200);
  }

  return (
    <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Scan prescription"
        title="Add medicines from a prescription photo"
        description={`Take or choose a clear photo. The AI reads it, then you check and edit every medicine before anything is added to ${patientLabel} schedule.`}
        actions={
          activeProfile &&
          stage !== "idle" && (
            <button type="button" onClick={handleReset} className={buttonClass("secondary")}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Start over
            </button>
          )
        }
      />

      {!activeProfile ? (
        <EmptyState
          icon={<Upload aria-hidden="true" className="size-6" />}
          title="Choose a patient first"
          description="Medicines are added to the selected patient's schedule, so pick a patient before scanning a prescription."
          action={
            <Link href="/patients" className={buttonClass("primary")}>
              Go to patients
            </Link>
          }
        />
      ) : stage === "idle" ? (
        <div className={cardClass}>
          {fileError && (
            <Notice tone="error" title="That photo can't be used" className="mb-4">
              {fileError}
            </Notice>
          )}
          <label htmlFor="rx-file" className={labelClass}>
            Prescription photo
          </label>
          <input
            id="rx-file"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleFileChange}
            aria-invalid={fileError ? true : undefined}
            aria-describedby="rx-file-hint"
            className={`${inputClass} mt-2 cursor-pointer file:mr-4 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-primary-fg hover:file:bg-primary-hover`}
          />
          <p id="rx-file-hint" className={hintClass}>
            JPG, PNG, WebP or HEIC, up to 5 MB.
          </p>

          <div className="mt-6 border-t border-border pt-6">
            <button type="button" onClick={loadSample} className={buttonClass("secondary")}>
              <FileText aria-hidden="true" className="size-5" />
              No photo handy? Try a sample prescription
            </button>
            <p className={hintClass}>The sample is demo data for Mr. Ramesh. It is not read from a photo.</p>
            <details className="mt-3">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary-text">What the sample says</summary>
              <pre className="mt-1 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface-muted p-4 text-sm text-fg">
                {SAMPLE_PRESCRIPTION_TEXT}
              </pre>
            </details>
          </div>
        </div>
      ) : stage === "reading" ? (
        <div className={cardClass}>
          <Loading label="Reading the prescription… This usually takes a few seconds." />
        </div>
      ) : stage === "error" ? (
        <Notice
          tone="error"
          title="We couldn't read this prescription"
          action={
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => file && readPrescription(file)} className={buttonClass("primary")}>
                Try again
              </button>
              <button type="button" onClick={handleReset} className={buttonClass("secondary")}>
                Choose a different photo
              </button>
              <button type="button" onClick={loadSample} className={buttonClass("secondary")}>
                Use the sample prescription instead
              </button>
            </div>
          }
        >
          {readError}
        </Notice>
      ) : imported ? (
        <Notice
          tone="success"
          title={`Added to ${patientLabel} schedule.`}
          action={
            <Link href="/dashboard" className={buttonClass("secondary")}>
              Go to the dashboard
            </Link>
          }
        >
          Taking you to the dashboard…
        </Notice>
      ) : (
        <form ref={formRef} onSubmit={handleImport} noValidate className="space-y-6">
          {isSample && (
            <Notice tone="info">Sample prescription — this is demo data, not read from your photo.</Notice>
          )}

          <div className="space-y-3">
            <p className="text-base">
              {patientOnRx ? (
                <>
                  Name on prescription: <span className="font-semibold">{patientOnRx}</span>
                </>
              ) : (
                "No patient name found on the prescription."
              )}
            </p>
            {nameMismatch && (
              <Notice tone="warning">
                The name on the prescription ({patientOnRx}) doesn't match the selected patient ({activeProfile.name}). Check you
                have the right patient before adding.
              </Notice>
            )}
          </div>

          <section aria-labelledby="review-heading" className="space-y-4">
            <div>
              <h2 id="review-heading" className="text-xl font-bold">
                Check each medicine
              </h2>
              <p className="text-base text-fg-muted">Fix anything the AI got wrong. Untick a medicine to leave it out.</p>
            </div>

            <ul className="space-y-4">
              {meds.map((m, i) => {
                const err = showErrors && m.include ? errors[i] : null;
                return (
                  <li key={i} className={cardClass}>
                    <label htmlFor={`med-${i}-include`} className="flex min-h-11 cursor-pointer items-center gap-3 text-lg font-semibold">
                      <input
                        id={`med-${i}-include`}
                        type="checkbox"
                        checked={m.include}
                        onChange={(e) => updateMed(i, { include: e.target.checked })}
                        className="size-6 shrink-0 accent-primary"
                      />
                      <span>Add {m.name.trim() || "this medicine"}</span>
                    </label>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <Field id={`med-${i}-name`} label="Medicine name" value={m.name} onChange={(v) => updateMed(i, { name: v })} error={err?.name} />
                      <Field id={`med-${i}-dosage`} label="Dosage" value={m.dosage} onChange={(v) => updateMed(i, { dosage: v })} error={err?.dosage} />
                      <Field
                        id={`med-${i}-duration`}
                        label="Duration (days)"
                        type="number"
                        min={1}
                        value={m.duration}
                        onChange={(v) => updateMed(i, { duration: v })}
                        error={err?.duration}
                      />
                      <Field id={`med-${i}-notes`} label="Notes" value={m.notes} onChange={(v) => updateMed(i, { notes: v })} />
                      {m.reminderTimes.map((rt, j) => (
                        <Field
                          key={rt.timeSlot}
                          id={`med-${i}-time-${j}`}
                          label={`${SLOT_LABEL[rt.timeSlot]} time`}
                          type="time"
                          value={rt.time}
                          onChange={(v) => updateTime(i, j, v)}
                          error={err?.times[j]}
                        />
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <details>
            <summary className="min-h-11 cursor-pointer py-2 font-semibold text-primary-text">Show the data the AI extracted</summary>
            <pre tabIndex={0} className="mt-1 max-h-80 overflow-auto rounded-lg bg-surface-muted p-4 text-sm text-fg">
              {JSON.stringify(rawJson, null, 2)}
            </pre>
          </details>

          {showErrors && hasErrors && (
            <Notice tone="error" title="Some medicines need fixing">
              Check the highlighted fields, then try again.
            </Notice>
          )}

          <button type="submit" disabled={includedCount === 0} className={`${buttonClass("primary", "lg")} w-full text-center sm:w-auto`}>
            Add {includedCount} medicine{includedCount === 1 ? "" : "s"} to {patientLabel} schedule
          </button>
        </form>
      )}
    </div>
  );
}

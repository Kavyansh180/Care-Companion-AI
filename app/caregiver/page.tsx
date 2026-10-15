"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { useAppState } from "@/context/AppContext";
import { SUPPORTED_LANGUAGES } from "@/components/ReminderEngine";
import { localDateString, formatDisplayDate } from "@/lib/dates";
import { formatTime12h } from "@/lib/format";
import { summarizeDoses, adherenceRate, type DoseStatus } from "@/lib/adherence";
import {
  buttonClass,
  iconButtonClass,
  cardClass,
  inputClass,
  labelClass,
  hintClass,
} from "@/components/ui/styles";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import Dialog from "@/components/ui/Dialog";
import EmptyState from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import StatusBadge from "@/components/ui/StatusBadge";
import CohortRiskPanel, { COHORT_RISK_HEADING_ID } from "@/components/caregiver/CohortRiskPanel";

interface TimelineEvent {
  id: string;
  medicineName: string;
  dosage: string;
  time: string;
  status: DoseStatus;
  timestamp?: string;
}

const severityTone = {
  mild: "bg-surface-muted text-fg border-border-strong",
  moderate: "bg-pending-bg text-pending-fg border-pending-border",
  severe: "bg-missed-bg text-missed-fg border-missed-border",
} as const;

const severityLabel = { mild: "Mild", moderate: "Moderate", severe: "Severe" } as const;

function NotSet() {
  return <span className="text-fg-muted italic">Not set</span>;
}

export default function CaregiverDashboard() {
  const {
    activeProfile,
    medicines,
    trackingLogs,
    symptomLogs,
    caregiverAlerts,
    clearAlertsForPatient,
    updateProfile,
    addSymptomLog,
    deleteSymptomLog,
  } = useAppState();

  const [currentDate] = useState(() => localDateString());
  const [mounted, setMounted] = useState(false);

  // Care plan form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editDoctorName, setEditDoctorName] = useState("");
  const [editClinicName, setEditClinicName] = useState("");
  const [editFollowUpDate, setEditFollowUpDate] = useState("");
  const [editCaregiverName, setEditCaregiverName] = useState("");
  const [editLanguage, setEditLanguage] = useState("English");
  const [editRemarks, setEditRemarks] = useState("");
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Notes form state
  const [symptomNote, setSymptomNote] = useState("");
  const [symptomSeverity, setSymptomSeverity] = useState<"mild" | "moderate" | "severe">("mild");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Runs after the Dialog's own effect has opened it, so focus really lands on the first field.
  useEffect(() => {
    if (isEditModalOpen) firstFieldRef.current?.focus();
  }, [isEditModalOpen]);

  useEffect(() => {
    if (!saveSuccessMessage) return;
    const timer = setTimeout(() => setSaveSuccessMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [saveSuccessMessage]);

  const openEditModal = () => {
    if (!activeProfile) return;
    setEditTitle(activeProfile.condition || "");
    setEditInstructions(activeProfile.precautions || "");
    setEditDoctorName(activeProfile.doctorName || "");
    setEditClinicName(activeProfile.clinicName || "");
    setEditFollowUpDate(activeProfile.followUpDate || "");
    setEditCaregiverName(activeProfile.caregiverName || "");
    setEditLanguage(activeProfile.language || "English");
    setEditRemarks(activeProfile.caregiverRemarks || "");
    setIsEditModalOpen(true);
  };

  const handleSaveCarePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    updateProfile(activeProfile.id, {
      condition: editTitle.trim(),
      precautions: editInstructions.trim(),
      doctorName: editDoctorName.trim(),
      clinicName: editClinicName.trim(),
      followUpDate: editFollowUpDate,
      caregiverName: editCaregiverName.trim(),
      language: editLanguage,
      caregiverRemarks: editRemarks.trim(),
    });
    setIsEditModalOpen(false);
    setSaveSuccessMessage("Care plan saved.");
  };

  const handleLogSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomNote.trim()) return;
    addSymptomLog({
      date: localDateString(),
      severity: symptomSeverity,
      notes: symptomNote.trim(),
    });
    setSymptomNote("");
  };

  if (!mounted) return <Loading label="Loading caregiver view…" />;

  if (!activeProfile) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <EmptyState
          title="No patient selected"
          description="Choose a patient to see their medicines, notes and care plan."
          action={
            <Link href="/patients" className={buttonClass("primary", "md")}>
              Choose a patient
            </Link>
          }
        />
      </div>
    );
  }

  const todayLogs = trackingLogs.filter((log) => log.date === currentDate);

  const timelineEvents: TimelineEvent[] = [];
  medicines.forEach((med) => {
    if (!med.active) return;
    med.reminderTimes.forEach((rt) => {
      const log = todayLogs.find((l) => l.medicineId === med.id && l.timeSlot === rt.timeSlot);
      timelineEvents.push({
        id: `${med.id}-${rt.timeSlot}`,
        medicineName: med.name,
        dosage: med.dosage,
        time: rt.time,
        status: log ? log.status : "pending",
        timestamp: log?.status === "taken" ? log.timestamp : undefined,
      });
    });
  });
  timelineEvents.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const summary = summarizeDoses(timelineEvents);
  const rate = adherenceRate(summary);
  const missedDoses = timelineEvents.filter((e) => e.status === "missed");
  const patientAlerts = caregiverAlerts.filter((a) => a.patientId === activeProfile.id);
  const languageOptions: string[] = [...SUPPORTED_LANGUAGES];
  if (editLanguage && !languageOptions.includes(editLanguage)) languageOptions.push(editLanguage);

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={formatDisplayDate(currentDate)}
        title="Caregiver view"
        description={`${activeProfile.name}, ${activeProfile.age} · ${activeProfile.condition} · Caregiver: ${activeProfile.caregiverName}`}
        actions={
          <>
            <Link href="/dashboard" className={buttonClass("secondary", "md")}>
              Today&apos;s medicines
            </Link>
            <Link href="/upload" className={buttonClass("secondary", "md")}>
              Scan prescription
            </Link>
            <Link href="/patients" className={buttonClass("secondary", "md")}>
              Switch patient
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          {(patientAlerts.length > 0 || missedDoses.length > 0) && (
            <Notice
              tone="error"
              title="Needs attention"
              action={
                patientAlerts.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => clearAlertsForPatient(activeProfile.id)}
                    className={buttonClass("secondary", "sm")}
                  >
                    Dismiss reminder alerts
                  </button>
                ) : undefined
              }
            >
              <ul className="mt-1 space-y-2">
                {patientAlerts.map((alert) => (
                  <li key={alert.id}>
                    <span className="font-semibold">{alert.message}</span>
                    <span className="block text-sm">
                      {formatDisplayDate(alert.date, { day: "numeric", month: "short", year: "numeric" })} at{" "}
                      {formatTime12h(alert.timestamp)}
                    </span>
                  </li>
                ))}
                {missedDoses.map((dose) => (
                  <li key={`missed-${dose.id}`}>
                    <span className="font-semibold">
                      Missed: {dose.medicineName} {dose.dosage}
                    </span>
                    <span className="block text-sm">Scheduled for {formatTime12h(dose.time)} today</span>
                  </li>
                ))}
              </ul>
              {missedDoses.length > 0 && (
                <p className="mt-3 text-sm">Missed doses can be corrected on the Today page.</p>
              )}
            </Notice>
          )}

          <section aria-labelledby="summary-heading" className={cardClass}>
            <h2 id="summary-heading" className="text-xl font-semibold text-fg">
              Today&apos;s summary
            </h2>

            {rate === null ? (
              <p className="mt-4 text-base text-fg-muted">No doses recorded yet today.</p>
            ) : (
              <div className="mt-4">
                <p className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-5xl font-bold text-fg">{Math.round(rate)}%</span>
                  <span className="text-base text-fg-muted">of recorded doses taken</span>
                </p>
                <p className="mt-2 text-base text-fg">
                  {summary.taken} of {summary.known} doses with a recorded outcome were taken.
                </p>
              </div>
            )}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(
                [
                  ["taken", summary.taken],
                  ["pending", summary.pending],
                  ["missed", summary.missed],
                ] as const
              ).map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 sm:flex-col sm:items-start"
                >
                  <StatusBadge status={status} />
                  <span className="text-3xl font-bold text-fg">{count}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-fg-muted">Pending doses are not counted until they are taken or missed.</p>
          </section>

          <section aria-labelledby="timeline-heading" className={cardClass}>
            <h2 id="timeline-heading" className="text-xl font-semibold text-fg">
              Today&apos;s timeline
            </h2>

            {timelineEvents.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No medicines scheduled today"
                  action={
                    <Link href="/add-medicine" className={buttonClass("primary", "md")}>
                      Add a medicine
                    </Link>
                  }
                />
              </div>
            ) : (
              <ol className="mt-4 divide-y divide-border">
                {timelineEvents.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <p className="text-base font-semibold text-fg sm:w-24 sm:shrink-0">
                      {formatTime12h(item.time)}
                    </p>
                    <div className="min-w-0 flex-1">
                      <p className="text-base text-fg">
                        <span className="font-semibold">{item.medicineName}</span> · {item.dosage}
                      </p>
                      <p className="text-sm text-fg-muted">
                        {item.status === "taken"
                          ? item.timestamp
                            ? `Taken at ${formatTime12h(item.timestamp.split(" ")[1] ?? "")}`
                            : "Taken"
                          : item.status === "missed"
                            ? "Not taken"
                            : "Not recorded yet"}
                      </p>
                    </div>
                    <div>
                      <StatusBadge status={item.status} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section aria-labelledby="notes-heading" className={cardClass}>
            <h2 id="notes-heading" className="text-xl font-semibold text-fg">
              Notes and symptoms
            </h2>

            <form onSubmit={handleLogSymptom} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label htmlFor="sym-note" className={labelClass}>
                    What did you notice?
                  </label>
                  <input
                    type="text"
                    id="sym-note"
                    value={symptomNote}
                    onChange={(e) => setSymptomNote(e.target.value)}
                    aria-describedby="sym-note-hint"
                    className={`${inputClass} mt-1`}
                    required
                  />
                  <p id="sym-note-hint" className={hintClass}>
                    For example: Tired after lunch, BP 128/82
                  </p>
                </div>
                <div>
                  <label htmlFor="sym-sev" className={labelClass}>
                    Severity
                  </label>
                  <select
                    id="sym-sev"
                    value={symptomSeverity}
                    onChange={(e) => setSymptomSeverity(e.target.value as "mild" | "moderate" | "severe")}
                    className={`${inputClass} mt-1`}
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>
              <button type="submit" className={buttonClass("primary", "md")}>
                Add note
              </button>
            </form>

            {symptomLogs.length === 0 ? (
              <p className="mt-6 text-base text-fg-muted">No notes yet.</p>
            ) : (
              <ul className="mt-6 divide-y divide-border border-t border-border">
                {symptomLogs.map((log) => {
                  const when = formatDisplayDate(log.date, { day: "numeric", month: "short", year: "numeric" });
                  return (
                    <li key={log.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-sm font-semibold ${severityTone[log.severity]}`}
                          >
                            {severityLabel[log.severity]}
                          </span>
                          <span className="text-sm text-fg-muted">{when}</span>
                        </div>
                        <p className="mt-1 text-base text-fg break-words">{log.notes}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteSymptomLog(log.id)}
                        aria-label={`Delete note from ${when}`}
                        className={`${iconButtonClass()} shrink-0`}
                      >
                        <Trash2 aria-hidden="true" className="size-5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby={COHORT_RISK_HEADING_ID} className={cardClass}>
            <CohortRiskPanel />
          </section>
        </div>

        <aside className="lg:col-span-4">
          <section aria-labelledby="plan-heading" className={cardClass}>
            <h2 id="plan-heading" className="text-xl font-semibold text-fg">
              Care plan
            </h2>

            {saveSuccessMessage && <Notice tone="success" className="mt-4">{saveSuccessMessage}</Notice>}

            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-sm text-fg-muted">Condition</dt>
                <dd className="text-base text-fg">{activeProfile.condition || <NotSet />}</dd>
              </div>
              <div>
                <dt className="text-sm text-fg-muted">Precautions</dt>
                <dd className="whitespace-pre-line text-base text-fg">{activeProfile.precautions || <NotSet />}</dd>
              </div>
              <div>
                <dt className="text-sm text-fg-muted">Doctor</dt>
                <dd className="text-base text-fg">{activeProfile.doctorName || <NotSet />}</dd>
              </div>
              <div>
                <dt className="text-sm text-fg-muted">Clinic</dt>
                <dd className="text-base text-fg">{activeProfile.clinicName || <NotSet />}</dd>
              </div>
              <div>
                <dt className="text-sm text-fg-muted">Follow-up date</dt>
                <dd className="text-base text-fg">
                  {activeProfile.followUpDate ? formatDisplayDate(activeProfile.followUpDate) : <NotSet />}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-fg-muted">Reminder language</dt>
                <dd className="text-base text-fg">{activeProfile.language || <NotSet />}</dd>
              </div>
              <div>
                <dt className="text-sm text-fg-muted">Caregiver</dt>
                <dd className="text-base text-fg">{activeProfile.caregiverName || <NotSet />}</dd>
              </div>
              <div>
                <dt className="text-sm text-fg-muted">Caregiver remarks</dt>
                <dd className="whitespace-pre-line text-base text-fg">
                  {activeProfile.caregiverRemarks || <NotSet />}
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={openEditModal}
              className={`${buttonClass("secondary", "md")} mt-6 w-full`}
            >
              Edit care plan
            </button>
          </section>
        </aside>
      </div>

      <Dialog
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit care plan"
        description={`For ${activeProfile.name}`}
      >
        <form onSubmit={handleSaveCarePlan} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="modal-title" className={labelClass}>
                Condition
              </label>
              <input
                ref={firstFieldRef}
                type="text"
                id="modal-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className={`${inputClass} mt-1`}
                autoFocus
                required
              />
            </div>
            <div>
              <label htmlFor="modal-cgname" className={labelClass}>
                Caregiver name
              </label>
              <input
                type="text"
                id="modal-cgname"
                value={editCaregiverName}
                onChange={(e) => setEditCaregiverName(e.target.value)}
                className={`${inputClass} mt-1`}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="modal-notes" className={labelClass}>
              Precautions <span className="font-normal text-fg-muted">(optional)</span>
            </label>
            <textarea
              id="modal-notes"
              rows={3}
              value={editInstructions}
              onChange={(e) => setEditInstructions(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="modal-doc" className={labelClass}>
                Doctor <span className="font-normal text-fg-muted">(optional)</span>
              </label>
              <input
                type="text"
                id="modal-doc"
                value={editDoctorName}
                onChange={(e) => setEditDoctorName(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label htmlFor="modal-clinic" className={labelClass}>
                Clinic <span className="font-normal text-fg-muted">(optional)</span>
              </label>
              <input
                type="text"
                id="modal-clinic"
                value={editClinicName}
                onChange={(e) => setEditClinicName(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="modal-fdate" className={labelClass}>
                Follow-up date <span className="font-normal text-fg-muted">(optional)</span>
              </label>
              <input
                type="date"
                id="modal-fdate"
                value={editFollowUpDate}
                onChange={(e) => setEditFollowUpDate(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label htmlFor="modal-lang" className={labelClass}>
                Reminder language
              </label>
              <select
                id="modal-lang"
                value={editLanguage}
                onChange={(e) => setEditLanguage(e.target.value)}
                className={`${inputClass} mt-1`}
              >
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="modal-rem" className={labelClass}>
              Caregiver remarks <span className="font-normal text-fg-muted">(optional)</span>
            </label>
            <textarea
              id="modal-rem"
              rows={2}
              value={editRemarks}
              onChange={(e) => setEditRemarks(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className={buttonClass("secondary", "md")}
            >
              Cancel
            </button>
            <button type="submit" className={buttonClass("primary", "md")}>
              Save care plan
            </button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

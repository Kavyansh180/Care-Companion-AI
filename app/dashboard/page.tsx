"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Check, Pencil, Pill, Plus, RotateCcw, ScanLine, Trash2, Volume2, X } from "lucide-react";
import { useAppState } from "@/context/AppContext";
import { getLocalizedReminder, speakTextWithVoice } from "@/components/ReminderEngine";
import { formatTime12h } from "@/lib/format";
import { formatDisplayDate, localDateString } from "@/lib/dates";
import { adherenceRate, summarizeDoses } from "@/lib/adherence";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";
import Notice from "@/components/ui/Notice";
import StatusBadge from "@/components/ui/StatusBadge";
import { buttonClass, cardClass, iconButtonClass } from "@/components/ui/styles";

const timeSlots = [
  { id: "morning", name: "Morning", timeRange: "6:00 AM to 11:59 AM" },
  { id: "afternoon", name: "Afternoon", timeRange: "12:00 PM to 4:59 PM" },
  { id: "evening", name: "Evening", timeRange: "5:00 PM to 7:59 PM" },
  { id: "night", name: "Night", timeRange: "8:00 PM to 11:59 PM" },
];

const statusBorder = {
  taken: "border-l-taken-border",
  pending: "border-l-pending-border",
  missed: "border-l-missed-border",
} as const;

interface ScheduledDose {
  reminderTimeId: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  notes: string;
  timeSlot: string;
  exactTime: string;
  status: "taken" | "missed" | "pending";
  timestamp?: string;
}

export default function PatientDashboard() {
  const {
    activeProfile,
    medicines,
    trackingLogs,
    markAsTaken,
    markAsMissed,
    resetLogStatus,
    deleteMedicine,
  } = useAppState();

  const [currentDate] = useState(() => localDateString());
  const [mounted, setMounted] = useState(false);
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <Loading label="Loading today's medicines…" />;
  }

  if (!activeProfile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          icon={<Pill aria-hidden="true" className="size-6" />}
          title="No patient selected"
          description="Choose a patient, or add a new one, to see today's medicines."
          action={
            <Link href="/patients" className={buttonClass("primary", "md")}>
              Go to patients
            </Link>
          }
        />
      </div>
    );
  }

  const todayLogs = trackingLogs.filter((log) => log.date === currentDate);

  const todayDoses: ScheduledDose[] = [];
  medicines.forEach((med) => {
    if (!med.active) return;

    med.reminderTimes.forEach((rt) => {
      const log = todayLogs.find((l) => l.medicineId === med.id && l.timeSlot === rt.timeSlot);

      todayDoses.push({
        reminderTimeId: rt.id,
        medicineId: med.id,
        medicineName: med.name,
        dosage: med.dosage,
        notes: med.notes,
        timeSlot: rt.timeSlot,
        exactTime: rt.time,
        status: log ? log.status : "pending",
        timestamp: log?.timestamp,
      });
    });
  });

  const summary = summarizeDoses(todayDoses);
  const rate = adherenceRate(summary);

  const playVoiceReminder = (dose: ScheduledDose) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeechMessage("This browser cannot read reminders aloud. Please try a different browser.");
      return;
    }
    setSpeechMessage(null);
    const { langCode, speechText } = getLocalizedReminder(
      activeProfile.language,
      activeProfile.name,
      dose.medicineName,
      dose.dosage,
      dose.timeSlot
    );
    speakTextWithVoice(speechText, langCode, activeProfile.language);
  };

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 sm:px-6">
      <PageHeader
        eyebrow={formatDisplayDate(currentDate)}
        title="Today's medicines"
        description={`For ${activeProfile.name}`}
        actions={
          <>
            <Link href="/upload" className={buttonClass("secondary", "md")}>
              <ScanLine aria-hidden="true" className="size-5" />
              Scan prescription
            </Link>
            <Link href="/add-medicine" className={buttonClass("secondary", "md")}>
              <Plus aria-hidden="true" className="size-5" />
              Add medicine
            </Link>
          </>
        }
      />

      {speechMessage && <Notice tone="warning">{speechMessage}</Notice>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary */}
        <section aria-labelledby="summary-heading" className={`${cardClass} space-y-5 lg:col-span-2`}>
          <h2 id="summary-heading" className="text-lg font-semibold">
            How today is going
          </h2>

          {rate === null ? (
            <p className="text-base">No doses recorded yet today.</p>
          ) : (
            <div>
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-4xl font-bold">{Math.round(rate)}%</span>
                <span className="text-base text-fg-muted">of recorded doses taken</span>
              </p>
              <p className="mt-1 text-base">
                {summary.taken} of {summary.known} doses with a recorded outcome were taken.
              </p>
            </div>
          )}

          <ul className="grid grid-cols-3 gap-3">
            {(
              [
                ["taken", summary.taken],
                ["pending", summary.pending],
                ["missed", summary.missed],
              ] as const
            ).map(([status, count]) => (
              <li
                key={status}
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-surface-muted p-3"
              >
                <StatusBadge status={status} />
                <span className="text-2xl font-bold">{count}</span>
              </li>
            ))}
          </ul>

          <p className="text-sm text-fg-muted">
            Pending doses are not counted until they are taken or missed.
          </p>
        </section>

        {/* Patient */}
        <section aria-labelledby="patient-heading" className={`${cardClass} space-y-3`}>
          <h2 id="patient-heading" className="text-lg font-semibold">
            {activeProfile.name}
          </h2>
          <div className="space-y-1 text-base">
            <p className="text-fg-muted">
              {activeProfile.gender} • {activeProfile.age} years old
            </p>
            <p>Condition: {activeProfile.condition}</p>
            <p>Caregiver: {activeProfile.caregiverName}</p>
          </div>
          <Link href="/patients" className={buttonClass("ghost", "md")}>
            Change patient
          </Link>
        </section>
      </div>

      {todayDoses.length === 0 ? (
        <EmptyState
          icon={<Pill aria-hidden="true" className="size-6" />}
          title="No medicines scheduled yet"
          description="Add a medicine yourself, or scan a prescription to fill in today's schedule."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/add-medicine" className={buttonClass("primary", "md")}>
                <Plus aria-hidden="true" className="size-5" />
                Add medicine
              </Link>
              <Link href="/upload" className={buttonClass("secondary", "md")}>
                <ScanLine aria-hidden="true" className="size-5" />
                Scan prescription
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-8">
          {timeSlots.map((slot) => {
            const slotDoses = todayDoses
              .filter((d) => d.timeSlot === slot.id)
              .sort((a, b) => a.exactTime.localeCompare(b.exactTime));
            if (slotDoses.length === 0) return null;

            return (
              <section key={slot.id} aria-labelledby={`slot-${slot.id}`} className="space-y-3">
                <h2 id={`slot-${slot.id}`} className="flex flex-wrap items-baseline gap-x-3 text-xl font-semibold">
                  {slot.name}
                  <span className="text-base font-normal text-fg-muted">{slot.timeRange}</span>
                </h2>

                <ul className="space-y-3">
                  {slotDoses.map((dose) => {
                    const takenAt = dose.timestamp ? formatTime12h(dose.timestamp.split(" ")[1] ?? "") : "";
                    return (
                      <li
                        key={dose.reminderTimeId}
                        className={`space-y-4 rounded-xl border border-l-4 border-border bg-surface p-4 ${statusBorder[dose.status]}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <p className="text-xl font-bold">{formatTime12h(dose.exactTime)}</p>
                            <h3 className="text-lg font-semibold">{dose.medicineName}</h3>
                            <p className="text-base text-fg-muted">{dose.dosage}</p>
                            {dose.notes && <p className="text-base">{dose.notes}</p>}
                            {takenAt && <p className="text-sm text-fg-muted">Taken at {takenAt}</p>}
                          </div>
                          <StatusBadge status={dose.status} />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {dose.status === "pending" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => markAsTaken(dose.medicineId, currentDate, dose.timeSlot)}
                                aria-label={`Mark as taken: ${dose.medicineName}`}
                                className={buttonClass("primary", "md")}
                              >
                                <Check aria-hidden="true" className="size-5" />
                                Mark as taken
                              </button>
                              <button
                                type="button"
                                onClick={() => markAsMissed(dose.medicineId, currentDate, dose.timeSlot)}
                                aria-label={`Mark as missed: ${dose.medicineName}`}
                                className={buttonClass("secondary", "md")}
                              >
                                <X aria-hidden="true" className="size-5" />
                                Mark as missed
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => resetLogStatus(dose.medicineId, currentDate, dose.timeSlot)}
                              aria-label={`Undo: ${dose.medicineName}`}
                              className={buttonClass("ghost", "md")}
                            >
                              <RotateCcw aria-hidden="true" className="size-5" />
                              Undo
                            </button>
                          )}

                          <span className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => playVoiceReminder(dose)}
                              aria-label={`Play voice reminder for ${dose.medicineName}`}
                              className={iconButtonClass()}
                            >
                              <Volume2 aria-hidden="true" className="size-5" />
                            </button>
                            <Link
                              href={`/add-medicine?id=${dose.medicineId}`}
                              aria-label={`Edit ${dose.medicineName}`}
                              className={iconButtonClass()}
                            >
                              <Pencil aria-hidden="true" className="size-5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remove ${dose.medicineName} from the schedule?`)) {
                                  deleteMedicine(dose.medicineId);
                                }
                              }}
                              aria-label={`Delete ${dose.medicineName}`}
                              className={iconButtonClass()}
                            >
                              <Trash2 aria-hidden="true" className="size-5" />
                            </button>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

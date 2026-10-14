"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useAppState, ReminderTime, generateUniqueId } from "@/context/AppContext";
import { formatTime12h } from "@/lib/format";
import { localDateString } from "@/lib/dates";
import { buttonClass, iconButtonClass, cardClass, inputClass, labelClass, hintClass } from "@/components/ui/styles";
import PageHeader from "@/components/ui/PageHeader";
import Notice from "@/components/ui/Notice";
import EmptyState from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";

type Slot = ReminderTime["timeSlot"];

// Default times for helper
const defaultTimes: Record<Slot, string> = {
  morning: "08:00",
  afternoon: "13:00",
  evening: "17:00",
  night: "20:30",
};

const slotNames: Record<Slot, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

type FormErrors = { name?: string; dosage?: string; duration?: string; times?: string; slot?: string; time?: string };

type ControlProps = { id: string; "aria-invalid": boolean; "aria-describedby"?: string };

const controlClass = `${inputClass} aria-invalid:border-missed-fg`;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm text-missed-fg">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

// Label + control + error + hint, with the aria wiring done once.
function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (control: ControlProps) => React.ReactNode;
}) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="mt-1.5">{children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}</div>
      <FieldError id={`${id}-error`} message={error} />
      {hint && (
        <p id={`${id}-hint`} className={hintClass}>
          {hint}
        </p>
      )}
    </div>
  );
}

function AddMedicineForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id") || searchParams.get("edit");

  const { activeProfile, addMedicine, updateMedicine, allMedicines } = useAppState();
  const medicineToEdit = allMedicines.find((m) => m.id === editId);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form states
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Daily");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  // Id of the field to focus once its error message has rendered.
  const focusAfterErrors = useRef<string | null>(null);

  // Reminder scheduling list state
  const [reminderTimesList, setReminderTimesList] = useState<ReminderTime[]>([]);
  const [slotInput, setSlotInput] = useState<Slot>("morning");
  const [timeInput, setTimeInput] = useState("08:00");
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

  // Populate form if in edit mode
  useEffect(() => {
    if (medicineToEdit) {
      setName(medicineToEdit.name);
      setDosage(medicineToEdit.dosage);
      setFrequency(medicineToEdit.frequency);
      setDuration(String(medicineToEdit.duration));
      setNotes(medicineToEdit.notes);
      if (medicineToEdit.reminderTimes && medicineToEdit.reminderTimes.length > 0) {
        setReminderTimesList(medicineToEdit.reminderTimes);
      } else {
        // Fallback migration for older entries
        const mapped = medicineToEdit.timeOfDay.map((slot) => ({
          id: generateUniqueId("rt"),
          timeSlot: slot as Slot,
          time: medicineToEdit.exactTime || defaultTimes[slot as Slot] || "08:00",
        }));
        setReminderTimesList(mapped);
      }
    } else {
      // Default initial schedule for new medicines
      setReminderTimesList([{ id: generateUniqueId("rt"), timeSlot: "morning", time: "08:00" }]);
    }
  }, [medicineToEdit]);

  // Move focus to the first invalid field after the error messages are on screen.
  useEffect(() => {
    if (focusAfterErrors.current) {
      document.getElementById(focusAfterErrors.current)?.focus();
      focusAfterErrors.current = null;
    }
  }, [errors]);

  if (!mounted) {
    return <Loading label="Loading form…" />;
  }

  if (!activeProfile) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <EmptyState
          icon={<UserRound aria-hidden="true" className="size-6" />}
          title="Choose a patient first"
          description="Pick whose medicine you are adding, or add a new person."
          action={
            <Link href="/patients" className={buttonClass("primary")}>
              Go to patients
            </Link>
          }
        />
      </div>
    );
  }

  const clearError = (key: keyof FormErrors) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  // Adjust time input automatically when the time-of-day changes
  const handleSlotChange = (slot: Slot) => {
    setSlotInput(slot);
    setTimeInput(defaultTimes[slot]);
    clearError("slot");
  };

  // Add / Update reminder time list
  const handleSaveReminderTime = () => {
    if (!timeInput) {
      focusAfterErrors.current = "med-time";
      setErrors((prev) => ({ ...prev, time: "Choose a time before adding it." }));
      return;
    }
    // Only one reminder per time of day (the one being edited does not count)
    if (reminderTimesList.some((r) => r.timeSlot === slotInput && r.id !== editingReminderId)) {
      focusAfterErrors.current = "med-slot";
      setErrors((prev) => ({
        ...prev,
        slot: `A ${slotInput} reminder is already added. Edit or remove it instead.`,
      }));
      return;
    }

    if (editingReminderId) {
      setReminderTimesList((prev) =>
        prev.map((item) => (item.id === editingReminderId ? { ...item, timeSlot: slotInput, time: timeInput } : item)),
      );
      setEditingReminderId(null);
    } else {
      const newItem: ReminderTime = { id: generateUniqueId("rt"), timeSlot: slotInput, time: timeInput };
      setReminderTimesList((prev) => [...prev, newItem]);
    }
    setErrors((prev) => ({ ...prev, slot: undefined, time: undefined, times: undefined }));
  };

  const handleEditReminderTime = (item: ReminderTime) => {
    setSlotInput(item.timeSlot);
    setTimeInput(item.time);
    setEditingReminderId(item.id);
    clearError("slot");
  };

  const handleDeleteReminderTime = (id: string) => {
    setReminderTimesList((prev) => prev.filter((r) => r.id !== id));
    if (editingReminderId === id) {
      setEditingReminderId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const durationNum = parseInt(duration, 10);
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Enter the medicine name.";
    if (!dosage.trim()) next.dosage = "Enter the dose, for example 5 mg or 1 tablet.";
    if (isNaN(durationNum) || durationNum <= 0) next.duration = "Enter the number of days, for example 30.";
    if (reminderTimesList.length === 0) next.times = "Add at least one reminder time.";

    if (Object.keys(next).length > 0) {
      focusAfterErrors.current = next.name
        ? "med-name"
        : next.dosage
          ? "med-dosage"
          : next.duration
            ? "med-duration"
            : "med-slot";
      setErrors(next);
      return;
    }
    setErrors({});

    // Format legacy structures for backward compatibility
    const timeOfDay = Array.from(new Set(reminderTimesList.map((r) => r.timeSlot)));
    const sortedList = [...reminderTimesList].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const exactTime = sortedList.length > 0 ? sortedList[0].time : "08:00";

    const medData = {
      name: name.trim(),
      dosage: dosage.trim(),
      frequency,
      timeOfDay,
      exactTime,
      reminderTimes: reminderTimesList,
      duration: durationNum,
      notes: notes.trim(),
    };

    if (medicineToEdit) {
      updateMedicine(medicineToEdit.id, medData);
    } else {
      addMedicine({
        ...medData,
        startDate: localDateString(),
      });
    }

    setIsSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  const sortedTimes = [...reminderTimesList].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link href="/dashboard" className={buttonClass("ghost")}>
          <ArrowLeft aria-hidden="true" className="size-5" />
          Back to today&apos;s medicines
        </Link>
      </div>

      <PageHeader
        eyebrow={`Patient: ${activeProfile.name}`}
        title={medicineToEdit ? `Edit ${medicineToEdit.name}` : "Add a medicine"}
        description="Set the dose and the times reminders should play."
      />

      <form onSubmit={handleSubmit} noValidate className={`${cardClass} space-y-6`}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field id="med-name" label="Medicine name" hint="Brand or generic name, as on the box." error={errors.name}>
            {(control) => (
              <input
                {...control}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                placeholder="For example, Amlodipine"
                className={controlClass}
                required
              />
            )}
          </Field>

          <Field id="med-dosage" label="Dose" hint="For example 5 mg, 1 tablet, 10 ml." error={errors.dosage}>
            {(control) => (
              <input
                {...control}
                type="text"
                value={dosage}
                onChange={(e) => {
                  setDosage(e.target.value);
                  clearError("dosage");
                }}
                placeholder="For example, 5 mg"
                className={controlClass}
                required
              />
            )}
          </Field>

          <Field id="med-frequency" label="Frequency" hint="How often this medicine is taken.">
            {(control) => (
              <select
                {...control}
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className={controlClass}
              >
                <option value="Daily">Daily</option>
                <option value="Twice Daily">Twice Daily</option>
                <option value="Three Times Daily">Three Times Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="As Needed (PRN)">As Needed (PRN)</option>
              </select>
            )}
          </Field>

          <Field id="med-duration" label="Duration (days)" hint="How many days to take it." error={errors.duration}>
            {(control) => (
              <input
                {...control}
                type="number"
                inputMode="numeric"
                value={duration}
                onChange={(e) => {
                  setDuration(e.target.value);
                  clearError("duration");
                }}
                placeholder="For example, 30"
                className={controlClass}
                min="1"
                required
              />
            )}
          </Field>
        </div>

        <fieldset
          aria-describedby={`med-times-hint${errors.times ? " med-times-error" : ""}`}
          className="rounded-xl border border-border bg-surface-muted p-4 sm:p-5"
        >
          <legend className="px-2 text-lg font-semibold text-fg">Reminder times</legend>
          <p id="med-times-hint" className="text-base text-fg-muted">
            Add each time of day this medicine is taken. A reminder plays at each time.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
            <Field id="med-slot" label="Time of day" error={errors.slot}>
              {(control) => (
                <select
                  {...control}
                  value={slotInput}
                  onChange={(e) => handleSlotChange(e.target.value as Slot)}
                  className={controlClass}
                >
                  <option value="morning">Morning (breakfast)</option>
                  <option value="afternoon">Afternoon (lunch)</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night (bedtime)</option>
                </select>
              )}
            </Field>

            <Field id="med-time" label="Exact time" error={errors.time}>
              {(control) => (
                <input
                  {...control}
                  type="time"
                  value={timeInput}
                  onChange={(e) => {
                    setTimeInput(e.target.value);
                    clearError("time");
                  }}
                  className={controlClass}
                />
              )}
            </Field>

            <div>
              {/* invisible label keeps the button level with the inputs on wide screens */}
              <span aria-hidden="true" className={`${labelClass} invisible hidden sm:block`}>
                &nbsp;
              </span>
              <button
                type="button"
                onClick={handleSaveReminderTime}
                className={`${buttonClass("secondary")} w-full sm:mt-1.5 sm:w-auto`}
              >
                {editingReminderId ? (
                  <Check aria-hidden="true" className="size-5" />
                ) : (
                  <Plus aria-hidden="true" className="size-5" />
                )}
                {editingReminderId ? "Update time" : "Add time"}
              </button>
            </div>
          </div>

          {sortedTimes.length === 0 ? (
            <p className="mt-4 text-base text-fg-muted">No times added yet.</p>
          ) : (
            <ul aria-label="Added reminder times" className="mt-4 space-y-2">
              {sortedTimes.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center justify-between gap-3 rounded-lg border bg-surface p-3 ${
                    item.id === editingReminderId ? "border-primary" : "border-border"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-fg-muted">{slotNames[item.timeSlot]}</p>
                    <p className="text-xl font-semibold text-fg">{formatTime12h(item.time)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleEditReminderTime(item)}
                      aria-label={`Edit ${item.timeSlot} time`}
                      className={iconButtonClass()}
                    >
                      <Pencil aria-hidden="true" className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteReminderTime(item.id)}
                      aria-label={`Remove ${item.timeSlot} time`}
                      className={iconButtonClass()}
                    >
                      <Trash2 aria-hidden="true" className="size-5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <FieldError id="med-times-error" message={errors.times} />
        </fieldset>

        <Field id="med-notes" label="Notes (optional)" hint="For example: take after food, avoid dairy.">
          {(control) => (
            <input
              {...control}
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={controlClass}
            />
          )}
        </Field>

        {isSuccess && <Notice tone="success">Saved. Taking you back to today&apos;s medicines…</Notice>}

        <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row">
          <button type="submit" disabled={isSuccess} className={`${buttonClass("primary", "lg")} w-full sm:w-auto`}>
            {medicineToEdit ? "Save changes" : "Save medicine"}
          </button>
          <Link href="/dashboard" className={`${buttonClass("secondary", "lg")} w-full sm:w-auto`}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function AddMedicinePage() {
  return (
    <Suspense fallback={<Loading label="Loading form…" />}>
      <AddMedicineForm />
    </Suspense>
  );
}

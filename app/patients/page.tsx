"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Trash2, Users } from "lucide-react";
import { useAppState, PatientProfile } from "@/context/AppContext";
import { SUPPORTED_LANGUAGES } from "@/components/ReminderEngine";
import { buttonClass, iconButtonClass, cardClass, inputClass, labelClass, hintClass } from "@/components/ui/styles";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import Loading from "@/components/ui/Loading";

type ReminderStyle = NonNullable<PatientProfile["reminderStyle"]>;

const reminderStyleLabels: Record<ReminderStyle, string> = {
  both: "Voice and pop-up",
  voice: "Voice only",
  popup: "Pop-up only",
};

type FormErrors = { name?: string; age?: string; condition?: string };

type ControlProps = { id: string; "aria-invalid": boolean; "aria-describedby"?: string };

const controlClass = `${inputClass} aria-invalid:border-missed-fg`;
const selectedCardClass = cardClass.replace("border-border", "border-primary ring-1 ring-primary");

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
  className = "",
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (control: ControlProps) => React.ReactNode;
}) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
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

export default function ProfilePage() {
  const router = useRouter();
  const { profiles, activeProfileId, selectProfile, createProfile, deleteProfile } = useAppState();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form states for creating a profile
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [condition, setCondition] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [language, setLanguage] = useState<string>("English");
  const [reminderStyle, setReminderStyle] = useState<ReminderStyle>("both");
  const [errors, setErrors] = useState<FormErrors>({});
  // Id of the field to focus once its error message has rendered.
  const focusAfterErrors = useRef<string | null>(null);

  // Move focus to the first invalid field after the error messages are on screen.
  useEffect(() => {
    if (focusAfterErrors.current) {
      document.getElementById(focusAfterErrors.current)?.focus();
      focusAfterErrors.current = null;
    }
  }, [errors]);

  const clearError = (key: keyof FormErrors) => setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));

  const handleSelect = (id: string) => {
    selectProfile(id);
    router.push("/dashboard");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const ageNum = parseInt(age, 10);
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Enter the patient's full name.";
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 129) next.age = "Enter an age between 1 and 129.";
    if (!condition.trim()) next.condition = "Enter the medical condition, for example high blood pressure.";

    if (Object.keys(next).length > 0) {
      focusAfterErrors.current = next.name ? "patient-name" : next.age ? "patient-age" : "patient-condition";
      setErrors(next);
      return;
    }
    setErrors({});

    createProfile({
      name: name.trim(),
      age: ageNum,
      gender,
      condition: condition.trim(),
      caregiverName: caregiverName.trim() || "Not set",
      language,
      reminderStyle,
      doctorName: "",
      clinicName: "",
      precautions: "",
      followUpDate: "",
    });

    // createProfile selects the new patient, so the dashboard opens on them.
    router.push("/dashboard");
  };

  if (!mounted) {
    return <Loading label="Loading patients…" />;
  }

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        title="Patients"
        description="Choose whose medicines you are managing, or add a new person."
      />

      <section aria-labelledby="patient-list-heading" className="space-y-4">
        <h2 id="patient-list-heading" className="text-xl font-semibold text-fg">
          Your patients
        </h2>

        {profiles.length === 0 ? (
          <EmptyState
            icon={<Users aria-hidden="true" className="size-6" />}
            title="No patients yet"
            description="Add the first person using the form below."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;
              return (
                <li key={profile.id} className={`${isActive ? selectedCardClass : cardClass} flex flex-col gap-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold text-fg break-words">{profile.name}</h3>
                      <p className="text-base text-fg-muted">
                        {profile.gender} · Age {profile.age}
                      </p>
                    </div>
                    {isActive && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary bg-primary-soft px-2.5 py-0.5 text-sm font-semibold text-primary-text">
                        <Check aria-hidden="true" className="size-4" />
                        Selected
                      </span>
                    )}
                  </div>

                  <dl className="space-y-2 border-y border-border py-4 text-base">
                    <div>
                      <dt className="text-sm text-fg-muted">Condition</dt>
                      <dd className="font-medium text-fg">{profile.condition}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-fg-muted">Caregiver</dt>
                      <dd className="font-medium text-fg">{profile.caregiverName}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-fg-muted">Reminder language</dt>
                      <dd className="font-medium text-fg">{profile.language || "English"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-fg-muted">Reminder style</dt>
                      <dd className="font-medium text-fg">{reminderStyleLabels[profile.reminderStyle ?? "both"]}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelect(profile.id)}
                      suppressHydrationWarning
                      className={`${buttonClass(isActive ? "primary" : "secondary")} flex-1`}
                    >
                      {isActive ? "Open today's medicines" : `Open ${profile.name}`}
                    </button>

                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete profile for ${profile.name}? All their prescription logs will be lost.`)) {
                            deleteProfile(profile.id);
                          }
                        }}
                        suppressHydrationWarning
                        aria-label={`Delete ${profile.name}`}
                        className={iconButtonClass()}
                      >
                        <Trash2 aria-hidden="true" className="size-5" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="add-patient-heading" className={`${cardClass} max-w-2xl`}>
        <h2 id="add-patient-heading" className="text-lg font-semibold text-fg">
          Add a patient
        </h2>
        <p className="mt-1 text-base text-fg-muted">Each person has their own medicines and reminders.</p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field id="patient-name" label="Full name" error={errors.name} className="sm:col-span-2">
            {(control) => (
              <input
                {...control}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError("name");
                }}
                placeholder="For example, Kamla Devi"
                suppressHydrationWarning
                className={controlClass}
                required
              />
            )}
          </Field>

          <Field id="patient-age" label="Age" error={errors.age}>
            {(control) => (
              <input
                {...control}
                type="number"
                inputMode="numeric"
                min="1"
                max="129"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  clearError("age");
                }}
                placeholder="For example, 72"
                suppressHydrationWarning
                className={controlClass}
                required
              />
            )}
          </Field>

          <Field id="patient-gender" label="Gender">
            {(control) => (
              <select
                {...control}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                suppressHydrationWarning
                className={controlClass}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            )}
          </Field>

          <Field
            id="patient-condition"
            label="Medical condition"
            hint="For example: high blood pressure, diabetes."
            error={errors.condition}
            className="sm:col-span-2"
          >
            {(control) => (
              <input
                {...control}
                type="text"
                value={condition}
                onChange={(e) => {
                  setCondition(e.target.value);
                  clearError("condition");
                }}
                suppressHydrationWarning
                className={controlClass}
                required
              />
            )}
          </Field>

          <Field
            id="patient-caregiver"
            label="Caregiver name (optional)"
            hint="The family member or nurse who helps with medicines."
            className="sm:col-span-2"
          >
            {(control) => (
              <input
                {...control}
                type="text"
                value={caregiverName}
                onChange={(e) => setCaregiverName(e.target.value)}
                suppressHydrationWarning
                className={controlClass}
              />
            )}
          </Field>

          <Field id="patient-language" label="Reminder language" hint="Spoken reminders use this language.">
            {(control) => (
              <select
                {...control}
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                suppressHydrationWarning
                className={controlClass}
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field id="patient-style" label="Reminder style">
            {(control) => (
              <select
                {...control}
                value={reminderStyle}
                onChange={(e) => setReminderStyle(e.target.value as ReminderStyle)}
                suppressHydrationWarning
                className={controlClass}
              >
                <option value="both">{reminderStyleLabels.both}</option>
                <option value="voice">{reminderStyleLabels.voice}</option>
                <option value="popup">{reminderStyleLabels.popup}</option>
              </select>
            )}
          </Field>

          <button
            type="submit"
            suppressHydrationWarning
            className={`${buttonClass("primary", "lg")} w-full sm:col-span-2`}
          >
            Add patient
          </button>
        </form>
      </section>
    </div>
  );
}

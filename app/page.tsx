import Link from "next/link";
import { ArrowRight, BellRing, ScanLine, Users } from "lucide-react";
import Notice from "@/components/ui/Notice";
import StatusBadge, { type DoseStatus } from "@/components/ui/StatusBadge";
import { buttonClass, cardClass } from "@/components/ui/styles";

const features = [
  {
    Icon: ScanLine,
    title: "Scan a prescription",
    text: "AI reads a photo of the prescription. You check and edit every medicine before it is added.",
  },
  {
    Icon: BellRing,
    title: "Reminders in their language",
    text: "A spoken reminder in 10 languages, with a large “I have taken it” button.",
  },
  {
    Icon: Users,
    title: "Caregiver visibility",
    text: "See what was taken, pending or missed. Get missed-dose alerts, and keep the care plan and symptom notes in one place.",
  },
];

const doseStatuses: { status: DoseStatus; text: string }[] = [
  { status: "taken", text: "Recorded as taken." },
  { status: "pending", text: "Due later today, or not recorded yet." },
  { status: "missed", text: "Marked missed, or not answered after three reminders." },
];

const steps = [
  { title: "Add medicines", text: "Scan a prescription or type the medicines in." },
  { title: "Get reminded at each dose time", text: "The patient sees a reminder and hears it spoken aloud." },
  { title: "Family checks the caregiver view", text: "See what was taken, what is pending and what was missed." },
];

const modules = [
  {
    title: "System architecture",
    text: "How the app, the prescription-reading service and the data fit together.",
    path: "docs/architecture/architecture.md",
  },
  {
    title: "Database schema",
    text: "Tables for patient profiles, medicine schedules and dose records.",
    path: "docs/database/schema.sql",
  },
  {
    title: "UI/UX prototype",
    text: "Screens and design notes for the patient and caregiver views.",
    path: "docs/ui/README.md",
  },
  {
    title: "AI prescription reading",
    text: "A proof of concept that turns a prescription photo into a list of medicines.",
    path: "docs/ai-poc/README.md",
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-14 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section aria-labelledby="hero-title" className="max-w-3xl space-y-5">
        <p className="text-sm font-semibold text-primary-text">Medication support for older adults</p>
        <h1 id="hero-title" className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">
          Medicines on time, with family kept in the loop
        </h1>
        <p className="text-lg text-fg-muted">
          CareCompanion reads a photo of a prescription and builds a daily schedule. It reminds the patient with an
          on-screen and spoken message in their language, and shows family caregivers what was taken.
        </p>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
          <Link href="/dashboard" className={buttonClass("primary", "lg")}>
            Open today&apos;s medicines
            <ArrowRight aria-hidden="true" className="size-5" />
          </Link>
          <Link href="/caregiver" className={buttonClass("secondary", "lg")}>
            Caregiver view
          </Link>
          <Link
            href="/upload"
            className="inline-flex min-h-12 items-center justify-center px-2 text-lg font-semibold text-primary-text underline underline-offset-4 hover:text-fg"
          >
            Scan a prescription
          </Link>
        </div>
      </section>

      <section aria-labelledby="what-title" className="space-y-5">
        <h2 id="what-title" className="text-2xl font-semibold text-fg">
          What it does
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {features.map(({ Icon, title, text }) => (
            <li key={title} className={`${cardClass} space-y-3`}>
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary-soft text-primary-text">
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <h3 className="text-lg font-semibold text-fg">{title}</h3>
              <p className="text-base text-fg-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="status-title" className="space-y-5">
        <h2 id="status-title" className="text-2xl font-semibold text-fg">
          Clear dose status
        </h2>
        <ul className="grid gap-4 md:grid-cols-3">
          {doseStatuses.map(({ status, text }) => (
            <li key={status} className={`${cardClass} space-y-3`}>
              <StatusBadge status={status} />
              <p className="text-base text-fg">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="how-title" className="space-y-5">
        <h2 id="how-title" className="text-2xl font-semibold text-fg">
          How it works
        </h2>
        <ol className="space-y-4">
          {steps.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-fg"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-fg">{step.title}</h3>
                <p className="text-base text-fg-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="modules-title" className="space-y-5">
        <h2 id="modules-title" className="text-2xl font-semibold text-fg">
          Project modules (Phase-1)
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {modules.map((m) => (
            <li key={m.path} className={`${cardClass} space-y-2`}>
              <h3 className="text-lg font-semibold text-fg">{m.title}</h3>
              <p className="text-base text-fg-muted">{m.text}</p>
              <code className="inline-block max-w-full break-words rounded bg-surface-muted px-1.5 py-0.5 text-sm text-fg">
                {m.path}
              </code>
            </li>
          ))}
        </ul>
      </section>

      <Notice tone="info">
        Academic prototype — not a medical device. Data stays in this browser; nothing is sent to a database.
      </Notice>
    </div>
  );
}

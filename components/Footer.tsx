import Link from "next/link";
import { HeartPulse } from "lucide-react";

const links = [
  { name: "Today", href: "/dashboard" },
  { name: "Caregiver", href: "/caregiver" },
  { name: "Scan prescription", href: "/upload" },
  { name: "Patients", href: "/patients" },
];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface print:hidden">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md space-y-2">
            <p className="flex items-center gap-2 text-lg font-semibold text-fg">
              <HeartPulse aria-hidden="true" className="size-5 text-primary-text" />
              CareCompanion AI
            </p>
            <p className="text-base text-fg-muted">
              Helps older adults take their medicines on time, and helps family see how the day went.
            </p>
          </div>

          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-2 gap-y-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-11 items-center rounded-lg px-2 text-base text-fg-muted underline-offset-4 hover:text-fg hover:underline"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="space-y-1 border-t border-border pt-4 text-sm text-fg-muted">
          <p>Phase-1 academic prototype. Not a medical device. Data is stored only in this browser.</p>
          <p>© {new Date().getFullYear()} CareCompanion AI</p>
        </div>
      </div>
    </footer>
  );
}

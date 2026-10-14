"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartPulse, Menu, Moon, Sun, User, X } from "lucide-react";
import { useAppState } from "@/context/AppContext";
import { iconButtonClass } from "@/components/ui/styles";

const navItems = [
  { name: "Today", href: "/dashboard" },
  { name: "Caregiver", href: "/caregiver" },
  { name: "Scan prescription", href: "/upload" },
  { name: "Add medicine", href: "/add-medicine" },
  { name: "Patients", href: "/patients" },
  { name: "Analytics", href: "/analytics" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { activeProfile, theme, toggleTheme } = useAppState();
  const [mounted, setMounted] = useState(false);
  // The menu is "open" only for the page it was opened on, so navigating closes it without an effect.
  const [openPath, setOpenPath] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = openPath === pathname;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenPath(null);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const patientLabel = activeProfile ? `Patient: ${activeProfile.name}` : "Choose a patient";
  const closeMenu = () => setOpenPath(null);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface print:hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg">
          <span className="flex size-9 items-center sm:size-10 justify-center rounded-lg bg-primary-soft text-primary-text">
            <HeartPulse aria-hidden="true" className="size-6" />
          </span>
          <span className="text-base font-bold text-fg sm:text-lg">CareCompanion AI</span>
        </Link>

        {/* 18px base type: five links only fit on one row from xl (1280px) up; below that the menu button is used. */}
        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-base transition-colors ${
                      active
                        ? "bg-primary-soft font-semibold text-primary-text"
                        : "font-medium text-fg-muted hover:bg-surface-muted hover:text-fg"
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {mounted && (
            <Link
              href="/patients"
              className="hidden min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-border px-3 text-base font-medium text-fg hover:bg-surface-muted xl:inline-flex"
            >
              <User aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
              {/* Icon-only below 2xl so the header fits; still read aloud. */}
              <span className="sr-only max-w-48 truncate 2xl:not-sr-only">{patientLabel}</span>
            </Link>
          )}

          {mounted && (
            <button
              type="button"
              onClick={toggleTheme}
              className={iconButtonClass()}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? (
                <Moon aria-hidden="true" className="size-5" />
              ) : (
                <Sun aria-hidden="true" className="size-5" />
              )}
            </button>
          )}

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpenPath(isOpen ? null : pathname)}
            className={`${iconButtonClass()} xl:hidden`}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-menu"
          >
            {isOpen ? (
              <X aria-hidden="true" className="size-6" />
            ) : (
              <Menu aria-hidden="true" className="size-6" />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <nav
          id="mobile-menu"
          aria-label="Main menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-surface xl:hidden"
        >
          <div className="mx-auto max-w-7xl space-y-1 px-4 py-3 sm:px-6">
            {mounted && (
              <Link
                href="/patients"
                onClick={closeMenu}
                className="mb-2 flex min-h-12 items-center gap-2 rounded-lg border border-border px-3 text-base font-medium text-fg hover:bg-surface-muted"
              >
                <User aria-hidden="true" className="size-5 shrink-0 text-primary-text" />
                <span className="min-w-0 truncate">{patientLabel}</span>
              </Link>
            )}
            <ul className="space-y-1">
              {navItems.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 w-full items-center rounded-lg px-3 text-lg ${
                        active
                          ? "bg-primary-soft font-semibold text-primary-text"
                          : "font-medium text-fg hover:bg-surface-muted"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      )}
    </header>
  );
}

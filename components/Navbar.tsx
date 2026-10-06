"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/context/AppContext";
import { HeartPulse, Menu, X, User, Sun, Moon, Sparkles } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const { activeProfile, theme, toggleTheme } = useAppState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Internal routes of the Phase-1 application
  const isInternalRoute = [
    "/dashboard",
    "/caregiver",
    "/upload",
    "/add-medicine",
    "/patients"
  ].some((path) => pathname.startsWith(path));

  // Determine navigation menu items dynamically
  const navItems = isInternalRoute
    ? [
        { name: "Caregiver Dashboard", href: "/caregiver" },
        { name: "Medication Schedule", href: "/dashboard" },
        { name: "AI Prescription PoC", href: "/upload" },
        { name: "Add Medication", href: "/add-medicine" },
        { name: "Patient Profiles", href: "/patients" },
      ]
    : [
        { name: "Overview", href: "/#hero", sectionId: "hero" },
        { name: "Architecture", href: "/#architecture", sectionId: "architecture" },
        { name: "Database Schema", href: "/#database", sectionId: "database" },
        { name: "Caregiver UI", href: "/#caregiver-ui", sectionId: "caregiver-ui" },
        { name: "AI PoC", href: "/#ai-poc", sectionId: "ai-poc" },
      ];

  // Active section tracking on scroll
  useEffect(() => {
    if (pathname !== "/" || isInternalRoute) return;

    const handleScroll = () => {
      const sections = ["hero", "architecture", "database", "caregiver-ui", "ai-poc"];
      const scrollPosition = window.scrollY + 120;

      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [pathname, isInternalRoute]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === "/" && href.startsWith("/#")) {
      e.preventDefault();
      const id = href.replace("/#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", href);
      }
      setIsOpen(false);
    }
  };

  const isLinkActive = (item: { href: string; sectionId?: string }) => {
    if (isInternalRoute) {
      return pathname.startsWith(item.href);
    }
    if (pathname === "/") {
      return activeSection === item.sectionId;
    }
    return pathname === item.href;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/85 dark:bg-dark-bg-primary/85 backdrop-blur-lg shadow-2xs print:hidden transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Logo & Phase-1 Milestone Tag */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="rounded-xl bg-teal-50 dark:bg-teal-950/40 p-2 text-teal-600 dark:text-teal-400 transition-colors group-hover:bg-teal-100 dark:group-hover:bg-teal-900/40 border border-teal-100 dark:border-teal-900/30 shadow-2xs">
                <HeartPulse className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-dark-text-primary leading-tight">
                  Care<span className="text-teal-600 dark:text-teal-400">Companion</span> AI
                </span>
                <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 uppercase tracking-widest">
                  Phase-1 Review 2
                </span>
              </div>
            </Link>

            {/* Active patient badge */}
            {isInternalRoute && mounted && (
              activeProfile ? (
                <Link 
                  href="/patients" 
                  className="hidden md:flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 py-1 px-3 rounded-full text-xs font-bold transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-3xs"
                >
                  <User className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active: {activeProfile.name}</span>
                </Link>
              ) : (
                <Link 
                  href="/patients" 
                  className="hidden md:flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 py-1 px-3 rounded-full text-xs font-bold transition-all hover:bg-amber-100 dark:hover:bg-amber-900/60"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                  <span>Select Patient</span>
                </Link>
              )
            )}
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  isLinkActive(item)
                    ? "bg-teal-50 dark:bg-teal-950/40 text-teal-750 dark:text-teal-300 shadow-2xs font-extrabold border border-teal-150 dark:border-teal-900/40"
                    : "text-slate-700 dark:text-dark-text-secondary hover:bg-slate-100/70 dark:hover:bg-dark-bg-elevated hover:text-teal-700 dark:hover:text-teal-400"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Right Section Buttons & Theme Toggle */}
          <div className="hidden lg:flex items-center gap-3">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl text-slate-700 dark:text-dark-text-primary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex items-center justify-center shadow-3xs"
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            )}

            {isInternalRoute ? (
              <Link
                href="/"
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-slate-700 dark:text-dark-text-primary hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-dark-bg-secondary hover:bg-slate-200 dark:hover:bg-dark-bg-elevated border border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-200 shadow-3xs"
              >
                Overview
              </Link>
            ) : (
              <Link
                href="/caregiver"
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Live Prototype</span>
              </Link>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex lg:hidden gap-2 items-center">
            {mounted && (
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-slate-700 dark:text-dark-text-primary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated border border-slate-200 dark:border-slate-800 transition-all flex items-center justify-center"
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 dark:text-dark-text-secondary hover:bg-slate-100 dark:hover:bg-dark-bg-elevated hover:text-slate-900 dark:hover:text-white focus:outline-hidden"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-bg-secondary" id="mobile-menu">
          <div className="space-y-1 px-3 pb-4 pt-2">
            {isInternalRoute && mounted && activeProfile && (
              <div className="px-3 py-2 text-xs font-bold text-slate-700 dark:text-dark-text-secondary bg-slate-50 dark:bg-dark-bg-card border border-slate-200 dark:border-slate-800 rounded-lg m-1 flex items-center justify-between">
                <span>Active: {activeProfile.name}</span>
                <Link href="/patients" onClick={() => setIsOpen(false)} className="text-teal-600 dark:text-teal-400 hover:underline">Change</Link>
              </div>
            )}
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  handleNavClick(e, item.href);
                  if (!item.href.startsWith("/#")) setIsOpen(false);
                }}
                className={`block px-3 py-2 rounded-lg text-sm font-bold ${
                  isLinkActive(item)
                    ? "bg-teal-50 dark:bg-teal-950/40 text-teal-750 dark:text-teal-300 font-extrabold"
                    : "text-slate-700 dark:text-dark-text-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-elevated hover:text-teal-600"
                }`}
              >
                {item.name}
              </Link>
            ))}
            <div className="mt-3 px-1 flex flex-col gap-2">
              <Link
                href="/caregiver"
                onClick={() => setIsOpen(false)}
                className="w-full text-center block px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs"
              >
                Open Caregiver Dashboard
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

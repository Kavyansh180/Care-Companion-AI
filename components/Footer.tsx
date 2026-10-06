"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartPulse, Brain, Server } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (pathname === "/" && href.startsWith("/#")) {
      e.preventDefault();
      const id = href.replace("/#", "");
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", href);
      }
    }
  };

  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-dark-bg-secondary text-slate-300 print:hidden transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand & Milestone Summary */}
          <div className="space-y-3 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="rounded-lg bg-teal-900/80 p-1.5 text-teal-400 border border-teal-700/50">
                <HeartPulse className="h-5 w-5" />
              </div>
              <span className="text-base font-black tracking-tight text-white">
                Care<span className="text-teal-400">Companion</span> AI
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              Capstone Project — Phase-1 Review 2 milestone demonstrating system architecture, relational database modeling, caregiver dashboard prototyping, and Gemini AI prescription extraction.
            </p>
          </div>

          {/* Module 1 & 2 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <Server className="h-3.5 w-3.5" />
              <span>Modules 1 & 2</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <Link href="/#architecture" onClick={(e) => handleAnchorClick(e, "/#architecture")} className="hover:text-teal-400 transition-colors">
                  System Architecture (React / Next.js API / Gemini)
                </Link>
              </li>
              <li>
                <Link href="/#database" onClick={(e) => handleAnchorClick(e, "/#database")} className="hover:text-teal-400 transition-colors">
                  Relational Database Schemas (3 Entities)
                </Link>
              </li>
              <li>
                <Link href="/patients" className="hover:text-teal-400 transition-colors">
                  Patient Profiles Management
                </Link>
              </li>
            </ul>
          </div>

          {/* Module 3 & 4 */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5" />
              <span>Modules 3 & 4</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <Link href="/caregiver" className="hover:text-teal-400 transition-colors">
                  Caregiver Dashboard Prototype
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-teal-400 transition-colors">
                  Medication Timeline (Taken/Pending/Missed)
                </Link>
              </li>
              <li>
                <Link href="/upload" className="hover:text-teal-400 transition-colors">
                  AI Prescription Extraction PoC
                </Link>
              </li>
            </ul>
          </div>

          {/* Academic Scope Notice */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Academic Milestone Notice
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This repository represents the completed Phase-1 Review 2 scope (design, architecture, schema, UI prototype, and AI feasibility PoC). Production deployment and distributed multi-user persistence are scheduled for future milestones.
            </p>
          </div>

        </div>

        {/* Phase Boundary & Team attribution */}
        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} CareCompanion AI — Capstone Project Phase-1 Review 2</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="text-teal-400 font-semibold">Feasibility Proof of Concept</span>
            <span>•</span>
            <span>Non-Clinical Academic Prototype</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

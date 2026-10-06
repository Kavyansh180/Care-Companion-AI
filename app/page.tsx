"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { 
  HeartPulse, 
  ArrowRight, 
  Sparkles, 
  Brain, 
  ShieldCheck, 
  Server,
  ChevronRight
} from "lucide-react";

export default function Home() {
  const architectureRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-dark-bg-primary relative overflow-hidden transition-colors duration-200">
      
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] rounded-full bg-teal-200/10 blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute top-[30%] right-[-10%] w-[45%] h-[45%] rounded-full bg-sky-200/10 blur-3xl -z-10 pointer-events-none"></div>

      {/* 1. Hero Section — Phase-1 Review 2 Capstone Milestone */}
      <section 
        id="hero" 
        className="relative py-20 sm:py-28 bg-white dark:bg-dark-bg-primary border-b border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col justify-center items-center text-center transition-colors duration-200"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
          
          {/* Milestone Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/40 text-teal-800 dark:text-teal-300 text-xs font-bold mb-6 shadow-3xs">
            <Sparkles className="h-4 w-4 text-teal-600 animate-spin" />
            <span>Capstone Project • Phase-1 Review 2 Milestone</span>
          </div>

          {/* Logo Mark */}
          <div className="rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/30 p-3.5 shadow-sm text-teal-600 dark:text-teal-400 mb-5">
            <HeartPulse className="h-10 w-10" />
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-tight mb-4">
            Care<span className="text-teal-600 dark:text-teal-400">Companion</span> AI
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-2xl font-extrabold bg-gradient-to-r from-teal-600 to-sky-600 bg-clip-text text-transparent leading-normal max-w-2xl mb-4">
            AI-Powered Digital Caregiver for Elderly Medication Management
          </p>

          {/* Scope Explanation */}
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl mb-8">
            This repository documents and demonstrates the completed Phase-1 Review 2 execution: System Architecture, Database Schema Modeling, UI/UX Prototyping, and Gemini AI Prescription Extraction PoC.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto justify-center items-center">
            <Link
              href="/caregiver"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 text-xs font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-md hover:shadow-lg transition-all duration-200 gap-2 cursor-pointer"
            >
              <span>Explore Caregiver Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/upload"
              className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 text-xs font-bold rounded-xl text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all duration-200 gap-2 cursor-pointer shadow-3xs"
            >
              <Brain className="h-4 w-4 text-teal-600" />
              <span>Run AI Prescription PoC</span>
            </Link>

            <button
              onClick={() => scrollToSection("architecture")}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 shadow-3xs cursor-pointer"
            >
              System Architecture
            </button>
          </div>

          {/* 4 Executed Modules Summary Pills */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 w-full max-w-3xl">
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-left">
              <span className="text-[10px] uppercase font-black text-teal-700 dark:text-teal-400 block">Module 1</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">System Architecture</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-left">
              <span className="text-[10px] uppercase font-black text-teal-700 dark:text-teal-400 block">Module 2</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">Database Schema</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-left">
              <span className="text-[10px] uppercase font-black text-teal-700 dark:text-teal-400 block">Module 3</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">UI/UX Prototyping</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-3 rounded-xl text-left">
              <span className="text-[10px] uppercase font-black text-teal-700 dark:text-teal-400 block">Module 4</span>
              <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">AI Proof of Concept</span>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Module 1: System Architecture */}
      <section 
        id="architecture" 
        ref={architectureRef}
        className="py-16 sm:py-24 bg-slate-50/60 dark:bg-dark-bg-secondary border-b border-slate-200/80 dark:border-slate-800 scroll-mt-16 transition-colors duration-200"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-widest">
              Module 1 Execution
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              System Architecture & Data Flow
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Secure client-serverless-AI topology ensuring API keys and medical image processing remain protected on the backend.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            
            {/* Architecture Flow Card */}
            <div className="bg-white dark:bg-dark-bg-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Server className="h-5 w-5 text-teal-600" />
                <span>Multi-Tier Architecture Design</span>
              </h3>

              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <strong className="text-slate-900 dark:text-white block font-bold">1. Client Layer (React / Next.js)</strong>
                  <p className="text-slate-600 dark:text-slate-400">
                    Caregiver monitoring dashboard, timeline visualization, and prescription photo capture interface.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <strong className="text-slate-900 dark:text-white block font-bold">2. Serverless API Layer (Next.js API Routes)</strong>
                  <p className="text-slate-600 dark:text-slate-400">
                    Endpoints (<code className="text-teal-700 dark:text-teal-300 font-mono">/api/parse-prescription</code>) validate payload, sanitize inputs, and securely hold Gemini credentials.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <strong className="text-slate-900 dark:text-white block font-bold">3. AI Engine (Gemini 2.5 Flash Vision)</strong>
                  <p className="text-slate-600 dark:text-slate-400">
                    Multimodal LLM processes image contours, extracts handwritten text, and emits validated structured JSON.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                  <strong className="text-slate-900 dark:text-white block font-bold">4. Database Model (Designed Relational Schema)</strong>
                  <p className="text-slate-600 dark:text-slate-400">
                    Normalized tables for Patient Profiles, Structured Medication Schedules, and Adherence Tracking Logs.
                  </p>
                </div>
              </div>
            </div>

            {/* Architecture Visual Diagram ASCII representation */}
            <div className="bg-slate-900 text-teal-300 rounded-2xl p-6 sm:p-8 font-mono text-xs border border-slate-800 shadow-xl overflow-x-auto space-y-4">
              <div className="flex items-center justify-between text-slate-400 text-[10px] pb-2 border-b border-slate-800">
                <span>ARCHITECTURE_PIPELINE.TXT</span>
                <span>PHASE-1 DESIGN</span>
              </div>
              <pre className="leading-relaxed">
{`       CARECOMPANION AI PIPELINE
                   |
                   v
        +---------------------+
        |    Client Layer     |
        |  React / Next.js    |
        | Caregiver Dashboard |
        +----------+----------+
                   |
                   | Secure POST Payload
                   v
        +---------------------+
        |   Serverless API    |
        | Next.js API Routes  |
        | Key Guard & Validate|
        +----------+----------+
                   |
                   | Server-to-Server
                   v
        +---------------------+
        |      AI Engine      |
        | Gemini Flash Vision |
        |  Prescription PoC   |
        +----------+----------+
                   |
                   | Structured JSON
                   v
        +---------------------+
        |   Database Design   |
        |  • PatientProfile   |
        |  • MedicationSched  |
        |  • AdherenceLog     |
        +---------------------+`}
              </pre>
              <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-800 flex justify-between">
                <span>Security: API Keys Server-Side Only</span>
                <span>Format: Pure JSON</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. Module 2: Database Schema */}
      <section 
        id="database" 
        className="py-16 sm:py-24 bg-white dark:bg-dark-bg-primary border-b border-slate-200/80 dark:border-slate-800 scroll-mt-16 transition-colors duration-200"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-widest">
              Module 2 Execution
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Relational Database Schema Design
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Three finalized relational entities designed to model geriatric patient files, structured recurring schedules, and adherence verification logs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Entity 1: PatientProfile */}
            <div className="bg-slate-50 dark:bg-dark-bg-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-xs font-black text-teal-700 dark:text-teal-400 uppercase">Entity 1</span>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-md">1 : N Parent</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">PatientProfile</h3>
              <ul className="text-xs font-mono space-y-1.5 text-slate-700 dark:text-slate-300">
                <li className="font-bold text-teal-700 dark:text-teal-400">🔑 patient_id (PK, VARCHAR)</li>
                <li>• name (VARCHAR)</li>
                <li>• age (INTEGER)</li>
                <li>• gender (VARCHAR)</li>
                <li>• condition (TEXT)</li>
                <li>• caregiver_name (VARCHAR)</li>
                <li>• doctor_name (VARCHAR)</li>
                <li>• clinic_name (VARCHAR)</li>
                <li>• preferred_language (VARCHAR)</li>
                <li>• precautions (TEXT)</li>
                <li>• follow_up_date (DATE)</li>
              </ul>
            </div>

            {/* Entity 2: MedicationSchedule */}
            <div className="bg-slate-50 dark:bg-dark-bg-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-xs font-black text-teal-700 dark:text-teal-400 uppercase">Entity 2</span>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-md">Schedule Map</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">MedicationSchedule</h3>
              <ul className="text-xs font-mono space-y-1.5 text-slate-700 dark:text-slate-300">
                <li className="font-bold text-teal-700 dark:text-teal-400">🔑 medication_id (PK, VARCHAR)</li>
                <li className="font-bold text-sky-700 dark:text-sky-400">🔗 patient_id (FK → PatientProfile)</li>
                <li>• medicine_name (VARCHAR)</li>
                <li>• dosage (VARCHAR)</li>
                <li>• frequency (VARCHAR)</li>
                <li>• time_of_day (VARCHAR)</li>
                <li>• exact_time (TIME)</li>
                <li>• duration_days (INTEGER)</li>
                <li>• start_date (DATE)</li>
                <li>• instructions (TEXT)</li>
              </ul>
            </div>

            {/* Entity 3: AdherenceLog */}
            <div className="bg-slate-50 dark:bg-dark-bg-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-xs font-black text-teal-700 dark:text-teal-400 uppercase">Entity 3</span>
                <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-md">Adherence Log</span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">AdherenceLog</h3>
              <ul className="text-xs font-mono space-y-1.5 text-slate-700 dark:text-slate-300">
                <li className="font-bold text-teal-700 dark:text-teal-400">🔑 log_id (PK, VARCHAR)</li>
                <li className="font-bold text-sky-700 dark:text-sky-400">🔗 patient_id (FK → PatientProfile)</li>
                <li className="font-bold text-sky-700 dark:text-sky-400">🔗 medication_id (FK → MedSchedule)</li>
                <li>• scheduled_time (TIME)</li>
                <li>• status (taken | pending | missed)</li>
                <li>• recorded_at (TIMESTAMP)</li>
              </ul>
            </div>

          </div>

          <div className="text-center">
            <p className="text-xs text-slate-500 mb-3">
              Full DDL schema script and documentation available in <code className="font-mono text-teal-700 dark:text-teal-300 font-bold">docs/database/schema.sql</code>
            </p>
            <Link
              href="/patients"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
            >
              <span>View Active Patient Profiles in Application</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

        </div>
      </section>

      {/* 4. Module 3: UI/UX Prototyping */}
      <section 
        id="caregiver-ui" 
        className="py-16 sm:py-24 bg-slate-50/60 dark:bg-dark-bg-secondary border-b border-slate-200/80 dark:border-slate-800 scroll-mt-16 transition-colors duration-200"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-widest">
              Module 3 Execution
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Caregiver Dashboard & Timeline UI
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Interactive wireframe and prototype demonstrating real-time Taken, Pending, and Missed status indicators for family caregivers.
            </p>
          </div>

          {/* Prototype Preview Card */}
          <div className="bg-white dark:bg-dark-bg-card rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-700 dark:text-teal-400 tracking-wider">Prototype Demonstration Example</span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Mr. Ramesh (Age 72) • Daily Adherence Timeline</h3>
              </div>
              <Link
                href="/caregiver"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all"
              >
                <span>Open Full Caregiver Hub</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Visual States Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              
              {/* State 1: TAKEN */}
              <div className="border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">08:00 AM</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">TAKEN</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Telmisartan 40 mg</h4>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">Morning routine • Recorded intake at 08:15 AM</p>
              </div>

              {/* State 2: PENDING */}
              <div className="border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">09:00 PM</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-extrabold text-[10px]">PENDING</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Amlodipine 5 mg</h4>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">Night routine • Scheduled before bedtime</p>
              </div>

              {/* State 3: MISSED */}
              <div className="border border-red-200 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900 dark:text-white">01:00 PM</span>
                  <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-extrabold text-[10px] animate-pulse">MISSED</span>
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Metformin 500 mg</h4>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">Afternoon routine • Alert triggered to caregiver</p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 5. Module 4: AI Proof of Concept */}
      <section 
        id="ai-poc" 
        className="py-16 sm:py-24 bg-white dark:bg-dark-bg-primary border-b border-slate-200/80 dark:border-slate-800 scroll-mt-16 transition-colors duration-200"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-teal-700 dark:text-teal-400 uppercase tracking-widest">
              Module 4 Execution
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              AI Prescription Extraction Proof of Concept
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
              Extracting clinical parameters (Patient, Medicine, Dosage, Timing, Duration) from handwritten prescriptions into structured JSON using Gemini Vision.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            
            {/* Input Prescription Benchmark */}
            <div className="bg-slate-50 dark:bg-dark-bg-card rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Input: Handwritten Doctor Prescription</span>
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-bold uppercase">Review 2 Sample</span>
                </div>
                <div className="font-mono text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed text-slate-800 dark:text-slate-200">
                  <p className="font-bold text-teal-700 dark:text-teal-400">Patient: Mr. Ramesh, 72 yrs</p>
                  <p className="text-slate-500 mt-1">Diagnosis: Hypertension</p>
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                    <p>1. Tab Telmisartan 40 mg<br/>&nbsp;&nbsp;&nbsp;1 tab, morning, 30 days</p>
                    <p>2. Tab Amlodipine 5 mg<br/>&nbsp;&nbsp;&nbsp;1 tab, night, 30 days</p>
                  </div>
                </div>
              </div>

              <Link
                href="/upload"
                className="w-full py-3 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all text-center flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>Test Live PoC Extraction in App</span>
              </Link>
            </div>

            {/* Expected Output JSON */}
            <div className="bg-slate-900 text-teal-300 rounded-2xl p-6 font-mono text-xs border border-slate-800 shadow-xl flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-[10px] pb-2 border-b border-slate-800">
                  <span>OUTPUT: STRUCTURED_JSON</span>
                  <span className="text-emerald-400 font-bold">VALIDATED SCHEMA</span>
                </div>
                <pre className="overflow-x-auto leading-relaxed max-h-[260px]">
{`{
  "patient": "Mr. Ramesh",
  "medications": [
    {
      "name": "Telmisartan",
      "dosage": "40 mg",
      "timing": "Morning",
      "duration_days": 30
    },
    {
      "name": "Amlodipine",
      "dosage": "5 mg",
      "timing": "Night",
      "duration_days": 30
    }
  ]
}`}
                </pre>
              </div>

              <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-800 flex justify-between">
                <span>Direct Mapping → MedicationSchedule</span>
                <span>No Hallucinations</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 6. Current Limitations & Phase Boundary */}
      <section className="py-16 sm:py-20 bg-slate-50/60 dark:bg-dark-bg-secondary transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="bg-white dark:bg-dark-bg-card rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-600" />
              <span>Phase Boundary & Scope Declaration</span>
            </h3>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              This repository represents the finalized <strong>Phase-1 Review 2 milestone</strong> of the CareCompanion AI capstone project. 
              The completed execution focuses on system architecture formulation, relational database design, caregiver UI wireframing, and AI vision extraction feasibility testing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white">Current Milestone Status</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Database schemas are designed; prototype state uses client-side structures for zero-setup academic review.
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white">Future / Phase-2 Scope</span>
                <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Production cloud database deployment, distributed multi-user synchronization, and external SMS/WhatsApp caregiver integrations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useAppState } from "@/context/AppContext";
import { 
  Check, 
  X, 
  RotateCcw, 
  Pill, 
  Plus, 
  Clock, 
  AlertCircle,
  TrendingUp,
  User,
  Users,
  Sparkles,
  ArrowRight,
  Trash2,
  Edit2,
  Volume2
} from "lucide-react";
import Link from "next/link";
import { formatTime12h, getLocalizedReminder, speakTextWithVoice } from "@/components/ReminderEngine";

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

  const [currentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (!activeProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 animate-pulse shadow-sm">
          <AlertCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">No Patient Profile Loaded</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Please select an existing patient file or register a new one to view daily adherence schedules.
          </p>
        </div>
        <Link
          href="/patients"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-md transition-all"
        >
          Go to Patients Portal
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    );
  }

  const todayLogs = trackingLogs.filter(log => log.date === currentDate);

  const timeSlots = [
    { id: "morning", name: "Morning Routine", timeRange: "06:00 - 11:59" },
    { id: "afternoon", name: "Afternoon Routine", timeRange: "12:00 - 16:59" },
    { id: "evening", name: "Evening Routine", timeRange: "17:00 - 19:59" },
    { id: "night", name: "Night Routine", timeRange: "20:00 - 23:59" },
  ];

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

  const todayDoses: ScheduledDose[] = [];
  let totalScheduledToday = 0;
  let takenCount = 0;
  let missedCount = 0;

  medicines.forEach((med) => {
    if (!med.active) return;
    
    med.reminderTimes.forEach((rt) => {
      const log = todayLogs.find(
        (l) => l.medicineId === med.id && l.timeSlot === rt.timeSlot
      );
      
      const status = log ? log.status : "pending";
      totalScheduledToday++;
      
      if (status === "taken") takenCount++;
      else if (status === "missed") missedCount++;

      todayDoses.push({
        reminderTimeId: rt.id,
        medicineId: med.id,
        medicineName: med.name,
        dosage: med.dosage,
        notes: med.notes,
        timeSlot: rt.timeSlot,
        exactTime: rt.time,
        status,
        timestamp: log?.timestamp,
      });
    });
  });

  const adherencePercentage = totalScheduledToday > 0 
    ? Math.round((takenCount / totalScheduledToday) * 100) 
    : 100;

  const renderStatusBadge = (status: "taken" | "missed" | "pending") => {
    switch (status) {
      case "taken":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            TAKEN
          </span>
        );
      case "missed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold text-red-800 bg-red-50 dark:bg-red-950/40 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-md animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            MISSED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold text-amber-800 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-md">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            PENDING
          </span>
        );
    }
  };

  const triggerVoicePreview = (medName: string, dosage: string, timeSlot: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const { langCode, speechText } = getLocalizedReminder(
        activeProfile?.language,
        activeProfile.name,
        medName,
        dosage,
        timeSlot
      );
      
      speakTextWithVoice(
        speechText,
        langCode,
        activeProfile?.language
      );
    } else {
      alert("Speech synthesis is not supported in this browser environment.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/40 px-3 py-1 rounded-full uppercase tracking-wider">
              Medication Schedule Prototype
            </span>
            <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full">
              Patient: {activeProfile.name}
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1.5">
            Daily Medication Timeline
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs font-medium">
            {new Date(currentDate).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} • Demonstration of Scheduled, Taken, Pending, and Missed states.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/caregiver"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-all"
          >
            <Users className="mr-1.5 h-3.5 w-3.5" />
            Caregiver Dashboard
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-teal-600" />
            Scan Prescription
          </Link>
          <Link
            href="/add-medicine"
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Medication
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Patient & Adherence Snapshot (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Patient Card */}
          <div className="bg-white dark:bg-dark-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Active Patient</span>
              <Link href="/patients" className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline">Change</Link>
            </div>
            
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 border border-teal-100 dark:border-teal-900/30">
                <User className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{activeProfile.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">{activeProfile.gender} • Age {activeProfile.age}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium pt-1">Condition: {activeProfile.condition}</p>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">Caregiver: {activeProfile.caregiverName}</p>
              </div>
            </div>
          </div>

          {/* Adherence Rate Box */}
          <div className="bg-white dark:bg-dark-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-teal-600" />
              Adherence Metric
            </h3>

            <div className="flex items-center gap-4 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 p-4 rounded-xl">
              <div className="w-14 h-14 rounded-full bg-teal-600 text-white flex items-center justify-center font-black text-lg shrink-0">
                {adherencePercentage}%
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">Today's Compliance</span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 block">{takenCount} of {totalScheduledToday} doses marked taken</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Scheduled</span>
                <span className="text-base font-bold text-slate-900 dark:text-white mt-0.5 block">{totalScheduledToday}</span>
              </div>
              <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block uppercase font-bold">Taken</span>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 block">{takenCount}</span>
              </div>
              <div className="bg-red-50/40 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40">
                <span className="text-[10px] text-red-700 dark:text-red-400 block uppercase font-bold">Missed</span>
                <span className="text-base font-bold text-red-700 dark:text-red-400 mt-0.5 block">{missedCount}</span>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-teal-400">Phase-1 Prototype Controls</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Click "Taken" or "Miss" on any routine to test the real-time adherence transitions.
            </p>
            <Link
              href="/caregiver"
              className="w-full py-2 px-3 text-xs font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-lg transition-all text-center block"
            >
              View in Caregiver Portal
            </Link>
          </div>
        </div>

        {/* Right Column: Time Slots (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-teal-600" />
              <span>Medication Routines & Status</span>
            </h2>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-md font-bold uppercase">
              {todayDoses.length} Active Doses
            </span>
          </div>

          {todayDoses.length === 0 ? (
            <div className="bg-white dark:bg-dark-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900 text-slate-500 flex items-center justify-center mx-auto">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Medications Scheduled</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Add a medication manually or scan a prescription to populate this patient's routine.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Link
                  href="/add-medicine"
                  className="px-4 py-2 border border-transparent text-xs font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-xs"
                >
                  Add Medicine
                </Link>
                <Link
                  href="/upload"
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 shadow-xs"
                >
                  Scan Prescription
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {timeSlots.map((slot) => {
                const slotDoses = todayDoses.filter(d => d.timeSlot === slot.id);
                return (
                  <div key={slot.id} className="bg-white dark:bg-dark-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                    {/* Slot Header */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-150 dark:border-slate-800 px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">{slot.name}</h3>
                        <span className="text-[10px] text-slate-500 font-semibold">({slot.timeRange})</span>
                      </div>
                      <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-bold">
                        {slotDoses.length} Meds
                      </span>
                    </div>

                    {/* Slot Doses */}
                    <div className="p-5">
                      {slotDoses.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No medications scheduled for this time window.</p>
                      ) : (
                        <div className="space-y-3.5">
                          {slotDoses.map((dose) => (
                            <div
                              key={dose.reminderTimeId}
                              className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                dose.status === "taken"
                                  ? "bg-emerald-50/20 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/40"
                                  : dose.status === "missed"
                                  ? "bg-red-50/20 dark:bg-red-950/15 border-red-200 dark:border-red-900/40"
                                  : "bg-white dark:bg-slate-900/30 border-slate-200 dark:border-slate-800"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className="rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 p-2 shrink-0 border border-teal-100 dark:border-teal-900/30">
                                  <Pill className="h-5 w-5" />
                                </div>
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{dose.medicineName}</h4>
                                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">• {dose.dosage}</span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                                    Scheduled Time: <strong className="text-slate-900 dark:text-white">{formatTime12h(dose.exactTime)}</strong>
                                  </p>
                                  {dose.notes && (
                                    <p className="text-[11px] text-slate-600 dark:text-amber-300/90 font-medium italic mt-0.5">
                                      ★ {dose.notes}
                                    </p>
                                  )}
                                  {dose.timestamp && (
                                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                                      Recorded intake at: {formatTime12h(dose.timestamp.split(" ")[1])}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-3 justify-between sm:justify-end">
                                <div>{renderStatusBadge(dose.status)}</div>

                                <div className="flex items-center gap-1.5">
                                  {/* Prototype voice preview */}
                                  <button
                                    onClick={() => triggerVoicePreview(dose.medicineName, dose.dosage, slot.id)}
                                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                                    title="Voice Reminder Preview (Pakhi's TTS evaluation)"
                                  >
                                    <Volume2 className="h-4 w-4 text-teal-600" />
                                  </button>

                                  {dose.status === "pending" ? (
                                    <>
                                      <button
                                        onClick={() => markAsTaken(dose.medicineId, currentDate, slot.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-2xs transition-colors cursor-pointer"
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                        <span>Taken</span>
                                      </button>
                                      <button
                                        onClick={() => markAsMissed(dose.medicineId, currentDate, slot.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 dark:border-red-900/40 transition-colors cursor-pointer"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                        <span>Miss</span>
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      onClick={() => resetLogStatus(dose.medicineId, currentDate, slot.id)}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                      <span>Undo</span>
                                    </button>
                                  )}

                                  <Link
                                    href={`/add-medicine?id=${dose.medicineId}`}
                                    className="p-1.5 text-slate-400 hover:text-teal-600 rounded-lg transition-colors"
                                    title="Edit schedule"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Link>

                                  <button
                                    onClick={() => {
                                      if (confirm(`Remove ${dose.medicineName} from schedule?`)) {
                                        deleteMedicine(dose.medicineId);
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                                    title="Delete medicine"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

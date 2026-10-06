"use client";

import React, { useState, useEffect } from "react";
import { useAppState } from "@/context/AppContext";
import { 
  Users, 
  AlertTriangle, 
  Clock, 
  Activity, 
  ClipboardList, 
  Plus, 
  Trash2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  CheckCircle,
  Sparkles,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

const formatTime12h = (time24: string) => {
  if (!time24 || time24 === "00:00") return "00:00";
  const [hourStr, minStr] = time24.split(":");
  const hour = parseInt(hourStr);
  if (isNaN(hour)) return time24;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minStr || "00"} ${ampm}`;
};

export default function CaregiverDashboard() {
  const { 
    activeProfile,
    medicines, 
    trackingLogs, 
    symptomLogs, 
    updateProfile, 
    addSymptomLog,
    deleteSymptomLog
  } = useAppState();

  const [currentDate] = useState(() => new Date().toISOString().split("T")[0]);
  
  // Caregiver plan form states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editDoctorName, setEditDoctorName] = useState("");
  const [editClinicName, setEditClinicName] = useState("");
  const [editFollowUpDate, setEditFollowUpDate] = useState("");
  const [editCaregiverName, setEditCaregiverName] = useState("");
  const [editLanguage, setEditLanguage] = useState("English");
  const [editRemarks, setEditRemarks] = useState("");
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");

  // Symptom logger form states
  const [symptomNote, setSymptomNote] = useState("");
  const [symptomSeverity, setSymptomSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const openEditModal = () => {
    if (activeProfile) {
      setEditTitle(activeProfile.condition || "");
      setEditInstructions(activeProfile.precautions || "");
      setEditDoctorName(activeProfile.doctorName || "");
      setEditClinicName(activeProfile.clinicName || "");
      setEditFollowUpDate(activeProfile.followUpDate || "");
      setEditCaregiverName(activeProfile.caregiverName || "");
      setEditLanguage(activeProfile.language || "English");
      setEditRemarks(activeProfile.caregiverRemarks || "");
      setIsEditModalOpen(true);
    }
  };

  const handleSaveCarePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;
    updateProfile(activeProfile.id, {
      condition: editTitle,
      precautions: editInstructions,
      doctorName: editDoctorName,
      clinicName: editClinicName,
      followUpDate: editFollowUpDate,
      caregiverName: editCaregiverName,
      language: editLanguage,
      caregiverRemarks: editRemarks,
    });
    setIsEditModalOpen(false);
    setSaveSuccessMessage("Clinical care plan updated successfully!");
    setTimeout(() => {
      setSaveSuccessMessage("");
    }, 3000);
  };

  const handleLogSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptomNote.trim()) return;

    addSymptomLog({
      date: new Date().toISOString().split("T")[0],
      severity: symptomSeverity,
      notes: symptomNote.trim(),
    });

    setSymptomNote("");
  };

  if (!mounted) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4">
        <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 text-teal-600 flex items-center justify-center mx-auto animate-spin">
          <Loader2 className="h-5 w-5" />
        </div>
        <p className="text-xs text-slate-700 font-semibold">Loading Caregiver Dashboard...</p>
      </div>
    );
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
            Please select an existing patient file or register a new one to access the caregiver monitoring dashboard.
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

  // Calculate statistics for the active profile
  let totalScheduled = 0;
  let takenCount = 0;
  let missedCount = 0;
  let pendingCount = 0;
  
  const todayLogs = trackingLogs.filter(log => log.date === currentDate);
  
  interface TimelineEvent {
    id: string;
    medicineName: string;
    dosage: string;
    time: string;
    type: "taken" | "missed" | "pending";
    timestamp?: string;
  }

  const timelineEvents: TimelineEvent[] = [];

  medicines.forEach((med) => {
    if (!med.active) return;
    med.reminderTimes.forEach((rt) => {
      const log = todayLogs.find(l => l.medicineId === med.id && l.timeSlot === rt.timeSlot);
      const status = log ? log.status : "pending";
      
      totalScheduled++;
      if (status === "taken") {
        takenCount++;
        timelineEvents.push({
          id: `${med.id}-${rt.timeSlot}`,
          medicineName: med.name,
          dosage: med.dosage,
          time: rt.time,
          type: "taken",
          timestamp: log?.timestamp,
        });
      } else if (status === "missed") {
        missedCount++;
        timelineEvents.push({
          id: `${med.id}-${rt.timeSlot}`,
          medicineName: med.name,
          dosage: med.dosage,
          time: rt.time,
          type: "missed",
        });
      } else {
        pendingCount++;
        timelineEvents.push({
          id: `${med.id}-${rt.timeSlot}`,
          medicineName: med.name,
          dosage: med.dosage,
          time: rt.time,
          type: "pending",
        });
      }
    });
  });

  // Sort timeline chronologically
  timelineEvents.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const adherenceRate = totalScheduled > 0 
    ? Math.round((takenCount / totalScheduled) * 100) 
    : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full space-y-8 animate-fade-in">
      
      {/* Page Header & Module 3 Badge */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-teal-800 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/40 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-900/40 uppercase tracking-wider">
              Module 3 — UI/UX Prototype
            </span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              Caregiver Portal
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">
            Caregiver Monitoring Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-xs mt-1 font-medium">
            Active Patient: <strong className="text-slate-900 dark:text-white">{activeProfile.name}</strong> (Age {activeProfile.age}, {activeProfile.condition}) • Primary Caregiver: <strong className="text-slate-900 dark:text-white">{activeProfile.caregiverName}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-all"
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Interactive Timeline
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-teal-600" />
            AI Prescription PoC
          </Link>
          <Link
            href="/patients"
            className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-xs"
          >
            Switch Patient
          </Link>
        </div>
      </div>

      {/* Prototype Status Banner */}
      <div className="bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-900/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 text-teal-900 dark:text-teal-200">
          <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0" />
          <div>
            <span className="font-extrabold uppercase tracking-wide text-[10px] block text-teal-700 dark:text-teal-400">Phase-1 Prototype View</span>
            <span>Demonstrates caregiver visibility over daily patient adherence, schedule states, and compliance logs.</span>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase bg-teal-600 text-white px-2.5 py-1 rounded-md shrink-0 text-center">
          Demonstration Mode
        </span>
      </div>

      {/* Missed Doses Alert Panel */}
      {missedCount > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-red-500"></div>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5 animate-bounce" />
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-black text-red-900 dark:text-red-200">Adherence Alert: Missed Medication Recorded</h3>
              <p className="text-xs text-red-800 dark:text-red-300 leading-normal">
                {activeProfile.name} has {missedCount} missed medication dose{missedCount > 1 ? "s" : ""} recorded today. Caregiver oversight advised.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Timeline & Analytics (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Adherence Overview Cards */}
          <div className="bg-white dark:bg-dark-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                <span>Today's Adherence Summary</span>
              </h2>
              <span className="text-xs text-slate-500 font-semibold">
                {new Date(currentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {/* Circular Adherence Metric */}
              <div className="border border-slate-150 dark:border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/30">
                <div className="relative w-22 h-22 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="44" cy="44" r="36" stroke="#e2e8f0" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="8" fill="transparent" />
                    <circle 
                      cx="44" 
                      cy="44" 
                      r="36" 
                      stroke="#0d9488" 
                      className="stroke-teal-600 dark:stroke-teal-400" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray="226.2"
                      strokeDashoffset={226.2 - (226.2 * adherenceRate) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-xl font-black text-slate-900 dark:text-white">{adherenceRate}%</span>
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2">Adherence Rate</h4>
                <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">{takenCount} of {totalScheduled} doses completed</p>
              </div>

              {/* Status Breakdown */}
              <div className="sm:col-span-2 grid grid-cols-3 gap-3">
                <div className="border border-emerald-150 dark:border-emerald-950/40 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300">Taken</span>
                  <div className="my-1">
                    <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{takenCount}</span>
                  </div>
                  <span className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 font-medium">Recorded Taken</span>
                </div>

                <div className="border border-amber-150 dark:border-amber-950/40 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-amber-800 dark:text-amber-300">Pending</span>
                  <div className="my-1">
                    <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{pendingCount}</span>
                  </div>
                  <span className="text-[10px] text-amber-800/80 dark:text-amber-300/80 font-medium">Upcoming Doses</span>
                </div>

                <div className="border border-red-150 dark:border-red-950/40 bg-red-50/40 dark:bg-red-950/20 rounded-xl p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-red-800 dark:text-red-300">Missed</span>
                  <div className="my-1">
                    <span className="text-2xl font-black text-red-700 dark:text-red-400">{missedCount}</span>
                  </div>
                  <span className="text-[10px] text-red-800/80 dark:text-red-300/80 font-medium">Unlogged / Skipped</span>
                </div>
              </div>
            </div>
          </div>

          {/* Medication Timeline with Taken/Pending/Missed Visual States */}
          <div className="bg-white dark:bg-dark-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-600" />
                <span>Today's Medication Timeline & Status</span>
              </h2>
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-md uppercase">
                {timelineEvents.length} Scheduled Doses
              </span>
            </div>

            {timelineEvents.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-6">No scheduled medications found for today.</p>
            ) : (
              <div className="space-y-4">
                {timelineEvents.map((item) => (
                  <div 
                    key={item.id}
                    className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      item.type === "taken"
                        ? "bg-emerald-50/30 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/40"
                        : item.type === "missed"
                        ? "bg-red-50/30 dark:bg-red-950/15 border-red-200 dark:border-red-900/40"
                        : "bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="text-xs font-black text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg w-20 text-center shrink-0 shadow-3xs">
                        {formatTime12h(item.time)}
                      </div>
                      
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.medicineName}</h4>
                          <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">• {item.dosage}</span>
                        </div>
                        {item.timestamp && (
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                            ✓ Recorded intake at {formatTime12h(item.timestamp.split(" ")[1])}
                          </p>
                        )}
                        {item.type === "missed" && (
                          <p className="text-[10px] text-red-700 dark:text-red-400 font-bold">
                            ⚠ Dose window passed without confirmation
                          </p>
                        )}
                        {item.type === "pending" && (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                            Upcoming scheduled routine
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {item.type === "taken" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold text-emerald-800 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          TAKEN
                        </span>
                      )}
                      {item.type === "pending" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold text-amber-800 bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          PENDING
                        </span>
                      )}
                      {item.type === "missed" && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-extrabold text-red-800 bg-red-100 dark:bg-red-950/50 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-lg">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                          MISSED
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Caregiver Symptom & Notes Journal */}
          <div className="bg-white dark:bg-dark-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-teal-600" />
              <span>Caregiver Journal & Symptom Logs</span>
            </h2>

            <form onSubmit={handleLogSymptom} className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Add Patient Observation</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <label htmlFor="sym-note" className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Observation / Note</label>
                  <input
                    type="text"
                    id="sym-note"
                    value={symptomNote}
                    onChange={(e) => setSymptomNote(e.target.value)}
                    placeholder="e.g. Mild afternoon fatigue, BP 128/82 mmHg"
                    className="w-full text-xs font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 focus:outline-hidden focus:border-teal-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="sym-sev" className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">Severity</label>
                  <select
                    id="sym-sev"
                    value={symptomSeverity}
                    onChange={(e) => setSymptomSeverity(e.target.value as any)}
                    className="w-full text-xs font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 focus:outline-hidden focus:border-teal-500"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>
              <div className="text-right">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 py-2 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Log Note</span>
                </button>
              </div>
            </form>

            <div className="space-y-2.5">
              {symptomLogs.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No observation notes recorded yet.</p>
              ) : (
                symptomLogs.map((log) => (
                  <div key={log.id} className="border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl flex items-center justify-between gap-3 bg-white dark:bg-slate-900/30">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md ${
                          log.severity === "severe" ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" :
                          log.severity === "moderate" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" :
                          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                        }`}>
                          {log.severity}
                        </span>
                        <span className="text-[10px] text-slate-500">{log.date}</span>
                      </div>
                      <p className="text-xs text-slate-900 dark:text-slate-200 font-semibold">{log.notes}</p>
                    </div>
                    <button
                      onClick={() => deleteSymptomLog(log.id)}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-lg transition-colors"
                      title="Delete log"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Patient Profile & Care Plan Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-dark-bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Users className="h-5 w-5 text-teal-600" />
                <span>Patient Profile Details</span>
              </h2>
              <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/40 px-2 py-0.5 rounded-md uppercase">
                Active
              </span>
            </div>

            {saveSuccessMessage && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 font-bold rounded-lg flex items-center gap-1.5 animate-pulse">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Patient Name & Demographics</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{activeProfile.name} • {activeProfile.gender}, Age {activeProfile.age}</p>
              </div>

              <div>
                <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Primary Condition / Diagnosis</span>
                <strong className="text-xs text-slate-900 dark:text-white block mt-0.5">{activeProfile.condition}</strong>
              </div>

              <div>
                <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Clinical Instructions & Precautions</span>
                <p className="text-xs text-slate-700 dark:text-slate-300 font-medium mt-0.5 whitespace-pre-line bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  {activeProfile.precautions}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Physician</span>
                  <span className="font-bold text-slate-900 dark:text-white block mt-0.5">{activeProfile.doctorName}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Primary Caregiver</span>
                  <span className="font-bold text-teal-700 dark:text-teal-400 block mt-0.5">{activeProfile.caregiverName}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Follow-Up Date</span>
                  <span className="font-semibold text-slate-900 dark:text-white block mt-0.5">📅 {activeProfile.followUpDate}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Clinic</span>
                  <span className="font-semibold text-slate-900 dark:text-white block mt-0.5 truncate" title={activeProfile.clinicName}>{activeProfile.clinicName}</span>
                </div>
              </div>

              {activeProfile.caregiverRemarks && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Caregiver Remarks</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 italic mt-0.5 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    "{activeProfile.caregiverRemarks}"
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={openEditModal}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all text-center cursor-pointer"
              >
                Edit Clinical Care Plan
              </button>
            </div>
          </div>

          {/* Quick Navigation Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-teal-400">Phase-1 Prototype Actions</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Experience the handwritten prescription parser proof of concept or switch between patient profiles.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/upload"
                className="w-full py-2 px-3 text-xs font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-lg transition-all text-center"
              >
                Launch AI Prescription Scanner
              </Link>
              <Link
                href="/dashboard"
                className="w-full py-2 px-3 text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all text-center border border-slate-700"
              >
                Open Full Schedule Timeline
              </Link>
            </div>
          </div>
        </div>

      </div>

      {/* Edit Care Plan Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-dark-bg-card rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">Edit Patient Care Plan</h3>
                <p className="text-[10px] text-teal-200 font-medium">Update medical directives for {activeProfile.name}</p>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-white hover:text-teal-200 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCarePlan} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="modal-title" className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">Condition / Diagnosis</label>
                  <input
                    type="text"
                    id="modal-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 focus:outline-hidden focus:border-teal-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="modal-cgname" className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">Caregiver Name</label>
                  <input
                    type="text"
                    id="modal-cgname"
                    value={editCaregiverName}
                    onChange={(e) => setEditCaregiverName(e.target.value)}
                    className="w-full text-xs font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 focus:outline-hidden focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="modal-notes" className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">Clinical Instructions / Precautions</label>
                <textarea
                  id="modal-notes"
                  rows={3}
                  value={editInstructions}
                  onChange={(e) => setEditInstructions(e.target.value)}
                  className="w-full text-xs font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 focus:outline-hidden focus:border-teal-500 resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="modal-doc" className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">Assigned Doctor</label>
                  <input
                    type="text"
                    id="modal-doc"
                    value={editDoctorName}
                    onChange={(e) => setEditDoctorName(e.target.value)}
                    className="w-full text-xs font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 focus:outline-hidden focus:border-teal-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="modal-clinic" className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">Clinic Name</label>
                  <input
                    type="text"
                    id="modal-clinic"
                    value={editClinicName}
                    onChange={(e) => setEditClinicName(e.target.value)}
                    className="w-full text-xs font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 focus:outline-hidden focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="modal-fdate" className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">Follow-Up Date</label>
                  <input
                    type="date"
                    id="modal-fdate"
                    value={editFollowUpDate}
                    onChange={(e) => setEditFollowUpDate(e.target.value)}
                    className="w-full text-xs font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 focus:outline-hidden focus:border-teal-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="modal-lang" className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">Preferred Language</label>
                  <input
                    type="text"
                    id="modal-lang"
                    value={editLanguage}
                    onChange={(e) => setEditLanguage(e.target.value)}
                    className="w-full text-xs font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 focus:outline-hidden focus:border-teal-500"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="modal-rem" className="block text-[10px] font-extrabold text-slate-600 dark:text-slate-400 uppercase">Caregiver Remarks</label>
                <textarea
                  id="modal-rem"
                  rows={2}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  className="w-full text-xs font-medium text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-950 focus:outline-hidden focus:border-teal-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all"
                >
                  Save Care Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

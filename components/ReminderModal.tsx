"use client";

import React from "react";
import { useAppState, ActiveReminder, ReminderHistoryItem, generateUniqueId } from "@/context/AppContext";
import { Pill, Check, Clock, AlertCircle, BellRing } from "lucide-react";
import { formatTime12h, getLanguageCode, getLocalizedFeedback, speakTextWithVoice } from "./ReminderEngine";

export default function ReminderModal() {
  const {
    activeProfile,
    activeReminders,
    isFastDemoMode,
    setActiveReminders,
    setReminderHistory,
    setLastReminderTriggered,
    markAsTaken
  } = useAppState();

  // Find reminders that are actively due and need popup overlay
  const dueReminders = activeReminders.filter(r => r.status === "active");

  if (dueReminders.length === 0 || !activeProfile) return null;

  // Handle Dose Taken
  const handleTaken = (reminder: ActiveReminder) => {
    // 1. Log taken in AppContext trackingLogs
    markAsTaken(reminder.medicineId, reminder.date, reminder.timeSlot);

    // 2. Play feedback sound
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const feedbackText = getLocalizedFeedback(activeProfile?.language, activeProfile.name, "taken");
      const targetLangCode = getLanguageCode(activeProfile?.language);
      speakTextWithVoice(feedbackText, targetLangCode, activeProfile?.language, 0.85);
    }

    // 3. Add to history
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const historyItem: ReminderHistoryItem = {
      id: generateUniqueId("hist"),
      medicineId: reminder.medicineId,
      medicineName: reminder.medicineName,
      dosage: reminder.dosage,
      timeSlot: reminder.timeSlot,
      scheduledTime: reminder.scheduledTime,
      timestamp: currentHHMM,
      date: reminder.date,
      status: "taken"
    };
    setReminderHistory(prev => [historyItem, ...prev]);
    setLastReminderTriggered(historyItem);

    // 4. Remove from active reminders list (closes popup)
    setActiveReminders(prev => prev.filter(r => r.id !== reminder.id));
  };

  // Handle Snooze (Remind Again)
  const handleSnooze = (reminder: ActiveReminder) => {
    const nextInterval = isFastDemoMode ? 1 * 60 * 1000 : 5 * 60 * 1000;
    
    // Play voice feedback
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const feedbackText = getLocalizedFeedback(activeProfile?.language, activeProfile.name, "snoozed", isFastDemoMode);
      const targetLangCode = getLanguageCode(activeProfile?.language);
      speakTextWithVoice(feedbackText, targetLangCode, activeProfile?.language, 0.85);
    }

    // Log snooze in history
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const historyItem: ReminderHistoryItem = {
      id: generateUniqueId("hist"),
      medicineId: reminder.medicineId,
      medicineName: reminder.medicineName,
      dosage: reminder.dosage,
      timeSlot: reminder.timeSlot,
      scheduledTime: reminder.scheduledTime,
      timestamp: currentHHMM,
      date: reminder.date,
      status: "snoozed"
    };
    setReminderHistory(prev => [historyItem, ...prev]);
    setLastReminderTriggered(historyItem);

    // Update reminder status to "snoozed" and set next trigger time
    setActiveReminders(prev =>
      prev.map(r =>
        r.id === reminder.id
          ? {
              ...r,
              status: "snoozed",
              lastTriggeredTime: Date.now(),
              nextTriggerTime: Date.now() + nextInterval
            }
          : r
      )
    );
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fade-in print:hidden">
      <div className="w-full max-w-lg bg-white dark:bg-dark-bg-card rounded-3xl border border-red-100 dark:border-slate-800 shadow-2xl overflow-hidden relative animate-scale-up border-t-8 border-t-teal-600 transition-colors duration-200">
        
        {/* Ringing Bell Banner */}
        <div className="bg-red-50/50 dark:bg-red-950/10 p-6 flex flex-col items-center justify-center text-center border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-red-100/60 dark:bg-red-950/30 text-red-650 flex items-center justify-center border border-red-200 dark:border-red-900/40 shadow-xs mb-3 animate-[bounce_1.5s_infinite]">
            <BellRing className="h-8 w-8 text-red-650 animate-pulse" />
          </div>
          <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 font-black px-3 py-1 rounded-full uppercase tracking-widest">
            Medication Due Now
          </span>
          <h2 className="text-xl font-black text-slate-800 dark:text-dark-text-primary mt-3">
            Hello {activeProfile.name}, it's time for your medicine!
          </h2>
          <p className="text-slate-800 dark:text-dark-text-secondary text-xs mt-1">
            Please take your dose as prescribed. Spoken caregiver cues are active.
          </p>
        </div>

        {/* List of Due Medicines */}
        <div className="p-6 space-y-4 max-h-[300px] overflow-y-auto">
          {dueReminders.map(reminder => (
            <div key={reminder.id} className="bg-slate-50 dark:bg-dark-bg-secondary border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 p-2.5 shrink-0 border border-teal-100 dark:border-teal-900/60 shadow-2xs">
                  <Pill className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 dark:text-dark-text-primary leading-tight">
                    {reminder.medicineName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-700 dark:text-dark-text-secondary font-semibold">
                    <span>Dosage: <strong className="text-slate-700 dark:text-dark-text-secondary">{reminder.dosage}</strong></span>
                    <span>•</span>
                    <span className="capitalize">Routine: <strong className="text-slate-700 dark:text-dark-text-secondary">{reminder.timeSlot}</strong></span>
                    <span>•</span>
                    <span>Time: <strong className="text-slate-700 dark:text-dark-text-secondary">{formatTime12h(reminder.scheduledTime)}</strong></span>
                  </div>
                  {reminder.notes && (
                    <p className="text-xs text-slate-750 dark:text-amber-300 italic bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-2 rounded-lg mt-2 flex items-start gap-1">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span><strong>Special Note:</strong> {reminder.notes}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons for Each Medicine */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                <button
                  onClick={() => handleTaken(reminder)}
                  className="flex-1 py-3 px-4 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                >
                  <Check className="h-4.5 w-4.5" />
                  <span>I Have Taken It</span>
                </button>
                <button
                  onClick={() => handleSnooze(reminder)}
                  className="py-3 px-4 text-sm font-bold text-slate-700 dark:text-dark-text-secondary bg-amber-550/10 dark:bg-amber-950/20 hover:bg-amber-500/20 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 rounded-xl transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                >
                  <Clock className="h-4.5 w-4.5 text-amber-700 dark:text-amber-400" />
                  <span>Remind Me in {isFastDemoMode ? "1 Min" : "5 Mins"}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer Info */}
        <div className="bg-slate-50 dark:bg-dark-bg-secondary px-6 py-4 border-t border-slate-100 dark:border-slate-850 text-center">
          <p className="text-[10px] text-slate-700 dark:text-dark-text-secondary font-bold tracking-wider uppercase">
            Phase-1 Prototype Preview • Adherence logs update in Caregiver Dashboard in real time
          </p>
        </div>

      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useAppState, ActiveReminder, ReminderHistoryItem, generateUniqueId } from "@/context/AppContext";
import { BellRing, Check, Clock } from "lucide-react";
import { getLanguageCode, getLocalizedFeedback, speakTextWithVoice } from "./ReminderEngine";
import { formatTime12h } from "@/lib/format";
import Dialog from "@/components/ui/Dialog";
import Notice from "@/components/ui/Notice";
import { buttonClass } from "@/components/ui/styles";

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

  // Handle Dose Taken
  const handleTaken = (reminder: ActiveReminder) => {
    if (!activeProfile) return;
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
    if (!activeProfile) return;
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
    <Dialog
      open={dueReminders.length > 0 && !!activeProfile}
      role="alertdialog"
      title="Time for your medicine"
      description={activeProfile ? `${activeProfile.name}, please take the medicine below.` : undefined}
      className="print:hidden"
    >
      {activeProfile && dueReminders.length > 0 && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <BellRing aria-hidden="true" className="size-5 text-primary-text" />
            Due now
          </h3>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {dueReminders.map((reminder, index) => (
              <div key={reminder.id} className="space-y-4 rounded-xl border border-border bg-surface-muted p-4">
                <div className="space-y-1">
                  <h4 className="text-2xl font-bold">{reminder.medicineName}</h4>
                  <p className="text-lg">{reminder.dosage}</p>
                  <p className="text-lg text-fg-muted">Scheduled for {formatTime12h(reminder.scheduledTime)}</p>
                </div>

                {reminder.notes && (
                  <Notice tone="warning" title="Note">
                    {reminder.notes}
                  </Notice>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    autoFocus={index === 0}
                    onClick={() => handleTaken(reminder)}
                    className={`${buttonClass("primary", "lg")} w-full`}
                  >
                    <Check aria-hidden="true" className="size-6" />
                    I have taken it
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSnooze(reminder)}
                    className={`${buttonClass("secondary", "lg")} w-full`}
                  >
                    <Clock aria-hidden="true" className="size-6" />
                    Remind me in {isFastDemoMode ? "1 minute" : "5 minutes"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}

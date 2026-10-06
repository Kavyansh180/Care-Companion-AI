"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState, ReminderTime, generateUniqueId } from "@/context/AppContext";
import { Pill, Clock, ClipboardList, CheckCircle, ArrowLeft, Plus, Trash2, Edit2 } from "lucide-react";
import Link from "next/link";
import { formatTime12h } from "@/components/ReminderEngine";

// Default times for helper
const defaultTimes: Record<string, string> = {
  morning: "08:00",
  afternoon: "13:00",
  evening: "17:00",
  night: "20:30"
};

function AddMedicineForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id") || searchParams.get("edit");
  
  const { activeProfile, addMedicine, updateMedicine, allMedicines } = useAppState();
  const medicineToEdit = allMedicines.find(m => m.id === editId);

  // Form states
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Daily");
  const [duration, setDuration] = useState("30");
  const [notes, setNotes] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  // New Reminder Scheduling list state
  const [reminderTimesList, setReminderTimesList] = useState<ReminderTime[]>([]);
  const [slotInput, setSlotInput] = useState<"morning" | "afternoon" | "evening" | "night">("morning");
  const [timeInput, setTimeInput] = useState("08:00");
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

  // Populate form if in edit mode
  useEffect(() => {
    if (medicineToEdit) {
      setName(medicineToEdit.name);
      setDosage(medicineToEdit.dosage);
      setFrequency(medicineToEdit.frequency);
      setDuration(String(medicineToEdit.duration));
      setNotes(medicineToEdit.notes);
      if (medicineToEdit.reminderTimes && medicineToEdit.reminderTimes.length > 0) {
        setReminderTimesList(medicineToEdit.reminderTimes);
      } else {
        // Fallback migration for older entries
        const mapped = medicineToEdit.timeOfDay.map((slot) => ({
          id: generateUniqueId("rt"),
          timeSlot: slot as any,
          time: medicineToEdit.exactTime || defaultTimes[slot as keyof typeof defaultTimes] || "08:00"
        }));
        setReminderTimesList(mapped);
      }
    } else {
      // Default initial schedule for new medicines
      setReminderTimesList([
        { id: generateUniqueId("rt"), timeSlot: "morning", time: "08:00" }
      ]);
    }
  }, [medicineToEdit]);

  if (!activeProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 animate-pulse shadow-sm">
          <Clock className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800">No Patient Profile Loaded</h2>
          <p className="text-slate-800 text-sm leading-relaxed">
            Please select an existing patient file or register a new one to log prescriptions.
          </p>
        </div>
        <Link
          href="/patients"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-md transition-all"
        >
          Go to Patients Portal
        </Link>
      </div>
    );
  }

  // Adjust time input automatically when routine slot changes
  const handleSlotChange = (slot: "morning" | "afternoon" | "evening" | "night") => {
    setSlotInput(slot);
    setTimeInput(defaultTimes[slot]);
  };

  // Add / Update reminder time list
  const handleSaveReminderTime = () => {
    setError("");
    if (editingReminderId) {
      setReminderTimesList(prev =>
        prev.map(item =>
          item.id === editingReminderId
            ? { ...item, timeSlot: slotInput, time: timeInput }
            : item
        )
      );
      setEditingReminderId(null);
    } else {
      // Prevent duplicates of the same slot
      const isDuplicate = reminderTimesList.some(r => r.timeSlot === slotInput);
      if (isDuplicate) {
        setError(`A reminder time for the ${slotInput} routine is already added. Please edit or delete it instead.`);
        return;
      }

      const newItem: ReminderTime = {
        id: generateUniqueId("rt"),
        timeSlot: slotInput,
        time: timeInput
      };
      setReminderTimesList(prev => [...prev, newItem]);
    }
  };

  const handleEditReminderTime = (item: ReminderTime) => {
    setSlotInput(item.timeSlot);
    setTimeInput(item.time);
    setEditingReminderId(item.id);
  };

  const handleDeleteReminderTime = (id: string) => {
    setReminderTimesList(prev => prev.filter(r => r.id !== id));
    if (editingReminderId === id) {
      setEditingReminderId(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter the medicine name.");
      return;
    }
    if (!dosage.trim()) {
      setError("Please enter the dosage (e.g., 5mg, 1 tablet).");
      return;
    }
    if (reminderTimesList.length === 0) {
      setError("Please add at least one reminder time to the schedule.");
      return;
    }

    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      setError("Please enter a valid duration (number of days).");
      return;
    }

    // Format legacy structures for backward compatibility
    const timeOfDay = Array.from(new Set(reminderTimesList.map(r => r.timeSlot)));
    const sortedList = [...reminderTimesList].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    const exactTime = sortedList.length > 0 ? sortedList[0].time : "08:00";

    const medData = {
      name: name.trim(),
      dosage: dosage.trim(),
      frequency,
      timeOfDay,
      exactTime,
      reminderTimes: reminderTimesList,
      duration: durationNum,
      notes: notes.trim(),
    };

    if (medicineToEdit) {
      updateMedicine(medicineToEdit.id, medData);
    } else {
      addMedicine({
        ...medData,
        startDate: new Date().toISOString().split("T")[0],
      });
    }

    setIsSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full animate-fade-in">
      {/* Back button */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-dark-bg-card rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden">
        {/* Form header */}
        <div className="bg-gradient-to-r from-teal-650 to-teal-800 text-white p-6 flex items-center gap-4">
          <div className="rounded-xl bg-white/10 p-3">
            <Pill className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black">{medicineToEdit ? "Edit Patient Medication" : "Log Medication Details"}</h1>
            <p className="text-xs text-teal-100 dark:text-teal-200 mt-0.5">
              {medicineToEdit ? `Modify details for ${medicineToEdit.name}` : "Configure daily prescription routines and automatic voices."}
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-sm text-red-750 dark:text-red-400 font-semibold">
              ⚠️ {error}
            </div>
          )}

          {isSuccess && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-sm text-emerald-800 dark:text-emerald-400 flex items-center gap-2 font-bold animate-pulse">
              <CheckCircle className="h-5 w-5 text-emerald-650 shrink-0" />
              <span>Medication saved successfully! Returning to Patient Dashboard...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Medicine Name */}
              <div className="space-y-2">
                <label htmlFor="med-name" className="block text-sm font-bold text-slate-700 dark:text-dark-text-primary">
                  Medication Name
                </label>
                <input
                  type="text"
                  id="med-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Amlodipine, Metformin"
                  className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-bg-secondary px-3 py-2.5 text-slate-800 dark:text-white placeholder-slate-600 dark:placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden text-base"
                  required
                />
                <p className="text-xs text-slate-700 dark:text-dark-text-secondary">Include brand name or chemical identifier.</p>
              </div>

              {/* Dosage */}
              <div className="space-y-2">
                <label htmlFor="med-dosage" className="block text-sm font-bold text-slate-700 dark:text-dark-text-primary">
                  Dosage
                </label>
                <input
                  type="text"
                  id="med-dosage"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g. 5mg, 1 tablet, 10ml"
                  className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-bg-secondary px-3 py-2.5 text-slate-800 dark:text-white placeholder-slate-600 dark:placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden text-base"
                  required
                />
                <p className="text-xs text-slate-700 dark:text-dark-text-secondary">Specify weight or quantity to take per slot.</p>
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <label htmlFor="med-frequency" className="block text-sm font-bold text-slate-700 dark:text-dark-text-primary">
                  Frequency
                </label>
                <select
                  id="med-frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-bg-secondary px-3 py-2.5 text-slate-800 dark:text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden text-base"
                >
                  <option value="Daily">Daily</option>
                  <option value="Twice Daily">Twice Daily</option>
                  <option value="Three Times Daily">Three Times Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="As Needed (PRN)">As Needed (PRN)</option>
                </select>
                <p className="text-xs text-slate-700 dark:text-dark-text-secondary">How regularly this medicine is scheduled.</p>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label htmlFor="med-duration" className="block text-sm font-bold text-slate-700 dark:text-dark-text-primary">
                  Duration (Days)
                </label>
                <input
                  type="number"
                  id="med-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 30, 90"
                  className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-bg-secondary px-3 py-2.5 text-slate-800 dark:text-white placeholder-slate-600 dark:placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden text-base"
                  min="1"
                  required
                />
                <p className="text-xs text-slate-700 dark:text-dark-text-secondary">Total days before prescription refilling.</p>
              </div>
            </div>

            {/* Advanced Multi-Time Scheduling Subform */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-slate-50/50 dark:bg-dark-bg-secondary space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-dark-text-primary flex items-center gap-1.5">
                  <Clock className="h-5.5 w-5.5 text-teal-650 dark:text-teal-400" />
                  Configure Scheduled Reminder Times
                </h3>
                <p className="text-[11px] text-slate-700 dark:text-dark-text-secondary mt-0.5">
                  Add multiple routine slots with their exact trigger times. Voice cues announce at these moments.
                </p>
              </div>

              {/* Input row */}
              <div className="flex flex-col sm:flex-row gap-4 items-end bg-white dark:bg-dark-bg-card border border-slate-250 dark:border-slate-700 p-4 rounded-xl shadow-2xs">
                <div className="flex-1 space-y-1.5 w-full">
                  <label className="block text-xs font-bold text-slate-700 dark:text-dark-text-muted uppercase">Routine Slot</label>
                  <select
                    value={slotInput}
                    onChange={(e) => handleSlotChange(e.target.value as any)}
                    className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-bg-secondary px-3 py-2 text-slate-800 dark:text-white focus:outline-hidden text-sm"
                  >
                    <option value="morning">Morning (Breakfast)</option>
                    <option value="afternoon">Afternoon (Lunch)</option>
                    <option value="evening">Evening (Snack)</option>
                    <option value="night">Night (Dinner/Bedtime)</option>
                  </select>
                </div>
                
                <div className="flex-1 space-y-1.5 w-full">
                  <label className="block text-xs font-bold text-slate-700 dark:text-dark-text-muted uppercase">Exact Reminder Time</label>
                  <input
                    type="time"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-bg-secondary px-3 py-1.5 text-slate-800 dark:text-white focus:outline-hidden text-sm"
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveReminderTime}
                  className="w-full sm:w-auto py-2 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center justify-center gap-1 shadow-xs transition-colors shrink-0 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{editingReminderId ? "Update Scheduled Time" : "Add Reminder Time"}</span>
                </button>
              </div>

              {/* Added times list */}
              <div className="space-y-2">
                <span className="block text-xs font-bold text-slate-800 dark:text-dark-text-primary uppercase tracking-wider">Active Reminder Schedule</span>
                {reminderTimesList.length === 0 ? (
                  <p className="text-xs text-slate-700 dark:text-dark-text-secondary italic py-2">No reminder times added yet. Add at least one schedule above.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {reminderTimesList.map(item => (
                      <div key={item.id} className="bg-white dark:bg-dark-bg-card border border-slate-200/80 dark:border-slate-700 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/30 px-2 py-0.5 rounded-md tracking-wider">
                            {item.timeSlot}
                          </span>
                          <strong className="text-sm text-slate-800 dark:text-dark-text-primary block pt-1">
                            {formatTime12h(item.time)}
                          </strong>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditReminderTime(item)}
                            className="p-1 text-slate-700 dark:text-dark-text-secondary hover:text-teal-650 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20 rounded-lg transition-colors cursor-pointer"
                            title="Edit schedule time"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReminderTime(item.id)}
                            className="p-1 text-slate-700 dark:text-dark-text-secondary hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors cursor-pointer"
                            title="Delete schedule time"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Special Instructions/Notes */}
            <div className="space-y-2 pt-2">
              <label htmlFor="med-notes" className="block text-sm font-bold text-slate-700 dark:text-dark-text-primary flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Clinical Notes / Special Instructions
              </label>
              <input
                type="text"
                id="med-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Take with water, avoid dairy, take 30 mins before breakfast"
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-dark-bg-secondary px-3 py-2.5 text-slate-800 dark:text-white placeholder-slate-600 dark:placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-hidden text-base"
              />
              <p className="text-xs text-slate-700 dark:text-dark-text-secondary">Add dietary guidelines, precautions, or warnings.</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSuccess}
                className="flex-1 py-3.5 px-6 text-base font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-center cursor-pointer"
              >
                {medicineToEdit ? "Update Medication Details" : "Save Medication"}
              </button>
              <Link
                href="/dashboard"
                className="py-3.5 px-6 border border-slate-200 dark:border-slate-700 text-base font-bold text-slate-800 dark:text-dark-text-secondary bg-white dark:bg-dark-bg-secondary hover:bg-slate-50 dark:hover:bg-dark-bg-elevated rounded-xl transition-all text-center cursor-pointer"
              >
                Cancel
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default function AddMedicinePage() {
  return (
    <Suspense fallback={<div className="max-w-xl mx-auto py-24 text-center">Loading Medication Form...</div>}>
      <AddMedicineForm />
    </Suspense>
  );
}

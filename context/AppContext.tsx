"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { localDateString } from "@/lib/dates";

/**
 * Phase-1 Review 2 Core Models (UI Prototype Layer)
 * Aligned with Database Design Entities:
 * 1. PatientProfile
 * 2. MedicationSchedule (Medicine)
 * 3. AdherenceLog (TrackingLog)
 */

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  condition: string; // Medical Condition / Diagnosis
  caregiverName: string; // Primary Caregiver Name
  language: string; // Preferred Language for Reminders
  reminderStyle?: "voice" | "popup" | "both";
  doctorName: string;
  clinicName: string;
  precautions: string;
  followUpDate: string;
  caregiverRemarks?: string;
}

export interface ReminderTime {
  id: string;
  timeSlot: "morning" | "afternoon" | "evening" | "night";
  time: string; // e.g. "08:00" (24h format)
}

export interface Medicine {
  id: string;
  patientId: string; // Foreign key link to PatientProfile
  name: string;
  dosage: string;
  frequency: string;
  timeOfDay: string[]; // ["morning", "afternoon", "evening", "night"]
  exactTime: string; // e.g. "08:00"
  reminderTimes: ReminderTime[];
  duration: number; // in days
  startDate: string; // YYYY-MM-DD
  notes: string;
  active: boolean;
  originalOcrData?: {
    name?: string;
    dosage?: string;
    exactTime?: string;
    duration?: number;
    notes?: string;
  };
}

export interface TrackingLog {
  id: string;
  patientId: string; // Foreign key link to PatientProfile
  date: string; // YYYY-MM-DD
  medicineId: string; // Foreign key link to Medicine
  timeSlot: string; // "morning" | "afternoon" | "evening" | "night"
  status: "taken" | "missed" | "pending";
  timestamp?: string; // e.g. "2026-06-18 08:15"
}

export interface SymptomLog {
  id: string;
  patientId: string;
  date: string;
  severity: "mild" | "moderate" | "severe";
  notes: string;
}

export interface ActiveReminder {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  timeSlot: "morning" | "afternoon" | "evening" | "night";
  scheduledTime: string; // "HH:MM"
  date: string; // "YYYY-MM-DD"
  triggerCount: number;
  lastTriggeredTime: number;
  nextTriggerTime: number;
  status: "active" | "snoozed" | "taken" | "missed";
  notes?: string;
  isDemo?: boolean;
}

export interface ReminderHistoryItem {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  timeSlot: string;
  scheduledTime: string;
  timestamp: string;
  date: string;
  status: "triggered" | "snoozed" | "taken" | "missed";
}

export interface CaregiverAlert {
  id: string;
  patientId: string;
  message: string;
  timestamp: string;
  date: string;
  medicineId: string;
  exactTime: string;
}

interface AppContextType {
  profiles: PatientProfile[];
  activeProfileId: string | null;
  activeProfile: PatientProfile | null;
  medicines: Medicine[]; // Filtered by activeProfileId
  allMedicines: Medicine[]; // Full list
  trackingLogs: TrackingLog[]; // Filtered by activeProfileId
  allTrackingLogs: TrackingLog[]; // Full list
  symptomLogs: SymptomLog[]; // Filtered by activeProfileId
  allSymptomLogs: SymptomLog[]; // Full list

  // Theme Scheme
  theme: "light" | "dark";
  toggleTheme: () => void;

  // Prototype Reminder States
  activeReminders: ActiveReminder[];
  reminderHistory: ReminderHistoryItem[];
  caregiverAlerts: CaregiverAlert[];
  isFastDemoMode: boolean;
  voiceReminderStatus: string;
  lastReminderTriggered: ReminderHistoryItem | null;

  // Actions
  addMedicine: (medicine: Omit<Medicine, "id" | "active" | "patientId" | "reminderTimes"> & { reminderTimes?: ReminderTime[] }) => void;
  addMedicines: (medicines: (Omit<Medicine, "id" | "active" | "patientId" | "reminderTimes"> & { reminderTimes?: ReminderTime[] })[]) => void;
  updateMedicine: (id: string, updated: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  markAsTaken: (medicineId: string, date: string, timeSlot: string) => void;
  markAsMissed: (medicineId: string, date: string, timeSlot: string) => void;
  resetLogStatus: (medicineId: string, date: string, timeSlot: string) => void;
  addSymptomLog: (log: Omit<SymptomLog, "id" | "patientId">) => void;
  deleteSymptomLog: (id: string) => void;
  selectProfile: (id: string) => void;
  createProfile: (profile: Omit<PatientProfile, "id">) => void;
  updateProfile: (id: string, updated: Partial<PatientProfile>) => void;
  deleteProfile: (id: string) => void;

  // Prototype Reminder Setters
  setActiveReminders: React.Dispatch<React.SetStateAction<ActiveReminder[]>>;
  setReminderHistory: React.Dispatch<React.SetStateAction<ReminderHistoryItem[]>>;
  setCaregiverAlerts: React.Dispatch<React.SetStateAction<CaregiverAlert[]>>;
  setIsFastDemoMode: (enabled: boolean) => void;
  setVoiceReminderStatus: (status: string) => void;
  setLastReminderTriggered: (item: ReminderHistoryItem | null) => void;
  clearAlertsForPatient: (patientId: string) => void;
}

// Truly unique ID generator with fallback
export const generateUniqueId = (prefix: string = "") => {
  let uuid = "";
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    uuid = window.crypto.randomUUID();
  } else {
    const randomStr1 = Math.random().toString(36).substring(2, 11);
    const randomStr2 = Math.random().toString(36).substring(2, 11);
    const timestamp = Date.now();
    uuid = `${timestamp}-${randomStr1}-${randomStr2}`;
  }
  return prefix ? `${prefix}-${uuid}` : uuid;
};

// Seed Patient Profiles — Aligned with Review 2 Presentation
const defaultProfiles: PatientProfile[] = [
  {
    id: "profile-ramesh",
    name: "Mr. Ramesh",
    age: 72,
    gender: "Male",
    condition: "Hypertension & Cardiovascular Health",
    caregiverName: "Anil",
    language: "English",
    reminderStyle: "both",
    doctorName: "Dr. Sarah Alcott",
    clinicName: "Metro Health Cardiology Clinic",
    precautions: "Maintain low sodium diet, avoid refined sugars, and check blood pressure daily.",
    followUpDate: "2026-07-15",
    caregiverRemarks: "Compliant with morning medications. Family monitoring in place.",
  },
  {
    id: "profile-kamla",
    name: "Mrs. Kamla",
    age: 68,
    gender: "Female",
    condition: "Type-2 Diabetes Mellitus",
    caregiverName: "Priya",
    language: "English",
    reminderStyle: "both",
    doctorName: "Dr. Keith Miller",
    clinicName: "Endocrinology Care Center",
    precautions: "Check blood glucose twice daily. Avoid high glycemic foods.",
    followUpDate: "2026-07-20",
    caregiverRemarks: "Checking glucose regularly before meals.",
  }
];

// Seed Medicines — Matching Review 2 PPT (Telmisartan 40mg Morning, Amlodipine 5mg Night)
const defaultMedicines: Medicine[] = [
  // Mr. Ramesh medicines (Phase-1 Review 2 primary demo)
  {
    id: "med-1",
    patientId: "profile-ramesh",
    name: "Telmisartan",
    dosage: "40 mg",
    frequency: "Daily",
    timeOfDay: ["morning"],
    exactTime: "08:00",
    reminderTimes: [
      { id: "rt-med-1-morning", timeSlot: "morning", time: "08:00" }
    ],
    duration: 30,
    startDate: "2026-06-15",
    notes: "Take 1 tablet in morning after breakfast",
    active: true,
    originalOcrData: {
      name: "Telmisartan",
      dosage: "40 mg",
      exactTime: "08:00",
      duration: 30,
      notes: "Take 1 tablet in morning after breakfast"
    }
  },
  {
    id: "med-2",
    patientId: "profile-ramesh",
    name: "Amlodipine",
    dosage: "5 mg",
    frequency: "Daily",
    timeOfDay: ["night"],
    exactTime: "21:00",
    reminderTimes: [
      { id: "rt-med-2-night", timeSlot: "night", time: "21:00" }
    ],
    duration: 30,
    startDate: "2026-06-15",
    notes: "Take 1 tablet at night before bedtime",
    active: true,
    originalOcrData: {
      name: "Amlodipine",
      dosage: "5 mg",
      exactTime: "21:00",
      duration: 30,
      notes: "Take 1 tablet at night before bedtime"
    }
  },
  {
    id: "med-3",
    patientId: "profile-ramesh",
    name: "Metformin",
    dosage: "500 mg",
    frequency: "Daily",
    timeOfDay: ["afternoon"],
    exactTime: "13:00",
    reminderTimes: [
      { id: "rt-med-3-afternoon", timeSlot: "afternoon", time: "13:00" }
    ],
    duration: 60,
    startDate: "2026-06-15",
    notes: "Take with lunch",
    active: true,
    originalOcrData: {
      name: "Metformin",
      dosage: "500 mg",
      exactTime: "13:00",
      duration: 60,
      notes: "Take with lunch"
    }
  },
  // Mrs. Kamla medicines
  {
    id: "med-4",
    patientId: "profile-kamla",
    name: "Glipizide",
    dosage: "5 mg",
    frequency: "Daily",
    timeOfDay: ["morning"],
    exactTime: "07:30",
    reminderTimes: [
      { id: "rt-med-4-morning", timeSlot: "morning", time: "07:30" }
    ],
    duration: 30,
    startDate: "2026-06-16",
    notes: "Take 30 mins before breakfast",
    active: true,
  },
  {
    id: "med-5",
    patientId: "profile-kamla",
    name: "Atorvastatin",
    dosage: "20 mg",
    frequency: "Daily",
    timeOfDay: ["night"],
    exactTime: "21:00",
    reminderTimes: [
      { id: "rt-med-5-night", timeSlot: "night", time: "21:00" }
    ],
    duration: 60,
    startDate: "2026-06-16",
    notes: "Take before bedtime",
    active: true,
  }
];

// Seed tracking logs demonstrating all 3 states: Taken, Pending, Missed
const defaultLogs: TrackingLog[] = [
  {
    id: "log-1",
    patientId: "profile-ramesh",
    date: localDateString(),
    medicineId: "med-1",
    timeSlot: "morning",
    status: "taken",
    timestamp: `${localDateString()} 08:15`,
  },
  {
    id: "log-2",
    patientId: "profile-ramesh",
    date: localDateString(),
    medicineId: "med-2",
    timeSlot: "night",
    status: "pending",
  },
  {
    id: "log-3",
    patientId: "profile-ramesh",
    date: localDateString(),
    medicineId: "med-3",
    timeSlot: "afternoon",
    status: "missed",
  },
  {
    id: "log-4",
    patientId: "profile-kamla",
    date: localDateString(),
    medicineId: "med-4",
    timeSlot: "morning",
    status: "taken",
    timestamp: `${localDateString()} 07:45`,
  },
  {
    id: "log-5",
    patientId: "profile-kamla",
    date: localDateString(),
    medicineId: "med-5",
    timeSlot: "night",
    status: "pending",
  }
];

const defaultSymptomLogs: SymptomLog[] = [
  {
    id: "sym-1",
    patientId: "profile-ramesh",
    date: localDateString(),
    severity: "mild",
    notes: "Slight tiredness in the afternoon. Blood pressure normal at 128/82.",
  },
  {
    id: "sym-2",
    patientId: "profile-kamla",
    date: localDateString(),
    severity: "mild",
    notes: "Post-lunch blood sugar normal.",
  }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<PatientProfile[]>(defaultProfiles);
  const [activeProfileId, setActiveProfileId] = useState<string | null>("profile-ramesh");
  const [allMedicines, setAllMedicines] = useState<Medicine[]>(defaultMedicines);
  const [allTrackingLogs, setAllTrackingLogs] = useState<TrackingLog[]>(defaultLogs);
  const [allSymptomLogs, setAllSymptomLogs] = useState<SymptomLog[]>(defaultSymptomLogs);

  // Prototype Reminder States
  const [activeReminders, setActiveReminders] = useState<ActiveReminder[]>([]);
  const [reminderHistory, setReminderHistory] = useState<ReminderHistoryItem[]>([]);
  const [caregiverAlerts, setCaregiverAlerts] = useState<CaregiverAlert[]>([]);
  const [isFastDemoMode, setIsFastDemoMode] = useState<boolean>(true);
  const [voiceReminderStatus, setVoiceReminderStatus] = useState<string>("Active • Prototype Voice Engine Ready");
  const [lastReminderTriggered, setLastReminderTriggered] = useState<ReminderHistoryItem | null>(null);

  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  // Load from LocalStorage (Prototype state persistence)
  useEffect(() => {
    try {
      const storedTheme = localStorage.getItem("cc_theme") as "light" | "dark" | null;
      if (storedTheme) {
        setTheme(storedTheme);
        if (storedTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }

      const storedProfiles = localStorage.getItem("cc_profiles");
      const storedActiveId = localStorage.getItem("cc_activeProfileId");
      const storedMeds = localStorage.getItem("cc_allMedicines");
      const storedLogs = localStorage.getItem("cc_allTrackingLogs");
      const storedSymptoms = localStorage.getItem("cc_allSymptomLogs");

      if (storedProfiles) setProfiles(JSON.parse(storedProfiles));
      if (storedActiveId) setActiveProfileId(JSON.parse(storedActiveId));
      if (storedMeds) setAllMedicines(JSON.parse(storedMeds));
      if (storedLogs) setAllTrackingLogs(JSON.parse(storedLogs));
      if (storedSymptoms) setAllSymptomLogs(JSON.parse(storedSymptoms));
    } catch (e) {
      console.error("Failed to load local storage data", e);
    }
    setIsHydrated(true);
  }, []);

  // Save prototype state to LocalStorage
  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("cc_profiles", JSON.stringify(profiles));
  }, [profiles, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("cc_activeProfileId", JSON.stringify(activeProfileId));
  }, [activeProfileId, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("cc_allMedicines", JSON.stringify(allMedicines));
  }, [allMedicines, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("cc_allTrackingLogs", JSON.stringify(allTrackingLogs));
  }, [allTrackingLogs, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem("cc_allSymptomLogs", JSON.stringify(allSymptomLogs));
  }, [allSymptomLogs, isHydrated]);

  // Compute active profile
  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  // Filter lists by active profile
  const medicines = allMedicines.filter((m) => m.patientId === activeProfileId);
  const trackingLogs = allTrackingLogs.filter((l) => l.patientId === activeProfileId);
  const symptomLogs = allSymptomLogs.filter((s) => s.patientId === activeProfileId);

  // Profile management
  const selectProfile = (id: string) => {
    setActiveProfileId(id);
  };

  const createProfile = (profile: Omit<PatientProfile, "id">) => {
    const newId = generateUniqueId("profile");
    const newProfile: PatientProfile = {
      ...profile,
      id: newId,
    };
    setProfiles((prev) => [...prev, newProfile]);
    setActiveProfileId(newProfile.id);
  };

  const updateProfile = (id: string, updated: Partial<PatientProfile>) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
    );
  };

  const deleteProfile = (id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setAllMedicines((prev) => prev.filter((m) => m.patientId !== id));
    setAllTrackingLogs((prev) => prev.filter((l) => l.patientId !== id));
    setAllSymptomLogs((prev) => prev.filter((s) => s.patientId !== id));
    if (activeProfileId === id) {
      setActiveProfileId(profiles.find((p) => p.id !== id)?.id || null);
    }
  };

  // Medicine management
  const addMedicine = (
    medicine: Omit<Medicine, "id" | "active" | "patientId" | "reminderTimes"> & {
      reminderTimes?: ReminderTime[];
    }
  ) => {
    if (!activeProfileId) return;

    const computedReminderTimes = (
      medicine.reminderTimes ||
      medicine.timeOfDay.map((slot) => ({
        id: generateUniqueId("rt"),
        timeSlot: slot as any,
        time: medicine.exactTime || "08:00",
      }))
    ).map((rt) => ({
      ...rt,
      id: rt.id && !rt.id.startsWith("rt-init-") ? rt.id : generateUniqueId("rt"),
    }));

    let medId = generateUniqueId("med");
    while (allMedicines.some((m) => m.id === medId)) {
      medId = generateUniqueId("med");
    }

    const newMed: Medicine = {
      ...medicine,
      id: medId,
      patientId: activeProfileId,
      active: true,
      reminderTimes: computedReminderTimes,
    };

    setAllMedicines((prev) => [...prev, newMed]);

    const todayStr = localDateString();
    const newLogs: TrackingLog[] = newMed.reminderTimes.map((rt) => ({
      id: generateUniqueId("log"),
      patientId: activeProfileId,
      date: todayStr,
      medicineId: newMed.id,
      timeSlot: rt.timeSlot,
      status: "pending",
    }));

    setAllTrackingLogs((prev) => [...prev, ...newLogs]);
  };

  const addMedicines = (
    newMedsInput: (Omit<Medicine, "id" | "active" | "patientId" | "reminderTimes"> & {
      reminderTimes?: ReminderTime[];
    })[]
  ) => {
    if (!activeProfileId) return;

    const addedMeds: Medicine[] = [];
    const addedLogs: TrackingLog[] = [];
    const todayStr = localDateString();
    const generatedIds = new Set<string>();

    newMedsInput.forEach((medicine) => {
      const computedReminderTimes = (
        medicine.reminderTimes ||
        medicine.timeOfDay.map((slot) => ({
          id: generateUniqueId("rt"),
          timeSlot: slot as any,
          time: medicine.exactTime || "08:00",
        }))
      ).map((rt) => ({
        ...rt,
        id: rt.id && !rt.id.startsWith("rt-init-") ? rt.id : generateUniqueId("rt"),
      }));

      let medId = generateUniqueId("med");
      while (allMedicines.some((m) => m.id === medId) || generatedIds.has(medId)) {
        medId = generateUniqueId("med");
      }
      generatedIds.add(medId);

      const newMed: Medicine = {
        ...medicine,
        id: medId,
        patientId: activeProfileId,
        active: true,
        reminderTimes: computedReminderTimes,
      };
      addedMeds.push(newMed);

      newMed.reminderTimes.forEach((rt) => {
        addedLogs.push({
          id: generateUniqueId("log"),
          patientId: activeProfileId,
          date: todayStr,
          medicineId: newMed.id,
          timeSlot: rt.timeSlot,
          status: "pending",
        });
      });
    });

    setAllMedicines((prev) => [...prev, ...addedMeds]);
    setAllTrackingLogs((prev) => [...prev, ...addedLogs]);
  };

  const updateMedicine = (id: string, updated: Partial<Medicine>) => {
    setAllMedicines((prev) =>
      prev.map((med) => (med.id === id ? { ...med, ...updated } : med))
    );
  };

  const deleteMedicine = (id: string) => {
    setAllMedicines((prev) => prev.filter((med) => med.id !== id));
    setAllTrackingLogs((prev) => prev.filter((log) => log.medicineId !== id));
    setActiveReminders((prev) => prev.filter((ar) => ar.medicineId !== id));
  };

  // Log management
  const markAsTaken = (medicineId: string, date: string, timeSlot: string) => {
    if (!activeProfileId) return;
    setAllTrackingLogs((prev) => {
      const existingIndex = prev.findIndex(
        (log) =>
          log.medicineId === medicineId &&
          log.date === date &&
          log.timeSlot === timeSlot &&
          log.patientId === activeProfileId
      );

      const now = new Date();
      const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(now.getDate()).padStart(2, "0")} ${String(
        now.getHours()
      ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status: "taken",
          timestamp: timeStr,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: generateUniqueId("log"),
            patientId: activeProfileId,
            date,
            medicineId,
            timeSlot,
            status: "taken",
            timestamp: timeStr,
          },
        ];
      }
    });
  };

  const markAsMissed = (medicineId: string, date: string, timeSlot: string) => {
    if (!activeProfileId) return;
    setAllTrackingLogs((prev) => {
      const existingIndex = prev.findIndex(
        (log) =>
          log.medicineId === medicineId &&
          log.date === date &&
          log.timeSlot === timeSlot &&
          log.patientId === activeProfileId
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status: "missed",
          timestamp: undefined,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: generateUniqueId("log"),
            patientId: activeProfileId,
            date,
            medicineId,
            timeSlot,
            status: "missed",
          },
        ];
      }
    });
  };

  const resetLogStatus = (medicineId: string, date: string, timeSlot: string) => {
    if (!activeProfileId) return;
    setAllTrackingLogs((prev) => {
      const existingIndex = prev.findIndex(
        (log) =>
          log.medicineId === medicineId &&
          log.date === date &&
          log.timeSlot === timeSlot &&
          log.patientId === activeProfileId
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          status: "pending",
          timestamp: undefined,
        };
        return updated;
      }
      return prev;
    });

    setActiveReminders((prev) =>
      prev.filter(
        (ar) => !(ar.medicineId === medicineId && ar.timeSlot === timeSlot)
      )
    );
  };

  // Symptom management
  const addSymptomLog = (log: Omit<SymptomLog, "id" | "patientId">) => {
    if (!activeProfileId) return;
    const newLog: SymptomLog = {
      ...log,
      id: generateUniqueId("sym"),
      patientId: activeProfileId,
    };
    setAllSymptomLogs((prev) => [newLog, ...prev]);
  };

  const deleteSymptomLog = (id: string) => {
    setAllSymptomLogs((prev) => prev.filter((log) => log.id !== id));
  };

  const clearAlertsForPatient = (patientId: string) => {
    setCaregiverAlerts((prev) =>
      prev.filter((alert) => alert.patientId !== patientId)
    );
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("cc_theme", next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  return (
    <AppContext.Provider
      value={{
        profiles,
        activeProfileId,
        activeProfile,
        medicines,
        allMedicines,
        trackingLogs,
        allTrackingLogs,
        symptomLogs,
        allSymptomLogs,

        theme,
        toggleTheme,

        activeReminders,
        reminderHistory,
        caregiverAlerts,
        isFastDemoMode,
        voiceReminderStatus,
        lastReminderTriggered,

        addMedicine,
        addMedicines,
        updateMedicine,
        deleteMedicine,
        markAsTaken,
        markAsMissed,
        resetLogStatus,
        addSymptomLog,
        deleteSymptomLog,
        selectProfile,
        createProfile,
        updateProfile,
        deleteProfile,

        setActiveReminders,
        setReminderHistory,
        setCaregiverAlerts,
        setIsFastDemoMode,
        setVoiceReminderStatus,
        setLastReminderTriggered,
        clearAlertsForPatient,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppProvider");
  }
  return context;
}

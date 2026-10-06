"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/context/AppContext";
import { 
  UserCheck, 
  UserPlus, 
  Trash2, 
  ChevronRight
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { 
    profiles, 
    activeProfileId, 
    selectProfile, 
    createProfile, 
    deleteProfile 
  } = useAppState();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Form states for creating a profile
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [condition, setCondition] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [language, setLanguage] = useState("English");
  const [reminderStyle, setReminderStyle] = useState<"voice" | "popup" | "both">("both");
  const [error, setError] = useState("");

  const handleSelect = (id: string) => {
    selectProfile(id);
    router.push("/dashboard");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter the patient's full name.");
      return;
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum <= 0) {
      setError("Please enter a valid age.");
      return;
    }
    if (!condition.trim()) {
      setError("Please describe the patient's medical condition.");
      return;
    }

    createProfile({
      name: name.trim(),
      age: ageNum,
      gender,
      condition: condition.trim(),
      caregiverName: caregiverName.trim() || "None",
      language,
      reminderStyle,
      doctorName: "Dr. Sarah Alcott", // default clinic provider
      clinicName: "Metro Health Cardiology Clinic",
      precautions: "Maintain medication times carefully. Consult doctor for updates.",
      followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });

    // Reset form
    setName("");
    setAge("");
    setCondition("");
    setCaregiverName("");
    
    alert("New patient account created! Redirecting to Dashboard...");
    router.push("/dashboard");
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 flex-1 w-full space-y-8">
      {/* Header Banner with Gradient */}
      <div className="relative overflow-hidden bg-radial from-teal-700 to-teal-900 text-white rounded-3xl p-8 shadow-xl border border-teal-800">
        <div className="absolute inset-y-0 right-0 w-1/3 bg-teal-600/20 blur-2xl rounded-full translate-x-10"></div>
        <div className="relative z-10 space-y-3">
          <span className="text-xs bg-teal-500 text-teal-50 px-3 py-1 rounded-full font-bold uppercase tracking-wide">
            Access Gate
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Patient Accounts Portal</h1>
          <p className="text-teal-50 text-sm max-w-xl leading-relaxed">
            Select an active patient to view their daily adherence schedule, trigger reminders, and generate clinical reports, or register a new patient file.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Select Profile (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="text-lg font-bold text-slate-850 dark:text-dark-text-primary flex items-center gap-2">
              <UserCheck className="h-5.5 w-5.5 text-teal-600 dark:text-teal-400" />
              Select Active Account
            </h2>
            <span className="text-xs font-bold text-slate-700 dark:text-dark-text-secondary uppercase tracking-wider">{profiles.length} Accounts Registered</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {profiles.map((profile) => {
              const isActive = profile.id === activeProfileId;
              return (
                <div 
                  key={profile.id}
                  className={`group rounded-2xl border transition-all duration-300 overflow-hidden shadow-xs hover:shadow-md relative ${
                    isActive 
                      ? "border-teal-500 bg-teal-50/15 dark:bg-teal-950/10 ring-2 ring-teal-500/20" 
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-dark-bg-card hover:border-slate-350 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="p-6 space-y-4">
                    {/* Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-dark-text-primary group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                          {profile.name}
                        </h3>
                        <p className="text-xs text-slate-700 dark:text-dark-text-secondary mt-0.5">{profile.gender} • Age {profile.age}</p>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md ${
                        isActive 
                          ? "bg-teal-650 dark:bg-teal-600 text-white" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-dark-text-secondary"
                      }`}>
                        {isActive ? "Active" : "Select"}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="border-t border-b border-slate-100 dark:border-slate-800 py-3 space-y-2 text-xs text-slate-800 dark:text-dark-text-secondary">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-650 dark:text-dark-text-muted block">Medical Condition</span>
                        <strong className="text-slate-900 dark:text-dark-text-primary block text-xs truncate mt-0.5">{profile.condition}</strong>
                      </div>
                      <div className="flex justify-between gap-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-650 dark:text-dark-text-muted block">Caregiver</span>
                          <strong className="text-slate-900 dark:text-dark-text-primary mt-0.5 block">{profile.caregiverName}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-650 dark:text-dark-text-muted block">Language</span>
                          <strong className="text-slate-900 dark:text-dark-text-primary mt-0.5 block capitalize">{profile.language || "English"}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-650 dark:text-dark-text-muted block">Alert Style</span>
                          <strong className="text-slate-900 dark:text-dark-text-primary mt-0.5 block capitalize">{profile.reminderStyle}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 justify-between items-center">
                      <button
                        onClick={() => handleSelect(profile.id)}
                        suppressHydrationWarning
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg text-center transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          isActive 
                            ? "bg-teal-600 text-white hover:bg-teal-700 shadow-xs" 
                            : "bg-slate-50 hover:bg-slate-100 dark:bg-dark-bg-secondary dark:hover:bg-dark-bg-elevated border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-dark-text-secondary"
                        }`}
                      >
                        <span>Select Profile</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>

                      {profiles.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete profile for ${profile.name}? All their prescription logs will be lost.`)) {
                              deleteProfile(profile.id);
                            }
                          }}
                          suppressHydrationWarning
                          className="p-2 text-slate-700 dark:text-dark-text-secondary hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30 cursor-pointer"
                          title="Delete Patient Record"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Create Profile Form (5 cols) */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-dark-bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="bg-slate-50 dark:bg-dark-bg-secondary border-b border-slate-200 dark:border-slate-800 p-6 flex items-center gap-2.5">
              <div className="rounded-lg bg-teal-600 text-white p-2">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-dark-text-primary">Register New Patient</h2>
                <p className="text-xs text-slate-700 dark:text-dark-text-secondary mt-0.5">Create a distinct record for custom schedule configurations.</p>
              </div>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-xs text-red-700 dark:text-red-400 font-bold">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label htmlFor="fullname" className="block text-[10px] font-bold text-slate-700 dark:text-dark-text-muted uppercase">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mrs. Kamla, Mr. Ramesh"
                    suppressHydrationWarning
                    className="w-full text-xs font-semibold text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-dark-bg-secondary focus:outline-hidden focus:border-teal-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Age */}
                  <div className="space-y-1">
                    <label htmlFor="age" className="block text-[10px] font-bold text-slate-700 dark:text-dark-text-muted uppercase">
                      Age
                    </label>
                    <input
                      type="number"
                      id="age"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 72"
                      suppressHydrationWarning
                      className="w-full text-xs font-semibold text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-dark-bg-secondary focus:outline-hidden focus:border-teal-500"
                      required
                    />
                  </div>

                  {/* Gender */}
                  <div className="space-y-1">
                    <label htmlFor="gender" className="block text-[10px] font-bold text-slate-700 dark:text-dark-text-muted uppercase">
                      Gender
                    </label>
                    <select
                      id="gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      suppressHydrationWarning
                      className="w-full text-xs font-semibold text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-dark-bg-secondary focus:outline-hidden focus:border-teal-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Medical Condition */}
                <div className="space-y-1">
                  <label htmlFor="condition" className="block text-[10px] font-bold text-slate-700 dark:text-dark-text-muted uppercase">
                    Medical Condition / Notes
                  </label>
                  <input
                    type="text"
                    id="condition"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    placeholder="e.g. Blood Pressure, Diabetes, Post-op Recovery"
                    suppressHydrationWarning
                    className="w-full text-xs font-semibold text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-dark-bg-secondary focus:outline-hidden focus:border-teal-500"
                    required
                  />
                </div>

                {/* Caregiver Name */}
                <div className="space-y-1">
                  <label htmlFor="caregiver" className="block text-[10px] font-bold text-slate-700 dark:text-dark-text-muted uppercase">
                    Caregiver Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="caregiver"
                    value={caregiverName}
                    onChange={(e) => setCaregiverName(e.target.value)}
                    placeholder="e.g. Anil, Priya"
                    suppressHydrationWarning
                    className="w-full text-xs font-semibold text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-dark-bg-secondary focus:outline-hidden focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Language */}
                  <div className="space-y-1">
                    <label htmlFor="language" className="block text-[10px] font-bold text-slate-700 dark:text-dark-text-muted uppercase">
                      Reminder Language
                    </label>
                    <select
                      id="language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      suppressHydrationWarning
                      className="w-full text-xs font-semibold text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-dark-bg-secondary focus:outline-hidden focus:border-teal-500"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Tamil">Tamil</option>
                      <option value="Telugu">Telugu</option>
                      <option value="Kannada">Kannada</option>
                      <option value="Malayalam">Malayalam</option>
                      <option value="Marathi">Marathi</option>
                      <option value="Bengali">Bengali</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                    </select>
                  </div>

                  {/* Reminder Style */}
                  <div className="space-y-1">
                    <label htmlFor="rem-style" className="block text-[10px] font-bold text-slate-700 dark:text-dark-text-muted uppercase">
                      Reminder Style
                    </label>
                    <select
                      id="rem-style"
                      value={reminderStyle}
                      onChange={(e) => setReminderStyle(e.target.value as any)}
                      suppressHydrationWarning
                      className="w-full text-xs font-semibold text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-dark-bg-secondary focus:outline-hidden focus:border-teal-500"
                    >
                      <option value="both">Both (Voice & Popup)</option>
                      <option value="voice">Voice Reminder Only</option>
                      <option value="popup">Popup Alert Only</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  suppressHydrationWarning
                  className="w-full py-3 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm hover:shadow-md transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Register Patient Account</span>
                </button>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

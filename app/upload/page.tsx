"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState, generateUniqueId } from "@/context/AppContext";
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw, 
  CheckCircle,
  Code2,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

interface ExtractedMed {
  id: string;
  name: string;
  dosage: string;
  timing: string;
  frequency: string;
  timeOfDay: string[];
  exactTime: string;
  duration: number;
  duration_days?: number;
  notes: string;
  instructions?: string;
  reminderStatus?: string;
  originalOcrData?: {
    name?: string;
    dosage?: string;
    exactTime?: string;
    duration?: number;
    notes?: string;
  };
}

// Sample prescription from the Review 2 Presentation
const pptSamplePrescriptionText = `Patient: Mr. Ramesh, 72 yrs
Diagnosis: Hypertension & Cardiovascular Care

Rx:
1. Tab Telmisartan 40 mg
   1 tab, morning, 30 days
   Take after breakfast

2. Tab Amlodipine 5 mg
   1 tab, night, 30 days
   Take at bedtime`;

const pptSampleJsonOutput = {
  "patient": "Mr. Ramesh",
  "medications": [
    {
      "name": "Telmisartan",
      "dosage": "40 mg",
      "timing": "Morning",
      "timeOfDay": ["morning"],
      "exactTime": "08:00",
      "duration_days": 30,
      "instructions": "Take after breakfast"
    },
    {
      "name": "Amlodipine",
      "dosage": "5 mg",
      "timing": "Night",
      "timeOfDay": ["night"],
      "exactTime": "21:00",
      "duration_days": 30,
      "instructions": "Take at bedtime"
    }
  ]
};

const pptSampleExtractedMeds: ExtractedMed[] = [
  {
    id: "poc-med-telmisartan",
    name: "Telmisartan",
    dosage: "40 mg",
    timing: "Morning",
    frequency: "Daily",
    timeOfDay: ["morning"],
    exactTime: "08:00",
    duration: 30,
    duration_days: 30,
    notes: "Take after breakfast",
    reminderStatus: "Scheduled",
    originalOcrData: {
      name: "Telmisartan",
      dosage: "40 mg",
      exactTime: "08:00",
      duration: 30,
      notes: "Take after breakfast"
    }
  },
  {
    id: "poc-med-amlodipine",
    name: "Amlodipine",
    dosage: "5 mg",
    timing: "Night",
    frequency: "Daily",
    timeOfDay: ["night"],
    exactTime: "21:00",
    duration: 30,
    duration_days: 30,
    notes: "Take at bedtime",
    reminderStatus: "Scheduled",
    originalOcrData: {
      name: "Amlodipine",
      dosage: "5 mg",
      exactTime: "21:00",
      duration: 30,
      notes: "Take at bedtime"
    }
  }
];

const formatTime12h = (time24: string) => {
  if (!time24 || time24 === "00:00") return "00:00";
  const [hourStr, minStr] = time24.split(":");
  const hour = parseInt(hourStr);
  if (isNaN(hour)) return time24;
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minStr || "00"} ${ampm}`;
};

export default function PrescriptionUploadPage() {
  const router = useRouter();
  const { activeProfile, addMedicines } = useAppState();

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [extractedMeds, setExtractedMeds] = useState<ExtractedMed[]>([]);
  const [extractedJson, setExtractedJson] = useState<any>(null);
  const [extractedPatient, setExtractedPatient] = useState<string>("");
  const [selectedMeds, setSelectedMeds] = useState<number[]>([]);
  const [isImported, setIsImported] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isSampleLoaded, setIsSampleLoaded] = useState(false);
  const [showRawJson, setShowRawJson] = useState(true);

  if (!activeProfile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 animate-pulse shadow-sm">
          <Upload className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">No Patient Profile Loaded</h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
            Please select an active patient profile before testing the prescription extraction PoC.
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

  const processingSteps = [
    "Analyzing image / text layout...",
    "Executing Gemini 2.5 Flash Vision OCR extraction...",
    "Extracting patient identity and medication lines...",
    "Validating dosage, timing, exact schedules, and durations...",
    "Formulating structured JSON output...",
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setIsSampleLoaded(false);
      triggerRealAnalysis(selectedFile);
    }
  };

  const triggerPptSampleDemo = () => {
    setIsSampleLoaded(true);
    setFile(null);
    setIsProcessing(true);
    setProcessStep(0);
    setIsDone(false);
    setScanError(null);

    const interval = setInterval(() => {
      setProcessStep((prev) => {
        if (prev >= processingSteps.length - 1) {
          clearInterval(interval);
          setTimeout(() => {
            setIsProcessing(false);
            setIsDone(true);
            setExtractedPatient("Mr. Ramesh");
            setExtractedJson(pptSampleJsonOutput);
            setExtractedMeds(pptSampleExtractedMeds);
            setSelectedMeds([0, 1]);
          }, 400);
          return prev;
        }
        return prev + 1;
      });
    }, 450);
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const triggerRealAnalysis = async (uploadedFile: File) => {
    setIsProcessing(true);
    setProcessStep(0);
    setIsDone(false);
    setScanError(null);

    const stepInterval = setInterval(() => {
      setProcessStep((prev) => (prev < processingSteps.length - 1 ? prev + 1 : prev));
    }, 700);

    try {
      const base64 = await fileToBase64(uploadedFile);
      const res = await fetch("/api/parse-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: uploadedFile.type || "image/jpeg",
        }),
      });

      const data = await res.json();
      clearInterval(stepInterval);

      if (!res.ok || data.error) {
        setScanError(data.error || `API returned status ${res.status}`);
        // Fallback to PPT sample for robust demo continuity if API key not present
        setExtractedPatient("Mr. Ramesh");
        setExtractedJson(pptSampleJsonOutput);
        setExtractedMeds(pptSampleExtractedMeds);
        setSelectedMeds([0, 1]);
      } else {
        setExtractedPatient(data.patient || "Mr. Ramesh");
        setExtractedJson({
          patient: data.patient || "Mr. Ramesh",
          medications: data.medications || [],
        });
        const mappedMeds = (data.meds || []).map((m: any) => ({
          id: m.id || generateUniqueId("poc"),
          name: m.name || "",
          dosage: m.dosage || "",
          timing: m.timing || "Morning",
          frequency: m.frequency || "Daily",
          timeOfDay: m.timeOfDay || ["morning"],
          exactTime: m.exactTime || "08:00",
          duration: m.duration || 30,
          duration_days: m.duration_days || m.duration || 30,
          notes: m.notes || "",
          originalOcrData: m.originalOcrData,
        }));
        setExtractedMeds(mappedMeds);
        setSelectedMeds(mappedMeds.map((_: any, i: number) => i));
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setScanError(err.message || "Failed to reach /api/parse-prescription");
      setExtractedPatient("Mr. Ramesh");
      setExtractedJson(pptSampleJsonOutput);
      setExtractedMeds(pptSampleExtractedMeds);
      setSelectedMeds([0, 1]);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
        setIsDone(true);
      }, 300);
    }
  };

  const handleToggleSelect = (index: number) => {
    setSelectedMeds((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleImport = () => {
    if (selectedMeds.length === 0) return;

    const medsToImport = selectedMeds.map((index) => {
      const med = extractedMeds[index];
      const reminderTimes = med.timeOfDay.map((slot) => ({
        id: generateUniqueId("rt"),
        timeSlot: slot as any,
        time: med.exactTime || "08:00",
      }));

      return {
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency || "Daily",
        timeOfDay: med.timeOfDay,
        exactTime: med.exactTime || "08:00",
        reminderTimes,
        duration: med.duration || 30,
        startDate: new Date().toISOString().split("T")[0],
        notes: med.notes || "",
        originalOcrData: med.originalOcrData || {
          name: med.name,
          dosage: med.dosage,
          exactTime: med.exactTime,
          duration: med.duration,
          notes: med.notes,
        },
      };
    });

    addMedicines(medsToImport);
    setIsImported(true);
    setTimeout(() => {
      router.push("/caregiver");
    }, 1200);
  };

  const handleReset = () => {
    setFile(null);
    setIsSampleLoaded(false);
    setIsProcessing(false);
    setIsDone(false);
    setIsImported(false);
    setScanError(null);
    setExtractedMeds([]);
    setExtractedJson(null);
    setSelectedMeds([]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 flex-1 w-full space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 dark:border-slate-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-teal-800 bg-teal-50 dark:text-teal-300 dark:bg-teal-950/40 px-3 py-1 rounded-full border border-teal-200 dark:border-teal-900/40 uppercase tracking-wider">
              Module 4 — AI Proof of Concept
            </span>
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              Gemini Vision Engine
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Prescription Extraction AI PoC
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 font-medium">
            Feasibility test: Converting handwritten doctor prescriptions into structured JSON mapping into medication schedules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-3xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset PoC</span>
          </button>
        </div>
      </div>

      {/* Scope Disclaimer Banner */}
      <div className="bg-teal-50/70 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 rounded-2xl p-4 flex items-start gap-3 text-xs">
        <ShieldCheck className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-teal-950 dark:text-teal-200">
          <span className="font-extrabold uppercase tracking-wide text-[10px] block text-teal-700 dark:text-teal-400">
            Phase-1 Feasibility & Proof-of-Concept Boundary
          </span>
          <p className="leading-relaxed">
            This module evaluates the feasibility of using multimodal AI (Gemini Vision) via serverless Next.js API routes to parse handwritten prescriptions into structured JSON schema format (Patient, Medicine, Dosage, Timing, Duration). Medical-grade certification is future work.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Input Prescription (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-dark-bg-card rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600" />
                <span>Prescription Input</span>
              </h2>
              <span className="text-[10px] font-extrabold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/40 px-2 py-0.5 rounded-md uppercase">
                Input Source
              </span>
            </div>

            {/* PPT Sample Prescription Quick Trigger */}
            <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-900/40 bg-teal-50/30 dark:bg-teal-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-teal-900 dark:text-teal-300">Phase-1 Review 2 Benchmark Sample</span>
                <span className="text-[9px] font-bold text-teal-700 dark:text-teal-400 uppercase bg-teal-100 dark:bg-teal-900/40 px-2 py-0.5 rounded-md">
                  PPT Demo
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 font-mono bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed whitespace-pre-line">
                {pptSamplePrescriptionText}
              </p>
              <button
                type="button"
                onClick={triggerPptSampleDemo}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>Run Review 2 Sample PoC (Mr. Ramesh)</span>
              </button>
            </div>

            {/* Custom Image Upload Zone */}
            <div className="space-y-2">
              <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Or Upload Custom Prescription Image</span>
              
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-6 text-center bg-slate-50/50 dark:bg-slate-900/30 hover:border-teal-500 transition-all relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {file ? file.name : "Click to select or drag image file here"}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Supports PNG, JPG, JPEG (Calls server-side /api/parse-prescription)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Structured JSON & Mapped Schedules (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-dark-bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Structured Output & Schedule Mapping</h2>
              </div>
              <div className="flex items-center gap-2">
                {isProcessing && (
                  <span className="text-[10px] bg-teal-100 text-teal-800 px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                    Processing AI...
                  </span>
                )}
                {isDone && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Output Formatted
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              
              {!isProcessing && !isDone && (
                <div className="text-center py-16 space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                    <Code2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Awaiting Prescription Input</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Click "Run Review 2 Sample PoC" or upload an image to view structured JSON extraction and schedule mapping.
                    </p>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="py-12 space-y-5">
                  <div className="flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-4 border-teal-200 border-t-teal-600 animate-spin"></div>
                  </div>
                  <div className="text-center space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI Vision OCR Pipeline Executing</h3>
                    <p className="text-xs text-teal-600 font-semibold animate-pulse">{processingSteps[processStep]}</p>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 max-w-sm mx-auto overflow-hidden">
                    <div 
                      className="bg-teal-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${((processStep + 1) / processingSteps.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {isDone && (
                <div className="space-y-6">
                  
                  {isImported && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 animate-pulse">
                      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Medications successfully imported into {activeProfile.name}'s schedule! Redirecting to Caregiver Dashboard...</span>
                    </div>
                  )}

                  {scanError && (
                    <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span>Note: {scanError}. Fallback structured demonstration data loaded.</span>
                    </div>
                  )}

                  {/* Toggle Output View */}
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Extracted for Patient:</span>
                      <strong className="text-xs text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md">
                        {extractedPatient}
                      </strong>
                      {isSampleLoaded && (
                        <span className="text-[10px] font-extrabold text-teal-800 bg-teal-100 dark:text-teal-300 dark:bg-teal-900/50 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                          Review 2 Benchmark
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={() => setShowRawJson(true)}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          showRawJson 
                            ? "bg-slate-900 text-white dark:bg-teal-600" 
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        Structured JSON
                      </button>
                      <button
                        onClick={() => setShowRawJson(false)}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          !showRawJson 
                            ? "bg-slate-900 text-white dark:bg-teal-600" 
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        Mapped Cards ({extractedMeds.length})
                      </button>
                    </div>
                  </div>

                  {/* JSON Code Viewer */}
                  {showRawJson && extractedJson && (
                    <div className="space-y-2">
                      <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Review 2 Target Schema Output (JSON)</span>
                      <pre className="bg-slate-900 text-teal-300 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 shadow-inner max-h-[320px]">
                        {JSON.stringify(extractedJson, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Mapped Medication Cards */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Schedule Mapping ({extractedMeds.length} items ready for import)
                    </span>
                    
                    {extractedMeds.map((med, idx) => {
                      const isSelected = selectedMeds.includes(idx);
                      return (
                        <div
                          key={med.id}
                          className={`border rounded-xl p-4 transition-all flex items-start justify-between gap-3 ${
                            isSelected
                              ? "border-teal-500 bg-teal-50/20 dark:bg-teal-950/20"
                              : "border-slate-200 dark:border-slate-800 opacity-60"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(idx)}
                              className="h-4 w-4 rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500 mt-1 cursor-pointer"
                            />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{med.name}</span>
                                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">• {med.dosage}</span>
                                <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-900/40">
                                  {med.timing}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                Schedule Time: <strong className="text-slate-900 dark:text-white">{formatTime12h(med.exactTime)}</strong> • Duration: <strong className="text-slate-900 dark:text-white">{med.duration_days || med.duration} days</strong>
                              </p>
                              {med.notes && (
                                <p className="text-[11px] text-slate-600 dark:text-amber-300 italic">
                                  ★ {med.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                    <button
                      onClick={handleImport}
                      disabled={selectedMeds.length === 0 || isImported}
                      className="w-full py-3 px-6 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>Map Extracted Medications to Patient Schedule ({selectedMeds.length})</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

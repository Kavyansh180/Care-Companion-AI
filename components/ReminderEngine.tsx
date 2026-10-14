"use client";

import { useEffect, useRef } from "react";
import { useAppState, ActiveReminder, ReminderHistoryItem, CaregiverAlert } from "@/context/AppContext";
import { localDateString } from "@/lib/dates";
import { formatTime12h } from "@/lib/format";

const languageCodeMap: Record<string, string> = {
  english: "en-US",
  hindi: "hi-IN",
  tamil: "ta-IN",
  telugu: "te-IN",
  kannada: "kn-IN",
  malayalam: "ml-IN",
  marathi: "mr-IN",
  bengali: "bn-IN",
  spanish: "es-ES",
  french: "fr-FR",
};

export const SUPPORTED_LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Spanish", "French"] as const;

export function getLanguageCode(language?: string): string {
  if (!language) return "en-US";
  return languageCodeMap[language.trim().toLowerCase()] || "en-US";
}

const languageConfigs: Record<string, {
  greetings: { morning: string; afternoon: string; evening: string; night: string; hello: string };
  template: (greeting: string, patientName: string, medName: string, dosage: string) => string;
}> = {
  "en-US": {
    greetings: {
      morning: "Good morning",
      afternoon: "Good afternoon",
      evening: "Good evening",
      night: "Good night",
      hello: "Hello"
    },
    template: (greeting, patientName, medName, dosage) => 
      `${greeting} ${patientName}. This is your Care Companion. It is time to take your medication. Please take ${dosage} of ${medName}.`
  },
  "hi-IN": {
    greetings: {
      morning: "शुभ प्रभात",
      afternoon: "नमस्कार",
      evening: "शुभ संध्या",
      night: "शुभ रात्रि",
      hello: "नमस्ते"
    },
    template: (greeting, patientName, medName, dosage) => 
      `${greeting} ${patientName}, यह आपका केयर कम्पैनियन है। आपकी दवा लेने का समय हो गया है। कृपया ${medName} की ${dosage} लें।`
  },
  "ta-IN": {
    greetings: {
      morning: "காலை வணக்கம்",
      afternoon: "மதிய வணக்கம்",
      evening: "மாலை வணக்கம்",
      night: "இனிய இரவு வணக்கம்",
      hello: "வணக்கம்"
    },
    template: (greeting, patientName, medName, dosage) => 
      `${greeting} ${patientName}, இது உங்கள் கேர் கம்பானியன். மருந்து எடுத்துக்கொள்ளும் நேரம் வந்துவிட்டது. தயவுசெய்து ${medName} இன் ${dosage} அளவை எடுத்துக் கொள்ளவும்.`
  },
  "te-IN": {
    greetings: {
      morning: "శుభోదయం",
      afternoon: "మధ్యాహ్న వందనాలు",
      evening: "సాయంత్రం శుభాకాంక్షలు",
      night: "శుభ రాత్రి",
      hello: "నమస్కారం"
    },
    template: (greeting, patientName, medName, dosage) => 
      `${greeting} ${patientName}, ఇది మీ కేர் కంపానియన్. మీ ఔషధం తీసుకునే సమయం అయింది. దయచేసి ${medName} యొక్క ${dosage} తీసుకోండి.`
  },
  "kn-IN": {
    greetings: {
      morning: "ಶುಭೋದಯ",
      afternoon: "ನಮಸ್ಕಾರ",
      evening: "ಶುಭ ಸಂಜೆ",
      night: "ಶುಭ ರಾತ್ರಿ",
      hello: "ನಮಸ್ಕಾರ"
    },
    template: (greeting, patientName, medName, dosage) => 
      `${greeting} ${patientName}, ಇದು ನಿಮ್ಮ ಕೇರ್ ಕಂಪ್ಯಾನಿಯನ್. ನಿಮ್ಮ ಔಷಧಿಯನ್ನು ತೆಗೆದುಕೊಳ್ಳುವ ಸಮಯವಾಗಿದೆ. ದಯವಿಟ್ಟು ${medName} ನ ${dosage} ತೆಗೆದುಕೊಳ್ಳಿ.`
  },
  "ml-IN": {
    greetings: {
      morning: "ശുഭപ്രഭാതം",
      afternoon: "നമസ്കാരം",
      evening: "ശുഭസന്ധ്യ",
      night: "ശുഭരാത്രി",
      hello: "നമസ്കാരം"
    },
    template: (greeting, patientName, medName, dosage) => 
      `${greeting} ${patientName}, ഇത് നിങ്ങളുടെ കെയർ കമ്പാനിയൻ ആണ്. നിങ്ങളുടെ മരുന്ന് കഴിക്കാൻ സമയമായി. ദയവായി ${medName} ന്റെ ${dosage} കഴിക്കുക.`
  },
  "mr-IN": {
    greetings: {
      morning: "शुभ प्रभात",
      afternoon: "नमस्कार",
      evening: "शुभ संध्या",
      night: "शुभ रात्री",
      hello: "नमस्कार"
    },
    template: (greeting, patientName, medName, dosage) => 
      `${greeting} ${patientName}, हे तुमचे केअर कम्पॅनियन आहे. तुमची औषध घेण्याची वेळ झाली आहे. कृपया ${medName} ची ${dosage} घ्या.`
  },
  "bn-IN": {
    greetings: {
      morning: "সুপ্রভাত",
      afternoon: "নমস্কার",
      evening: "শুভ সন্ধ্যা",
      night: "শুভ রাত্রি",
      hello: "নমস্কার"
    },
    template: (greeting, patientName, medName, dosage) => 
      `${greeting} ${patientName}, এটি আপনার কেয়ার কম্প্যানিয়ন। আপনার ওষুধ খাওয়ার সময় হয়েছে। দয়া করে ${medName} এর ${dosage} নিন।`
  },
  "es-ES": {
    greetings: {
      morning: "Buenos días",
      afternoon: "Buenas tardes",
      evening: "Buenas noches",
      night: "Buenas noches",
      hello: "Hola"
    },
    template: (greeting, patientName, medName, dosage) => 
      `${greeting} ${patientName}. Este es su recordatorio de Care Companion. Es hora de tomar su medicamento. Por favor tome ${dosage} de ${medName}.`
  },
  "fr-FR": {
    greetings: {
      morning: "Bonjour",
      afternoon: "Bonjour",
      evening: "Bonsoir",
      night: "Bonne nuit",
      hello: "Bonjour"
    },
    template: (greeting, patientName, medName, dosage) => 
      `${greeting} ${patientName}. C'est votre assistant Care Companion. Il est temps de prendre votre médicament. Veuillez prendre ${dosage} de ${medName}.`
  }
};

const localizedFeedbacks: Record<string, { taken: (patientName: string) => string; snoozed: (isDemo: boolean) => string }> = {
  "en-US": {
    taken: (name) => `Dose marked taken. Thank you, ${name}.`,
    snoozed: (demo) => `Snoozed. I will remind you again in ${demo ? "one minute" : "five minutes"}.`
  },
  "hi-IN": {
    taken: (name) => `दवा ली गई। धन्यवाद, ${name}।`,
    snoozed: (demo) => `सूँज किया गया। मैं आपको ${demo ? "एक मिनट" : "पांच मिनट"} में फिर से याद दिलाऊँगा।`
  },
  "ta-IN": {
    taken: (name) => `மருந்து எடுத்துக்கொள்ளப்பட்டது. நன்றி, ${name}.`,
    snoozed: (demo) => `தள்ளி வைக்கப்பட்டது. நான் உங்களுக்கு ${demo ? "ஒரு நிமிடத்தில்" : "ஐந்து நிமிடங்களில்"} மீண்டும் நினைவூட்டுவேன்.`
  },
  "te-IN": {
    taken: (name) => `ఔషధం తీసుకోబడింది. ధన్యవాదాలు, ${name}.`,
    snoozed: (demo) => `స్నూజ్ చేయబడింది. నేను మీకు ${demo ? "ఒక నిమిషంలో" : "ఐదు నిమిషాల్లో"} మళ్ళీ గుర్తు చేస్తాను.`
  },
  "ml-IN": {
    taken: (name) => `മരുന്ന് കഴിച്ചു എന്ന് രേഖപ്പെടുത്തി. നന്ദി, ${name}.`,
    snoozed: (demo) => `മാറ്റിവെച്ചു. ${demo ? "ഒരു മിനിറ്റിനുള്ളിൽ" : "അഞ്ച് മിനിറ്റിനുള്ളിൽ"} ഞാൻ നിങ്ങളെ വീണ്ടും ഓർമ്മിപ്പിക്കാം.`
  },
  "kn-IN": {
    taken: (name) => `ಔಷಧಿ ತೆಗೆದುಕೊಳ್ಳಲಾಗಿದೆ. ಧನ್ಯವಾದಗಳು, ${name}.`,
    snoozed: (demo) => `ಸ್ನೂಜ್ ಮಾಡಲಾಗಿದೆ. ನಾನು ನಿಮಗೆ ${demo ? "ಒಂದು ನಿಮಿಷದಲ್ಲಿ" : "ಐದು ನಿಮಿಷಗಳಲ್ಲಿ"} ಮತ್ತೆ ನೆನಪಿಸುತ್ತೇನೆ.`
  },
  "mr-IN": {
    taken: (name) => `औषध घेतले गेले. धन्यवाद, ${name}.`,
    snoozed: (demo) => `पुढे ढकलले. मी तुम्हाला ${demo ? "एका मिनिटात" : "पाच मिनिटात"} पुन्हा आठवण करून देईल.`
  },
  "bn-IN": {
    taken: (name) => `ওষুধ খাওয়া হয়েছে। ধন্যবাদ, ${name}।`,
    snoozed: (demo) => `স্নুজ করা হলো। আমি আপনাকে ${demo ? "এক মিনিট" : "পাঁচ মিনিট"} পর আবার মনে করিয়ে দেব।`
  },
  "es-ES": {
    taken: (name) => `Dosis marcada como tomada. Gracias, ${name}.`,
    snoozed: (demo) => `Pospuesto. Te recordaré de nuevo en ${demo ? "un minuto" : "cinco minutos"}.`
  },
  "fr-FR": {
    taken: (name) => `Dose marquée comme prise. Merci, ${name}.`,
    snoozed: (demo) => `Rappel reporté. Je vous rappellerai dans ${demo ? "une minute" : "cinq minutes"}.`
  }
};

export function getLocalizedFeedback(
  language: string | undefined,
  patientName: string,
  type: "taken" | "snoozed",
  isDemo: boolean = false
): string {
  const normalizedLang = (language || "English").trim().toLowerCase();
  const langCode = languageCodeMap[normalizedLang] || "en-US";
  const feedbacks = localizedFeedbacks[langCode] || localizedFeedbacks["en-US"];
  return type === "taken" ? feedbacks.taken(patientName) : feedbacks.snoozed(isDemo);
}

export function getLocalizedReminder(
  language: string | undefined,
  patientName: string,
  medName: string,
  dosage: string,
  timeSlot: string
): { langCode: string; speechText: string } {
  const normalizedLang = (language || "English").trim().toLowerCase();
  const langCode = languageCodeMap[normalizedLang] || "en-US";
  const config = languageConfigs[langCode] || languageConfigs["en-US"];
  
  const greeting = config.greetings[timeSlot as keyof typeof config.greetings] || config.greetings.hello;
  const speechText = config.template(greeting, patientName, medName, dosage);
  
  return { langCode, speechText };
}

export function getActiveVoice(language: string | undefined): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const targetLangCode = getLanguageCode(language);
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  let selectedVoice = voices.find(v => v.lang.toLowerCase() === targetLangCode.toLowerCase());
  if (!selectedVoice) {
    const targetPrefix = targetLangCode.split("-")[0].toLowerCase();
    selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix));
  }
  if (!selectedVoice) {
    const englishVoices = voices.filter(v => v.lang.startsWith("en"));
    const femaleKeywords = ["google us english", "microsoft zira", "samantha", "victoria", "hazel", "siri", "female", "natural", "zira", "english"];
    for (const keyword of femaleKeywords) {
      const found = englishVoices.find(v => v.name.toLowerCase().includes(keyword));
      if (found) {
        selectedVoice = found;
        break;
      }
    }
    if (!selectedVoice && englishVoices.length > 0) selectedVoice = englishVoices[0];
  }
  return selectedVoice || voices[0] || null;
}

export function speakTextWithVoice(
  speechText: string,
  langCode: string,
  languageName: string | undefined,
  rate: number = 0.82,
  pitch: number = 1.05,
  onStartSpeech?: (voiceName: string, voiceLang: string) => void,
  onEndSpeech?: () => void,
  onErrorSpeech?: (err: any) => void
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (onErrorSpeech) onErrorSpeech("Speech synthesis unsupported");
    return;
  }

  const runSpeak = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = langCode;
    utterance.rate = rate;
    utterance.pitch = pitch;

    const selectedVoice = getActiveVoice(languageName);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      if (onStartSpeech) onStartSpeech(selectedVoice.name, selectedVoice.lang);
    } else {
      if (onStartSpeech) onStartSpeech("Standard Voice", langCode);
    }

    if (onEndSpeech) utterance.onend = onEndSpeech;
    if (onErrorSpeech) utterance.onerror = onErrorSpeech;

    window.speechSynthesis.speak(utterance);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    runSpeak();
  } else {
    // Wait for voices to be loaded
    const handleVoicesChanged = () => {
      const updatedVoices = window.speechSynthesis.getVoices();
      if (updatedVoices.length > 0) {
        window.speechSynthesis.onvoiceschanged = null;
        runSpeak();
      }
    };
    window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
  }
}

export default function ReminderEngine() {
  const {
    activeProfile,
    medicines,
    trackingLogs,
    activeReminders,
    isFastDemoMode,
    setActiveReminders,
    setReminderHistory,
    setCaregiverAlerts,
    setVoiceReminderStatus,
    setLastReminderTriggered,
    markAsMissed
  } = useAppState();

  const processedKeys = useRef<Set<string>>(new Set());

  // Function to search and trigger Web Speech API with female voices
  const speakReminder = (medName: string, dosage: string, timeSlot: string, patientName: string) => {
    const { langCode, speechText } = getLocalizedReminder(
      activeProfile?.language,
      patientName,
      medName,
      dosage,
      timeSlot
    );

    speakTextWithVoice(
      speechText,
      langCode,
      activeProfile?.language,
      0.82,
      1.05,
      (voiceName, voiceLang) => {
        setVoiceReminderStatus(`Speaking • Voice: ${voiceName} (${voiceLang})`);
      },
      () => {
        const selectedVoice = getActiveVoice(activeProfile?.language);
        setVoiceReminderStatus(selectedVoice ? `Active • Female Voice: ${selectedVoice.name}` : "Active • Standard Voice");
      },
      (err) => {
        console.error(err);
        setVoiceReminderStatus("Active • Synthesis Error");
      }
    );
  };

  // 1. Check for new scheduled reminders matches
  useEffect(() => {
    if (!activeProfile) return;

    const timer = setInterval(() => {
      const now = new Date();
      const todayStr = localDateString(now);
      const currentHHMM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      medicines.forEach(med => {
        if (!med.active) return;
        
        med.reminderTimes.forEach(rt => {
          if (rt.time === currentHHMM) {
            const matchKey = `${med.id}-${rt.timeSlot}-${todayStr}-${currentHHMM}`;
            if (processedKeys.current.has(matchKey)) return;

            // Check if already completed/missed in tracking log
            const existingLog = trackingLogs.find(
              l => l.medicineId === med.id && 
                   l.date === todayStr && 
                   l.timeSlot === rt.timeSlot && 
                   (l.status === "taken" || l.status === "missed")
            );
            if (existingLog) return;

            // Check if already active in modal
            const isAlreadyActive = activeReminders.some(
              r => r.medicineId === med.id && 
                   r.timeSlot === rt.timeSlot && 
                   r.date === todayStr
            );
            if (isAlreadyActive) return;

            // Mark as processed
            processedKeys.current.add(matchKey);

            // Set countdown durations (5 minutes or 1 minute in demo mode)
            const intervalMs = isFastDemoMode ? 1 * 60 * 1000 : 5 * 60 * 1000;
            
            const newReminder: ActiveReminder = {
              id: `rem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              medicineId: med.id,
              medicineName: med.name,
              dosage: med.dosage,
              timeSlot: rt.timeSlot,
              scheduledTime: rt.time,
              date: todayStr,
              triggerCount: 1,
              lastTriggeredTime: Date.now(),
              nextTriggerTime: Date.now() + intervalMs,
              status: "active",
              notes: med.notes
            };

            // Insert into active reminders list
            setActiveReminders(prev => [...prev, newReminder]);

            // Add history entry
            const historyItem: ReminderHistoryItem = {
              id: `hist-${Date.now()}-${med.id}`,
              medicineId: med.id,
              medicineName: med.name,
              dosage: med.dosage,
              timeSlot: rt.timeSlot,
              scheduledTime: rt.time,
              timestamp: currentHHMM,
              date: todayStr,
              status: "triggered"
            };
            setReminderHistory(prev => [historyItem, ...prev]);
            setLastReminderTriggered(historyItem);

            // Announce automatically
            speakReminder(med.name, med.dosage, rt.timeSlot, activeProfile.name);
          }
        });
      });

      // Periodically clean old keys from memory (every hour)
      if (now.getSeconds() === 0 && now.getMinutes() === 0) {
        processedKeys.current.clear();
      }
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, medicines, trackingLogs, activeReminders, isFastDemoMode]);

  // 2. Manage ongoing ActiveReminders count-down (Snooze + Unattended escalations)
  useEffect(() => {
    if (!activeProfile) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const todayStr = localDateString();
      const currentHHMM = `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;

      setActiveReminders(prev => {
        let changed = false;
        
        const updated = prev.map(reminder => {
          if (reminder.status !== "active" && reminder.status !== "snoozed") {
            return reminder;
          }

          // Check if time to trigger again (5 mins or 1 min in demo)
          if (now >= reminder.nextTriggerTime) {
            changed = true;
            const nextInterval = isFastDemoMode ? 1 * 60 * 1000 : 5 * 60 * 1000;

            if (reminder.triggerCount < 3) {
              // Trigger reminder #2 or #3
              const newTriggerCount = reminder.triggerCount + 1;
              speakReminder(reminder.medicineName, reminder.dosage, reminder.timeSlot, activeProfile.name);

              // Log trigger recurrence in history
              const historyItem: ReminderHistoryItem = {
                id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                medicineId: reminder.medicineId,
                medicineName: reminder.medicineName,
                dosage: reminder.dosage,
                timeSlot: reminder.timeSlot,
                scheduledTime: reminder.scheduledTime,
                timestamp: currentHHMM,
                date: todayStr,
                status: "triggered"
              };
              setReminderHistory(h => [historyItem, ...h]);
              setLastReminderTriggered(historyItem);

              return {
                ...reminder,
                triggerCount: newTriggerCount,
                lastTriggeredTime: now,
                nextTriggerTime: now + nextInterval,
                status: "active" as const // Awake popup modal!
              };
            } else {
              // Missed medicine threshold reached (No response after 3 triggers)
              markAsMissed(reminder.medicineId, reminder.date, reminder.timeSlot);

              // Create caregiver alert
              const caregiverMsg = `${activeProfile.name} missed ${activeProfile.gender === "Female" ? "her" : activeProfile.gender === "Male" ? "his" : "their"} ${formatTime12h(reminder.scheduledTime)} medicine.`;
              const newAlert: CaregiverAlert = {
                id: `alert-${Date.now()}`,
                patientId: activeProfile.id,
                message: caregiverMsg,
                timestamp: currentHHMM,
                date: reminder.date,
                medicineId: reminder.medicineId,
                exactTime: reminder.scheduledTime
              };
              setCaregiverAlerts(alerts => [newAlert, ...alerts]);

              // Log missed in history
              const historyItem: ReminderHistoryItem = {
                id: `hist-${Date.now()}-${reminder.medicineId}`,
                medicineId: reminder.medicineId,
                medicineName: reminder.medicineName,
                dosage: reminder.dosage,
                timeSlot: reminder.timeSlot,
                scheduledTime: reminder.scheduledTime,
                timestamp: currentHHMM,
                date: todayStr,
                status: "missed"
              };
              setReminderHistory(h => [historyItem, ...h]);
              setLastReminderTriggered(historyItem);

              return {
                ...reminder,
                status: "missed" as const
              };
            }
          }
          return reminder;
        });

        // Filter out completed and missed reminders immediately
        const remaining = updated.filter(r => r.status === "active" || r.status === "snoozed");
        if (remaining.length !== prev.length || changed) {
          return remaining;
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile, isFastDemoMode]);

  // Load voices initially so they are ready
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const handleVoicesChanged = () => {
        const bestVoice = getActiveVoice(activeProfile?.language);
        if (bestVoice) {
          setVoiceReminderStatus(`Active • Voice: ${bestVoice.name} (${bestVoice.lang})`);
        } else {
          setVoiceReminderStatus("Active • Standard Voice Loaded");
        }
      };
      window.speechSynthesis.onvoiceschanged = handleVoicesChanged;
      handleVoicesChanged();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile?.language]);

  return null; // Silent background engine
}

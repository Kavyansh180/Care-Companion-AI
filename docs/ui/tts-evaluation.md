# Feasibility Evaluation: Multilingual Text-to-Speech (TTS) for Voice Reminders

**Evaluated by:** Pakhi Shukla (23BCE10847)  
**Milestone:** Phase-1 Review 2 Feasibility Study  
**Scope:** Design & Feasibility Analysis (No Production Deployment Claimed)

---

## 1. Objective

Elderly patients frequently suffer from reduced visual acuity and cognitive fatigue, making screen-only popup notifications ineffective. The goal of this evaluation was to analyze the feasibility, performance, and multilingual coverage of Text-to-Speech (TTS) engines for delivering spoken medication reminders in the patient's native language.

---

## 2. TTS Engines Evaluated

Three primary approaches were investigated for feasibility:

| Approach | Engine / Technology | Latency | Multilingual Indian Languages | Offline Capability | Assessment |
|---|---|---|---|---|---|
| **Approach 1** | **Web Speech API (`SpeechSynthesis`)** | Zero (Local) | Native browser dependent (hi-IN, ta-IN, te-IN, kn-IN, en-IN) | Yes (Device native) | **Recommended for Phase-1 Prototype** |
| **Approach 2** | **Cloud Neural TTS (Google Cloud TTS / ElevenLabs)** | ~250–500ms | 100+ high-fidelity neural voices | No (Requires API & bandwidth) | Recommended for Phase-2 production |
| **Approach 3** | **On-Device Lightweight Neural (VITS / Piper)** | ~100ms | Limited regional voice models | Yes | High compute requirement for low-end mobile |

---

## 3. Evaluation of Web Speech API for Phase-1 Prototyping

### 3.1 Advantages:
- **Zero Cost & Zero Latency**: Executes directly in modern browsers (Chrome, Edge, Safari, Firefox) without external API overhead or cloud latency.
- **Privacy First**: Spoken medical notifications (including patient names and dosages) are synthesized locally on the device rather than transmitted to third-party audio generation servers.
- **Multilingual Support**: Supports standard language locales:
  - `en-US` / `en-IN` (English)
  - `hi-IN` (Hindi)
  - `ta-IN` (Tamil)
  - `te-IN` (Telugu)
  - `kn-IN` (Kannada)
  - `bn-IN` (Bengali)
  - `mr-IN` (Marathi)

### 3.2 Key Prototype Implementation Pattern:
```javascript
// Localized message formulation evaluated for Phase-1
function formulateVoiceReminder(patientName, medicineName, dosage, timeSlot, language) {
  if (language === "Hindi") {
    return `नमस्ते ${patientName} जी, यह आपकी ${medicineName} लेने का समय है। खुराक: ${dosage}।`;
  }
  return `Hello ${patientName}, it is time for your ${medicineName} medication. Dosage: ${dosage}.`;
}
```

---

## 4. Recommendations for Phase-2 Implementation

1. **Hybrid Architecture**: Use client-side Web Speech API for immediate offline fallbacks and explore server-side neural TTS for consistent natural pronunciation of complex pharmacological names.
2. **Audio Pacing**: Configure speech rate between `0.80x` and `0.85x` with standard pitch for clear comprehension by elderly listeners.
3. **Phase Boundary**: Voice reminder scheduling is implemented as a demonstration preview in Phase 1; automated telephonic/WhatsApp voice calls are deferred to Phase 2.

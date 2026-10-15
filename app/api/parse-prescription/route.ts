import { NextRequest, NextResponse } from "next/server";

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;
const MAX_BASE64_CHARS = 6_990_000; // about 5 MB once decoded
const SLOTS = ["morning", "afternoon", "evening", "night"] as const;
type Slot = (typeof SLOTS)[number];
const DEFAULT_TIMES: Record<Slot, string> = {
  morning: "08:00",
  afternoon: "13:00",
  evening: "18:00",
  night: "21:00",
};
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const positiveInt = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 1 ? Math.round(v) : null);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const imageBase64 = body?.imageBase64;
    const mediaType = body?.mediaType;

    if (typeof imageBase64 !== "string" || imageBase64.length === 0) {
      return NextResponse.json({ error: "No prescription image provided" }, { status: 400 });
    }
    if (typeof mediaType !== "string" || !ALLOWED_MEDIA_TYPES.includes(mediaType)) {
      return fail(400, "Unsupported image type. Use a JPG, PNG, WebP or HEIC photo.");
    }
    if (imageBase64.length > MAX_BASE64_CHARS) {
      return fail(413, "Image is larger than 5 MB");
    }
    if (!BASE64_PATTERN.test(imageBase64)) {
      return fail(400, "The image data is not valid base64.");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return fail(503, "Prescription reading is not set up on this server (GEMINI_API_KEY is missing).");
    }

    const prompt = `You read photos of doctor prescriptions for a medication reminder app.
Read the provided handwritten or printed prescription image.
Extract the patient name and every prescribed medication.

Return ONLY a valid JSON object (no markdown code blocks, no backticks, no explanatory text) matching EXACTLY this structure:
{
  "patient": "The patient name exactly as written on the prescription, or null if no patient name is written",
  "medications": [
    {
      "name": "Medicine name (e.g. Telmisartan)",
      "dosage": "Dosage (e.g. 40 mg)",
      "timing": "Morning | Afternoon | Evening | Night",
      "timeOfDay": ["morning"],
      "exactTime": "HH:MM in 24h format (e.g. 08:00 for morning, 13:00 for afternoon, 21:00 for night)",
      "duration_days": 30,
      "instructions": "Specific instructions (e.g. Take after breakfast)"
    }
  ]
}

Note: timeOfDay must only contain one or more of: "morning", "afternoon", "evening", "night".
If exactTime is not explicitly stated, infer standard schedule times (08:00 for morning, 13:00 for afternoon, 18:00 for evening, 21:00 for night).
Never invent a patient name. If the name is not visible, use null.`;

    let response: Response;
    try {
      response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ inline_data: { mime_type: mediaType, data: imageBase64 } }, { text: prompt }],
              },
            ],
            generationConfig: {
              response_mime_type: "application/json",
              temperature: 0.1,
            },
          }),
          signal: AbortSignal.timeout(30_000),
        }
      );
    } catch (err) {
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        console.error("Gemini request timed out");
        return fail(504, "Reading the prescription took too long. Please try again.");
      }
      throw err;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("Gemini request failed", response.status, data?.error?.message);
      return fail(502, data?.error?.message || "The AI service could not read this prescription.");
    }

    const unreadable = "The AI response could not be read. Please try a clearer photo.";
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof textOutput !== "string" || !textOutput) {
      console.error("Gemini returned no text");
      return fail(502, unreadable);
    }

    let parsedData: any;
    try {
      parsedData = JSON.parse(textOutput.replace(/```json|```/g, "").trim());
    } catch {
      console.error("Gemini output was not valid JSON");
      return fail(502, unreadable);
    }

    const rawMedications: any[] = (
      Array.isArray(parsedData?.medications) ? parsedData.medications : Array.isArray(parsedData) ? parsedData : []
    ).filter((m: unknown) => m && typeof m === "object");

    const patientName = text(parsedData?.patient);
    const patient = patientName && !/^(null|none|n\/a|unknown)$/i.test(patientName) ? patientName : null;

    // Map into normalized schedule items for the review step
    const meds = rawMedications.map((med, i) => {
      const slots: Slot[] = (Array.isArray(med.timeOfDay) ? med.timeOfDay : [text(med.timing).toLowerCase()]).filter(
        (s: unknown): s is Slot => SLOTS.includes(s as Slot)
      );
      const timeOfDay: Slot[] = slots.length > 0 ? [...new Set(slots)] : ["morning"];
      const exactTime = TIME_PATTERN.test(text(med.exactTime)) ? text(med.exactTime) : DEFAULT_TIMES[timeOfDay[0]];
      const duration = positiveInt(med.duration_days) ?? positiveInt(med.duration) ?? 30;
      const notes = text(med.instructions) || text(med.notes);
      const name = text(med.name);
      const dosage = text(med.dosage);

      return {
        id: `rx-med-${Date.now()}-${i}`,
        name,
        dosage,
        timing: text(med.timing) || timeOfDay[0].charAt(0).toUpperCase() + timeOfDay[0].slice(1),
        frequency: text(med.frequency) || "Daily",
        timeOfDay,
        exactTime,
        duration,
        duration_days: duration,
        notes,
        originalOcrData: { name, dosage, exactTime, duration, notes },
      };
    });

    return NextResponse.json({
      success: true,
      patient,
      medications: meds.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        timing: m.timing,
        timeOfDay: m.timeOfDay,
        exactTime: m.exactTime,
        duration_days: m.duration,
        instructions: m.notes,
      })),
      meds,
    });
  } catch (err) {
    console.error("Prescription route error", err instanceof Error ? err.message : "unknown");
    return fail(500, "Something went wrong while reading the prescription. Please try again.");
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { imageBase64, mediaType } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "No prescription image provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not configured in environment.");
      return NextResponse.json(
        { error: "Gemini API key is not configured on the server." },
        { status: 500 }
      );
    }

    const prompt = `You are a medical prescription parser for an AI Digital Caregiver feasibility proof-of-concept.
Read the provided handwritten or printed doctor prescription image.
Extract the patient name (if present) and every prescribed medication with accurate clinical parameters.

Return ONLY a valid JSON object (no markdown code blocks, no backticks, no explanatory text) matching EXACTLY this structure:
{
  "patient": "Patient name or Mr. Ramesh if not specified",
  "medications": [
    {
      "name": "Medicine name (e.g. Telmisartan)",
      "dosage": "Dosage (e.g. 40 mg)",
      "timing": "Morning | Afternoon | Evening | Night",
      "timeOfDay": ["morning"],
      "exactTime": "HH:MM in 24h format (e.g. 08:00 for morning, 13:00 for afternoon, 21:00 for night)",
      "duration_days": 30,
      "instructions": "Specific clinical instructions (e.g. Take after breakfast)"
    }
  ]
}

Note: timeOfDay must only contain one or more of: "morning", "afternoon", "evening", "night".
If exactTime is not explicitly stated, infer standard schedule times (08:00 for morning, 13:00 for afternoon, 18:00 for evening, 21:00 for night).`;

    const response = await fetch(
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
              parts: [
                {
                  inline_data: {
                    mime_type: mediaType || "image/jpeg",
                    data: imageBase64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", JSON.stringify(data));
      return NextResponse.json(
        { error: data?.error?.message || "AI prescription processing failed" },
        { status: 500 }
      );
    }

    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      console.error("Gemini: Empty text in response", JSON.stringify(data));
      return NextResponse.json(
        { error: "No response received from Gemini Vision AI" },
        { status: 500 }
      );
    }

    const cleaned = textOutput.replace(/```json|```/g, "").trim();
    const parsedData = JSON.parse(cleaned);

    const patientName = parsedData.patient || "Mr. Ramesh";
    const rawMedications = Array.isArray(parsedData.medications)
      ? parsedData.medications
      : Array.isArray(parsedData)
      ? parsedData
      : [];

    // Map into normalized schedule items for the UI prototype
    const medsWithIds = rawMedications.map((med: any, i: number) => {
      const exactTime =
        med.exactTime && med.exactTime !== "" ? med.exactTime : "08:00";
      const timing = med.timing || (Array.isArray(med.timeOfDay) ? med.timeOfDay[0] : "Morning");
      const timeOfDay = Array.isArray(med.timeOfDay) && med.timeOfDay.length > 0
        ? med.timeOfDay
        : [timing.toLowerCase()];
      const duration = typeof med.duration_days === "number"
        ? med.duration_days
        : typeof med.duration === "number"
        ? med.duration
        : 30;
      const notes = med.instructions || med.notes || "";

      return {
        id: `poc-med-${Date.now()}-${i}`,
        name: med.name ?? "Medication",
        dosage: med.dosage ?? "Standard dose",
        timing,
        frequency: med.frequency ?? "Daily",
        timeOfDay,
        exactTime,
        duration,
        duration_days: duration,
        notes,
        reminderStatus: "Scheduled",
        originalOcrData: {
          name: med.name ?? "",
          dosage: med.dosage ?? "",
          exactTime,
          duration,
          notes,
        },
      };
    });

    return NextResponse.json({
      success: true,
      patient: patientName,
      medications: rawMedications.map((m: any) => ({
        name: m.name || "",
        dosage: m.dosage || "",
        timing: m.timing || "Morning",
        duration_days: typeof m.duration_days === "number" ? m.duration_days : (typeof m.duration === "number" ? m.duration : 30),
        instructions: m.instructions || m.notes || "",
      })),
      meds: medsWithIds,
      rawOutput: parsedData,
    });
  } catch (err: any) {
    console.error("Prescription parsing route error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process prescription image" },
      { status: 500 }
    );
  }
}

import { getModelMetrics } from "@/lib/ml-client";

// Reads a live service per request: never prerender or cache (route segment config `dynamic`).
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getModelMetrics();
  if (!result.ok) {
    return Response.json({ error: "Model service unavailable", reason: result.reason }, { status: 503 });
  }
  return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
}

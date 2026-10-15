import type { NextRequest } from "next/server";
import { getCohortRisk } from "@/lib/ml-client";

// Reads a live service per request: never prerender or cache (route segment config `dynamic`).
export const dynamic = "force-dynamic";

const MAX_LIMIT = 250;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("limit");
  let limit = MAX_LIMIT;
  if (raw !== null) {
    limit = /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return Response.json({ error: `limit must be an integer from 1 to ${MAX_LIMIT}` }, { status: 400 });
    }
  }

  const result = await getCohortRisk(limit);
  if (!result.ok) {
    return Response.json({ error: "Model service unavailable", reason: result.reason }, { status: 503 });
  }
  return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
}

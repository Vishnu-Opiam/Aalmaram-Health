import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { ingestVendorInstagram } from "@/lib/services/feed-ingest";

// Fetching and curating every vendor can take a while.
export const maxDuration = 300;

/**
 * Daily vendor Instagram → Feed run (vercel.json "crons"). Vercel Cron sends
 * `Authorization: Bearer $CRON_SECRET`; without the secret configured the
 * route refuses everything rather than running for anyone.
 */
export async function GET(request: NextRequest) {
  const secret = env().CRON_SECRET;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const summary = await ingestVendorInstagram({ userId: null, label: "Daily feed update" });
  return NextResponse.json(summary);
}

import { NextResponse } from "next/server";
import { DateTime } from "luxon";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getTrainerSlots } from "@/lib/booking/service";
import { buildSchedulePrompt, type DayUtilisation } from "@/lib/ai/prompts";
import { generateText } from "@/lib/gemini";
import { allowRequest } from "@/lib/ratelimit";
import { DEFAULT_TIMEZONE } from "@/lib/i18n/format";

export const runtime = "nodejs";

const DAYS_AHEAD = 7;

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!allowRequest(`ai:schedule:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "no_profile" }, { status: 400 });
  }

  const now = new Date();
  const to = new Date(now.getTime() + DAYS_AHEAD * 24 * 60 * 60 * 1000);
  const slots = await getTrainerSlots(profile.id, now, to, now);

  // Group slots by calendar day (Europe/London).
  const byDay = new Map<string, { label: string; total: number; booked: number }>();
  for (const s of slots) {
    const dt = DateTime.fromJSDate(s.start, { zone: DEFAULT_TIMEZONE });
    const key = dt.toISODate()!;
    const entry = byDay.get(key) ?? {
      label: dt.toFormat("cccc d LLL"),
      total: 0,
      booked: 0,
    };
    entry.total += 1;
    if (s.booked) entry.booked += 1;
    byDay.set(key, entry);
  }

  const days: DayUtilisation[] = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({ day: v.label, total: v.total, booked: v.booked }));

  const prompt = buildSchedulePrompt({
    weekStart: DateTime.fromJSDate(now, { zone: DEFAULT_TIMEZONE }).toISODate()!,
    days,
  });

  let content: string;
  try {
    content = await generateText(prompt);
  } catch {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }

  await prisma.aiInsight.create({
    data: { type: "SCHEDULE_OPT", targetId: profile.id, content },
  });

  return NextResponse.json({ content });
}

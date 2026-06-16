import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedClient, clientHasHealthConsent } from "@/lib/clients/access";
import { recordAudit } from "@/lib/gdpr/audit";
import { buildClientSummaryPrompt } from "@/lib/ai/prompts";
import { generateText } from "@/lib/gemini";
import { allowRequest } from "@/lib/ratelimit";

export const runtime = "nodejs";

const bodySchema = z.object({ clientId: z.string().min(1) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!allowRequest(`ai:summary:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const client = await getOwnedClient(user.id, parsed.data.clientId);
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Summary draws on health notes, so it is consent-gated and audited.
  if (!(await clientHasHealthConsent(client.userId))) {
    return NextResponse.json({ error: "consent_missing" }, { status: 403 });
  }

  const clientId = client.id;
  const [completed, late, upcoming, notes, plan] = await Promise.all([
    prisma.appointment.count({ where: { clientId, status: "COMPLETED" } }),
    prisma.appointment.count({
      where: { clientId, status: { in: ["CANCELLED_LATE", "NO_SHOW"] } },
    }),
    prisma.appointment.count({
      where: { clientId, status: "BOOKED", startAt: { gte: new Date() } },
    }),
    prisma.healthNote.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { content: true },
    }),
    prisma.trainingPlan.findFirst({
      where: { clientId },
      orderBy: { startDate: "desc" },
      include: { items: { orderBy: { position: "asc" }, select: { content: true } } },
    }),
  ]);

  await recordAudit({
    actorId: user.id,
    action: "HEALTH_NOTE_VIEW",
    entity: "HealthNote",
    entityId: clientId,
    metadata: { reason: "ai_summary" },
  });

  // Minimised, de-identified prompt (no name/email/phone).
  const prompt = buildClientSummaryPrompt({
    sessionsCompleted: completed,
    lateCancellations: late,
    upcoming,
    notes: notes.map((n) => n.content),
    planItems: plan?.items.map((i) => i.content) ?? [],
  });

  let content: string;
  try {
    content = await generateText(prompt);
  } catch {
    return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
  }

  await prisma.aiInsight.create({
    data: { type: "CLIENT_SUMMARY", targetId: clientId, content },
  });

  return NextResponse.json({ content });
}

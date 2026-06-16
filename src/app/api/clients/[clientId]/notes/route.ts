import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedClient, clientHasHealthConsent } from "@/lib/clients/access";
import { recordAudit } from "@/lib/gdpr/audit";

export const runtime = "nodejs";

const noteSchema = z.object({ content: z.string().trim().min(1).max(5000) });

type Ctx = { params: Promise<{ clientId: string }> };

// List a client's health notes (special category). Consent-gated + audited.
export async function GET(_request: Request, { params }: Ctx) {
  const { clientId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const client = await getOwnedClient(user.id, clientId);
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!(await clientHasHealthConsent(client.userId))) {
    return NextResponse.json({ error: "consent_missing" }, { status: 403 });
  }

  const notes = await prisma.healthNote.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });
  await recordAudit({
    actorId: user.id,
    action: "HEALTH_NOTE_VIEW",
    entity: "HealthNote",
    entityId: clientId,
    metadata: { count: notes.length },
  });

  return NextResponse.json({ notes });
}

// Add a health note about a client. Consent-gated + audited.
export async function POST(request: Request, { params }: Ctx) {
  const { clientId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const client = await getOwnedClient(user.id, clientId);
  if (!client) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (!(await clientHasHealthConsent(client.userId))) {
    return NextResponse.json({ error: "consent_missing" }, { status: 403 });
  }

  const parsed = noteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const note = await prisma.healthNote.create({
    data: { clientId, content: parsed.data.content },
  });
  await recordAudit({
    actorId: user.id,
    action: "HEALTH_NOTE_CREATE",
    entity: "HealthNote",
    entityId: note.id,
  });

  return NextResponse.json({ note }, { status: 201 });
}

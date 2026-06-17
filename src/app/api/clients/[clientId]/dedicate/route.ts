import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  trainerProfileIdForUser,
  hasConsultationWith,
} from "@/lib/clients/access";
import { recordAudit } from "@/lib/gdpr/audit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ clientId: string }> };

// Trainer dedicates a client to themselves after a consultation.
export async function POST(_request: Request, { params }: Ctx) {
  const { clientId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const trainerId = await trainerProfileIdForUser(user.id);
  if (!trainerId) {
    return NextResponse.json({ error: "no_profile" }, { status: 400 });
  }

  const client = await prisma.clientProfile.findUnique({
    where: { id: clientId },
    select: { id: true, trainerId: true },
  });
  if (!client) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (client.trainerId && client.trainerId !== trainerId) {
    return NextResponse.json({ error: "already_dedicated" }, { status: 409 });
  }
  // Can only dedicate a client you have actually consulted.
  if (!(await hasConsultationWith(trainerId, clientId))) {
    return NextResponse.json({ error: "no_consultation" }, { status: 409 });
  }

  await prisma.clientProfile.update({
    where: { id: clientId },
    data: { trainerId },
  });
  await recordAudit({
    actorId: user.id,
    action: "CLIENT_DEDICATE",
    entity: "ClientProfile",
    entityId: clientId,
  });

  return NextResponse.json({ ok: true });
}

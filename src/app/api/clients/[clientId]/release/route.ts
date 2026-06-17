import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  trainerProfileIdForUser,
  hasConsultationWith,
} from "@/lib/clients/access";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ clientId: string }> };

// Trainer ends the relationship with a client (e.g. consultation not a fit):
// cancels their future appointments together and, if dedicated, un-dedicates
// the client so they are free to consult another trainer.
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

  const dedicatedToMe = client.trainerId === trainerId;
  const consulted = await hasConsultationWith(trainerId, clientId);
  if (!dedicatedToMe && !consulted) {
    return NextResponse.json({ error: "no_relationship" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    // Cancel future booked appointments between this trainer and client.
    await tx.appointment.updateMany({
      where: {
        trainerId,
        clientId,
        status: "BOOKED",
        startAt: { gte: new Date() },
      },
      data: { status: "CANCELLED_FREE", cancelledAt: new Date() },
    });
    if (dedicatedToMe) {
      await tx.clientProfile.update({
        where: { id: clientId },
        data: { trainerId: null },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "CLIENT_RELEASE",
        entity: "ClientProfile",
        entityId: clientId,
      },
    });
  });

  return NextResponse.json({ ok: true });
}

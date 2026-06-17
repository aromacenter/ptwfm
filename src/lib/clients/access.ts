import { prisma } from "@/lib/db";
import { hasActiveConsent, type ConsentRecord } from "@/lib/gdpr/consent";

export type TrainerClient = {
  id: string;
  userId: string;
  name: string;
  email: string;
};

/**
 * Loads a client only if they belong to the given trainer (by the trainer's
 * user id). Returns null otherwise — used to authorise every client access.
 */
export async function getOwnedClient(
  trainerUserId: string,
  clientId: string,
): Promise<TrainerClient | null> {
  const client = await prisma.clientProfile.findFirst({
    where: { id: clientId, trainer: { userId: trainerUserId } },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!client) return null;
  return {
    id: client.id,
    userId: client.userId,
    name: client.user.name,
    email: client.user.email,
  };
}

/** The trainer profile id for a trainer user, or null. */
export async function trainerProfileIdForUser(
  userId: string,
): Promise<string | null> {
  const p = await prisma.trainerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return p?.id ?? null;
}

/** Whether the trainer has at least one consultation booked with the client. */
export async function hasConsultationWith(
  trainerId: string,
  clientId: string,
): Promise<boolean> {
  const count = await prisma.appointment.count({
    where: { trainerId, clientId, kind: "CONSULTATION" },
  });
  return count > 0;
}

/** Whether the client (by user id) currently consents to health-data processing. */
export async function clientHasHealthConsent(
  clientUserId: string,
): Promise<boolean> {
  const consents = (await prisma.consent.findMany({
    where: { userId: clientUserId },
  })) as ConsentRecord[];
  return hasActiveConsent(consents, "HEALTH_DATA");
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { CONSENT_VERSION } from "@/lib/gdpr/consent";
import { consentSchema } from "@/lib/validation/gdpr";

export const runtime = "nodejs";

// Grant or withdraw a consent. Each action appends a new immutable Consent
// row so the full consent history is preserved (UK GDPR accountability).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { type, granted } = parsed.data;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.consent.create({
      data: {
        userId: user.id,
        type,
        version: CONSENT_VERSION,
        granted,
        grantedAt: granted ? now : null,
        withdrawnAt: granted ? null : now,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: granted ? "CONSENT_GRANT" : "CONSENT_WITHDRAW",
        entity: "Consent",
        entityId: user.id,
        metadata: { type, version: CONSENT_VERSION },
      },
    });
  });

  return NextResponse.json({ ok: true });
}

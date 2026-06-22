import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validation/auth";
import { CONSENT_VERSION } from "@/lib/gdpr/consent";
import { rateLimit, clientIp } from "@/lib/ratelimit-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  // Throttle sign-ups per IP to deter abuse / enumeration.
  if (!(await rateLimit(`register:${clientIp(request)}`, 10, 10 * 60_000))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalidBody" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "invalid", field: first?.path[0] },
      { status: 400 },
    );
  }

  const { name, email, password, role, healthConsent, goal } = parsed.data;
  // Goals are a client concept; ignore any value sent for a trainer sign-up.
  const userGoal = role === "CLIENT" ? (goal ?? null) : null;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "auth.emailTaken", field: "email" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, passwordHash, role, goal: userGoal },
      });

      // Record explicit consents (UK GDPR). Terms for everyone; health data
      // (Art. 9 special category) when the user explicitly opted in.
      const consents: {
        userId: string;
        type: "TERMS" | "HEALTH_DATA";
        version: string;
        granted: boolean;
        grantedAt: Date;
      }[] = [
        {
          userId: created.id,
          type: "TERMS",
          version: CONSENT_VERSION,
          granted: true,
          grantedAt: now,
        },
      ];
      if (healthConsent) {
        consents.push({
          userId: created.id,
          type: "HEALTH_DATA",
          version: CONSENT_VERSION,
          granted: true,
          grantedAt: now,
        });
      }
      await tx.consent.createMany({ data: consents });

      await tx.auditLog.create({
        data: {
          actorId: created.id,
          action: "USER_REGISTER",
          entity: "User",
          entityId: created.id,
          metadata: { role, healthConsent, goal: userGoal },
        },
      });

      if (role === "TRAINER") {
        await tx.trainerProfile.create({ data: { userId: created.id } });
      }
      // Client profiles are created when the client selects a trainer (M3).

      return created;
    });

    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (err) {
    console.error("registration failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

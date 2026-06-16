import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { buildErasureUserUpdate } from "@/lib/gdpr/anonymize";

export const runtime = "nodejs";

// UK GDPR right to erasure (Art. 17). We delete special-category health data
// and anonymise the user's personal data, while retaining financial records
// (payments) we are legally required to keep — these carry no direct PII.
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await prisma.$transaction(async (tx) => {
    const client = await tx.clientProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (client) {
      // Erase special-category health data entirely.
      await tx.healthNote.deleteMany({ where: { clientId: client.id } });
    }

    await tx.user.update({
      where: { id: user.id },
      data: buildErasureUserUpdate(user.id),
    });

    await tx.dataRequest.create({
      data: {
        userId: user.id,
        type: "ERASURE",
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "DATA_ERASURE",
        entity: "User",
        entityId: user.id,
        metadata: { retainedFinancialRecords: true },
      },
    });
  });

  return NextResponse.json({ ok: true });
}

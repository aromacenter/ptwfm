import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/gdpr/audit";
import { buildExportPackage } from "@/lib/gdpr/export";

export const runtime = "nodejs";

// UK GDPR right of access / portability: download all personal data as JSON.
export async function GET() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    include: {
      consents: true,
      clientProfile: {
        include: {
          appointments: true,
          payments: true,
          healthNotes: true,
        },
      },
    },
  });
  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const client = user.clientProfile;
  const pkg = buildExportPackage({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      locale: user.locale,
      createdAt: user.createdAt,
    },
    consents: user.consents,
    appointments: client?.appointments ?? [],
    payments: client?.payments ?? [],
    healthNotes: client?.healthNotes ?? [],
  });

  await recordAudit({
    actorId: user.id,
    action: "DATA_EXPORT",
    entity: "User",
    entityId: user.id,
  });

  return new NextResponse(JSON.stringify(pkg, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="pt-management-data-export.json"`,
    },
  });
}

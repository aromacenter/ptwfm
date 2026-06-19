import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

// A trainer marks that they've reached out to a prospective client. Idempotent
// (upsert), so re-marking is a no-op.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const profile = await prisma.trainerProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!profile) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const req = await prisma.trainerRequest.findUnique({
    where: { id: requestId },
    select: { id: true },
  });
  if (!req) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    await prisma.trainerRequestResponse.upsert({
      where: {
        requestId_trainerId: { requestId, trainerId: profile.id },
      },
      create: { requestId, trainerId: profile.id },
      update: {},
    });
  } catch (err) {
    console.error("trainer request respond failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

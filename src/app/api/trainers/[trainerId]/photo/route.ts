import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ trainerId: string }> };

// Public: serve a trainer's profile photo. 404 when none is set (the UI then
// shows an initials avatar).
export async function GET(_request: Request, { params }: Ctx) {
  const { trainerId } = await params;
  const profile = await prisma.trainerProfile.findUnique({
    where: { id: trainerId },
    select: { photoData: true, photoMime: true },
  });
  if (!profile?.photoData || !profile.photoMime) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(profile.photoData), {
    status: 200,
    headers: {
      "Content-Type": profile.photoMime,
      "Cache-Control": "public, max-age=300",
    },
  });
}

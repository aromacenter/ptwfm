import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { validateImageUpload, sniffImageType } from "@/lib/validation/image";

export const runtime = "nodejs";

// Upload (or replace) the signed-in trainer's profile photo.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }

  const check = validateImageUpload(file.type, file.size);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Verify the real content matches an allowed image (defends against a
  // spoofed Content-Type). Store the sniffed type, not the client-claimed one.
  const realType = sniffImageType(bytes);
  if (!realType) {
    return NextResponse.json({ error: "type" }, { status: 400 });
  }

  await prisma.trainerProfile.update({
    where: { userId: user.id },
    data: { photoData: bytes, photoMime: realType },
  });

  return NextResponse.json({ ok: true });
}

// Remove the photo.
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await prisma.trainerProfile.update({
    where: { userId: user.id },
    data: { photoData: null, photoMime: null },
  });
  return NextResponse.json({ ok: true });
}

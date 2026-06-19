import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getOwnedClient,
  trainerProfileIdForUser,
} from "@/lib/clients/access";
import { workoutSchema } from "@/lib/validation/plans";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ clientId: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { clientId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await getOwnedClient(user.id, clientId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const programs = await prisma.workoutProgram.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ programs });
}

export async function POST(request: Request, { params }: Ctx) {
  const { clientId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await getOwnedClient(user.id, clientId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const trainerId = await trainerProfileIdForUser(user.id);
  if (!trainerId) {
    return NextResponse.json({ error: "no_profile" }, { status: 400 });
  }

  const parsed = workoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { title, notes, days } = parsed.data;

  const program = await prisma.workoutProgram.create({
    data: { trainerId, clientId, title, data: { notes, days } },
  });
  return NextResponse.json({ program }, { status: 201 });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { clientId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const trainerId = await trainerProfileIdForUser(user.id);
  const id = new URL(request.url).searchParams.get("id");
  if (!trainerId || !id) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const result = await prisma.workoutProgram.deleteMany({
    where: { id, trainerId, clientId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

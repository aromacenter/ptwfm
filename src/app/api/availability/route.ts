import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { availabilityRuleSchema } from "@/lib/validation/booking";

export const runtime = "nodejs";

async function trainerProfileId(userId: string): Promise<string | null> {
  const profile = await prisma.trainerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return profile?.id ?? null;
}

// List the signed-in trainer's weekly availability rules.
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const trainerId = await trainerProfileId(user.id);
  if (!trainerId) return NextResponse.json({ rules: [] });

  const rules = await prisma.availabilityRule.findMany({
    where: { trainerId },
    orderBy: [{ dayOfWeek: "asc" }, { startHour: "asc" }],
  });
  return NextResponse.json({ rules });
}

// Add a weekly availability rule.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const trainerId = await trainerProfileId(user.id);
  if (!trainerId) {
    return NextResponse.json({ error: "no_profile" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = availabilityRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const rule = await prisma.availabilityRule.create({
    data: { trainerId, ...parsed.data },
  });
  return NextResponse.json({ rule }, { status: 201 });
}

// Remove a rule (only the owner's).
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const trainerId = await trainerProfileId(user.id);
  const id = new URL(request.url).searchParams.get("id");
  if (!trainerId || !id) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Scope the delete to the owner so trainers can't remove others' rules.
  const result = await prisma.availabilityRule.deleteMany({
    where: { id, trainerId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

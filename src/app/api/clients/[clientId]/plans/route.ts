import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getOwnedClient } from "@/lib/clients/access";
import { planSchema } from "@/lib/validation/planning";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ clientId: string }> };

async function trainerProfileId(userId: string): Promise<string | null> {
  const p = await prisma.trainerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return p?.id ?? null;
}

// List a client's training plans (most recent first).
export async function GET(_request: Request, { params }: Ctx) {
  const { clientId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await getOwnedClient(user.id, clientId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const plans = await prisma.trainingPlan.findMany({
    where: { clientId },
    orderBy: { startDate: "desc" },
    include: { items: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json({ plans });
}

// Create a day/week/month training plan for a client.
export async function POST(request: Request, { params }: Ctx) {
  const { clientId } = await params;
  const user = await getCurrentUser();
  if (!user || user.role !== "TRAINER") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await getOwnedClient(user.id, clientId))) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const trainerId = await trainerProfileId(user.id);
  if (!trainerId) {
    return NextResponse.json({ error: "no_profile" }, { status: 400 });
  }

  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { scope, title, startDate, endDate, items } = parsed.data;

  const plan = await prisma.trainingPlan.create({
    data: {
      trainerId,
      clientId,
      scope,
      title,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      items: {
        create: items.map((content, i) => ({ position: i, content })),
      },
    },
    include: { items: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json({ plan }, { status: 201 });
}

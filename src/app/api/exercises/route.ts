import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Public read of the exercise library, used by the workout builder's picker.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  const where: Prisma.ExerciseWhereInput = q
    ? { name: { contains: q, mode: "insensitive" } }
    : {};

  const exercises = await prisma.exercise.findMany({
    where,
    orderBy: { name: "asc" },
    take: 200,
    select: { slug: true, name: true, primaryMuscles: true, equipment: true },
  });

  return NextResponse.json({ exercises });
}

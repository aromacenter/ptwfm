import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { trainerRequestSchema } from "@/lib/validation/trainer-request";

export const runtime = "nodejs";

// Public: a prospective client posts a "find me a trainer" request. Trainers
// browse open requests and reach out.
export async function POST(request: Request) {
  const parsed = trainerRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: "invalid", field: first?.path.join("."), message: first?.message },
      { status: 400 },
    );
  }
  const { name, email, goal, city, online } = parsed.data;

  try {
    await prisma.trainerRequest.create({
      data: { name, email, goal, city: city || null, online },
    });
  } catch (err) {
    console.error("trainer request create failed", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

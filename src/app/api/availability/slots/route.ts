import { NextResponse } from "next/server";
import { getTrainerSlots } from "@/lib/booking/service";

export const runtime = "nodejs";

// Public: the available slots for a trainer within a date range. Returns only
// the bookable (not-booked) slots so clients never see who else is booked.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const trainerId = url.searchParams.get("trainerId");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  if (!trainerId || !fromParam || !toParam) {
    return NextResponse.json({ error: "missing_params" }, { status: 400 });
  }
  const from = new Date(fromParam);
  const to = new Date(toParam);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "invalid_dates" }, { status: 400 });
  }

  const slots = await getTrainerSlots(trainerId, from, to);
  return NextResponse.json({
    slots: slots
      .filter((s) => !s.booked)
      .map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
  });
}

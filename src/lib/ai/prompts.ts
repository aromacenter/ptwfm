// Pure helpers that build Gemini prompts from minimised, de-identified data.
// They must never include personally identifying data (names, emails, phones).

export type DayUtilisation = { day: string; total: number; booked: number };

export function computeUtilisation(total: number, booked: number): number {
  if (total <= 0) return 0;
  return Math.round((booked / total) * 100);
}

export function buildSchedulePrompt(input: {
  weekStart: string;
  days: DayUtilisation[];
}): string {
  const total = input.days.reduce((s, d) => s + d.total, 0);
  const booked = input.days.reduce((s, d) => s + d.booked, 0);
  const pct = computeUtilisation(total, booked);
  const lines = input.days
    .map((d) => `- ${d.day}: ${d.booked}/${d.total} slots booked`)
    .join("\n");

  return [
    "You are assisting a personal trainer with weekly schedule optimisation.",
    `Week starting ${input.weekStart}. Availability and bookings:`,
    lines,
    `Overall utilisation: ${pct}%.`,
    "Suggest 3 concise, practical actions to improve utilisation and balance the week.",
    "Use only the figures above. Do not invent or identify any client.",
  ].join("\n");
}

export function buildClientSummaryPrompt(input: {
  sessionsCompleted: number;
  lateCancellations: number;
  upcoming: number;
  notes: string[];
  planItems: string[];
}): string {
  const notes = input.notes.length
    ? input.notes.map((n) => `- ${n}`).join("\n")
    : "- (none)";
  const plan = input.planItems.length
    ? input.planItems.map((p) => `- ${p}`).join("\n")
    : "- (none)";

  return [
    "Summarise this personal-training client's progress for their trainer.",
    "Use only the data provided. Do not invent details or identify the person by name.",
    `Sessions completed: ${input.sessionsCompleted}`,
    `Late cancellations / no-shows: ${input.lateCancellations}`,
    `Upcoming sessions: ${input.upcoming}`,
    "Trainer notes:",
    notes,
    "Current plan items:",
    plan,
    "Write 3-4 sentences, then 2 short focus suggestions.",
  ].join("\n");
}

import { z } from "zod";

export const availabilityRuleSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
  })
  .refine((r) => r.startHour < r.endHour, {
    message: "startHour must be before endHour",
    path: ["endHour"],
  });

export const bookingSchema = z.object({
  trainerId: z.string().min(1),
  start: z.string().datetime(), // ISO 8601 UTC instant
});

export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;

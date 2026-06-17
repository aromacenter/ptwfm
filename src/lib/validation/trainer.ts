import { z } from "zod";

export const trainerProfileSchema = z.object({
  headline: z.string().trim().max(120),
  bio: z.string().trim().max(2000),
  acceptingClients: z.boolean(),
  hourlyRatePence: z.number().int().min(0).max(100_000_00), // up to £100,000
});

export type TrainerProfileInput = z.infer<typeof trainerProfileSchema>;

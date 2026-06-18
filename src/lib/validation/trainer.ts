import { z } from "zod";

export const trainerProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  headline: z.string().trim().max(120),
  bio: z.string().trim().max(2000),
  specialties: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  qualifications: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  acceptingClients: z.boolean(),
  hourlyRatePence: z.number().int().min(0).max(100_000_00), // up to £100,000
});

export type TrainerProfileInput = z.infer<typeof trainerProfileSchema>;

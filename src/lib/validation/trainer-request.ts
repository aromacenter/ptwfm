import { z } from "zod";

export const trainerRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  goal: z.string().trim().min(1).max(2000),
  city: z.string().trim().max(100).default(""),
  online: z.boolean().default(false),
  // Must be explicitly true — evidences GDPR consent to store contact details.
  consent: z.literal(true),
});

export type TrainerRequestInput = z.infer<typeof trainerRequestSchema>;

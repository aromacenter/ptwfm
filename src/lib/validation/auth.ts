import { z } from "zod";

// Client training goals (must match the Prisma TrainingGoal enum).
export const TRAINING_GOALS = [
  "WEIGHT_LOSS",
  "MUSCLE_GAIN",
  "STRENGTH",
  "ENDURANCE",
  "HEALTH",
  "GENERAL",
] as const;

// Error messages are i18n keys; the UI maps them via next-intl.
export const loginSchema = z.object({
  email: z.string().email("validation.emailInvalid"),
  password: z.string().min(1, "validation.passwordTooShort"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "validation.nameRequired"),
    email: z.string().email("validation.emailInvalid"),
    password: z.string().min(8, "validation.passwordTooShort"),
    role: z.enum(["CLIENT", "TRAINER"]),
    // Optional primary goal chosen at sign-up (clients only).
    goal: z.enum(TRAINING_GOALS).optional(),
    // Terms (incl. 24h cancellation policy) must be accepted by everyone.
    termsConsent: z.literal(true, {
      message: "validation.consentRequired",
    }),
    // Explicit health-data consent (UK GDPR Art. 9) — required for clients,
    // who will have health/fitness notes attached.
    healthConsent: z.boolean(),
  })
  .refine((data) => data.role !== "CLIENT" || data.healthConsent === true, {
    message: "validation.consentRequired",
    path: ["healthConsent"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

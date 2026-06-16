import { z } from "zod";

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

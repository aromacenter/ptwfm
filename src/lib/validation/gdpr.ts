import { z } from "zod";

export const consentSchema = z.object({
  type: z.enum(["HEALTH_DATA", "MARKETING", "COOKIES", "TERMS"]),
  granted: z.boolean(),
});

export type ConsentInput = z.infer<typeof consentSchema>;

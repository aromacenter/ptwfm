import { z } from "zod";

export const planSchema = z
  .object({
    scope: z.enum(["DAY", "WEEK", "MONTH"]),
    title: z.string().trim().min(1).max(200),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    items: z.array(z.string().trim().min(1).max(2000)).max(100).default([]),
  })
  .refine((p) => new Date(p.startDate) <= new Date(p.endDate), {
    message: "startDate must be on or before endDate",
    path: ["endDate"],
  });

export type PlanInput = z.infer<typeof planSchema>;

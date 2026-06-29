import { z } from "zod";

// Workout program: days of exercises. Sets/reps kept as free text for
// flexibility ("3", "8-12", "30s", "AMRAP").
export const workoutSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).default(""),
  days: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(100),
        exercises: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(200),
              // Optional reference to a library Exercise (links to its page /
              // muscle info). Free-text exercises just leave this empty.
              slug: z.string().trim().max(100).default(""),
              sets: z.string().trim().max(20).default(""),
              reps: z.string().trim().max(50).default(""),
              notes: z.string().trim().max(300).default(""),
            }),
          )
          .max(50)
          .default([]),
      }),
    )
    .min(1)
    .max(14),
});

// Nutrition plan: meals of food items with optional macros (per item).
export const nutritionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).default(""),
  meals: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        items: z
          .array(
            z.object({
              food: z.string().trim().min(1).max(200),
              qty: z.string().trim().max(50).default(""),
              kcal: z.number().min(0).max(10000).default(0),
              protein: z.number().min(0).max(2000).default(0),
              carbs: z.number().min(0).max(2000).default(0),
              fat: z.number().min(0).max(2000).default(0),
            }),
          )
          .max(50)
          .default([]),
      }),
    )
    .min(1)
    .max(20),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;
export type NutritionInput = z.infer<typeof nutritionSchema>;

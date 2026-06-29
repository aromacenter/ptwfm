import type { MuscleGroup, Equipment, ExerciseCategory } from "@prisma/client";

// Display order for filters / chips (i18n labels live under the matching keys).
export const MUSCLE_ORDER: MuscleGroup[] = [
  "CHEST",
  "UPPER_BACK",
  "LATS",
  "LOWER_BACK",
  "TRAPS",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
  "ABS",
  "OBLIQUES",
  "GLUTES",
  "QUADS",
  "HAMSTRINGS",
  "CALVES",
  "ADDUCTORS",
  "NECK",
  "FULL_BODY",
];

export const EQUIPMENT_ORDER: Equipment[] = [
  "BARBELL",
  "DUMBBELL",
  "KETTLEBELL",
  "CABLE",
  "MACHINE",
  "BODYWEIGHT",
  "RESISTANCE_BAND",
  "PLATE",
  "BENCH",
  "OTHER",
];

export const CATEGORY_ORDER: ExerciseCategory[] = [
  "PUSH",
  "PULL",
  "LEGS",
  "CORE",
  "CARDIO",
  "FULL_BODY",
  "MOBILITY",
];

export function isMuscle(v: string): v is MuscleGroup {
  return (MUSCLE_ORDER as string[]).includes(v);
}
export function isEquipment(v: string): v is Equipment {
  return (EQUIPMENT_ORDER as string[]).includes(v);
}

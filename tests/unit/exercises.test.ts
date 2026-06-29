import { describe, it, expect } from "vitest";
import {
  MuscleGroup,
  Equipment,
  ExerciseCategory,
} from "@prisma/client";
import { EXERCISES } from "@/lib/exercises/data";
import { MUSCLE_ORDER, EQUIPMENT_ORDER, CATEGORY_ORDER } from "@/lib/exercises/meta";

describe("exercise meta ordering", () => {
  it("covers every enum value exactly once", () => {
    expect([...MUSCLE_ORDER].sort()).toEqual(Object.values(MuscleGroup).sort());
    expect([...EQUIPMENT_ORDER].sort()).toEqual(Object.values(Equipment).sort());
    expect([...CATEGORY_ORDER].sort()).toEqual(
      Object.values(ExerciseCategory).sort(),
    );
  });
});

describe("exercise seed data integrity", () => {
  it("has unique kebab-case slugs", () => {
    const slugs = EXERCISES.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("uses only valid enum values and has at least one primary muscle", () => {
    const muscles = new Set<string>(Object.values(MuscleGroup));
    const equip = new Set<string>(Object.values(Equipment));
    const cats = new Set<string>(Object.values(ExerciseCategory));
    for (const e of EXERCISES) {
      expect(e.primaryMuscles.length).toBeGreaterThan(0);
      expect(equip.has(e.equipment)).toBe(true);
      expect(cats.has(e.category)).toBe(true);
      for (const m of [...e.primaryMuscles, ...e.secondaryMuscles]) {
        expect(muscles.has(m)).toBe(true);
      }
      // primary and secondary should not overlap
      const inBoth = e.primaryMuscles.filter((m) => e.secondaryMuscles.includes(m));
      expect(inBoth).toEqual([]);
    }
  });

  it("gives every exercise at least one cue", () => {
    for (const e of EXERCISES) expect(e.cues.length).toBeGreaterThan(0);
  });
});

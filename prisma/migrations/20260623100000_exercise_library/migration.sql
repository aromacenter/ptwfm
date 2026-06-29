-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('CHEST', 'UPPER_BACK', 'LATS', 'LOWER_BACK', 'TRAPS', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'FOREARMS', 'ABS', 'OBLIQUES', 'GLUTES', 'QUADS', 'HAMSTRINGS', 'CALVES', 'ADDUCTORS', 'NECK', 'FULL_BODY');

-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('BARBELL', 'DUMBBELL', 'KETTLEBELL', 'CABLE', 'MACHINE', 'BODYWEIGHT', 'RESISTANCE_BAND', 'PLATE', 'BENCH', 'OTHER');

-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('PUSH', 'PULL', 'LEGS', 'CORE', 'CARDIO', 'FULL_BODY', 'MOBILITY');

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ExerciseCategory" NOT NULL,
    "equipment" "Equipment" NOT NULL,
    "primaryMuscles" "MuscleGroup"[] DEFAULT ARRAY[]::"MuscleGroup"[],
    "secondaryMuscles" "MuscleGroup"[] DEFAULT ARRAY[]::"MuscleGroup"[],
    "cues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_slug_key" ON "Exercise"("slug");

-- CreateIndex
CREATE INDEX "Exercise_category_idx" ON "Exercise"("category");


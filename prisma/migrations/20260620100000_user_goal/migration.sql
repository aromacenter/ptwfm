-- CreateEnum
CREATE TYPE "TrainingGoal" AS ENUM ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'STRENGTH', 'ENDURANCE', 'HEALTH', 'GENERAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "goal" "TrainingGoal";


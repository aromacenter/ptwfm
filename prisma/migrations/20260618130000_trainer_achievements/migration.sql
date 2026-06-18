-- AlterTable: trainer achievements / results (public)
ALTER TABLE "TrainerProfile" ADD COLUMN "achievements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

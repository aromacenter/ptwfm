-- AlterTable: trainer specialist areas + qualifications (public)
ALTER TABLE "TrainerProfile" ADD COLUMN "specialties" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "TrainerProfile" ADD COLUMN "qualifications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

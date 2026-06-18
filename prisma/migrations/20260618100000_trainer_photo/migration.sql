-- AlterTable: trainer profile photo (stored in DB, served via API)
ALTER TABLE "TrainerProfile" ADD COLUMN "photoData" BYTEA;
ALTER TABLE "TrainerProfile" ADD COLUMN "photoMime" TEXT;

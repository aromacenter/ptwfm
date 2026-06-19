-- AlterTable
ALTER TABLE "TrainerProfile" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT NOT NULL DEFAULT 'GB',
ADD COLUMN     "inPerson" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "online" BOOLEAN NOT NULL DEFAULT false;


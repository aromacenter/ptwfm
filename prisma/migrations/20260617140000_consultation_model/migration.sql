-- CreateEnum
CREATE TYPE "AppointmentKind" AS ENUM ('SESSION', 'CONSULTATION');

-- AlterTable: TrainerProfile public/directory fields
ALTER TABLE "TrainerProfile" ADD COLUMN "headline" TEXT;
ALTER TABLE "TrainerProfile" ADD COLUMN "acceptingClients" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Appointment kind
ALTER TABLE "Appointment" ADD COLUMN "kind" "AppointmentKind" NOT NULL DEFAULT 'SESSION';

-- AlterTable: ClientProfile.trainerId becomes nullable (dedicated on demand)
ALTER TABLE "ClientProfile" DROP CONSTRAINT "ClientProfile_trainerId_fkey";
ALTER TABLE "ClientProfile" ALTER COLUMN "trainerId" DROP NOT NULL;
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "TrainerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

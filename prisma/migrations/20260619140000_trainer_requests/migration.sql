-- CreateTable
CREATE TABLE "TrainerRequest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "city" TEXT,
    "online" BOOLEAN NOT NULL DEFAULT false,
    "open" BOOLEAN NOT NULL DEFAULT true,
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerRequestResponse" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainerRequestResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainerRequest_open_createdAt_idx" ON "TrainerRequest"("open", "createdAt");

-- CreateIndex
CREATE INDEX "TrainerRequestResponse_trainerId_idx" ON "TrainerRequestResponse"("trainerId");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerRequestResponse_requestId_trainerId_key" ON "TrainerRequestResponse"("requestId", "trainerId");

-- AddForeignKey
ALTER TABLE "TrainerRequestResponse" ADD CONSTRAINT "TrainerRequestResponse_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TrainerRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerRequestResponse" ADD CONSTRAINT "TrainerRequestResponse_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "TrainerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;


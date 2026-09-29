-- AlterTable
ALTER TABLE "people" ADD COLUMN     "middleName" TEXT,
ADD COLUMN     "secondLastName" TEXT;

-- CreateIndex
CREATE INDEX "people_userId_middleName_idx" ON "people"("userId", "middleName");

-- CreateIndex
CREATE INDEX "people_userId_secondLastName_idx" ON "people"("userId", "secondLastName");

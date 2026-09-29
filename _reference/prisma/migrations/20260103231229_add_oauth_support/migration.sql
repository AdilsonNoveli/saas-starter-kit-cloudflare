-- AlterTable
ALTER TABLE "users"
ADD COLUMN "provider" TEXT,
ADD COLUMN "providerAccountId" TEXT,
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_provider_providerAccountId_key" ON "users"("provider", "providerAccountId");

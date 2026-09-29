-- CreateEnum
CREATE TYPE "ReminderEntityType" AS ENUM ('IMPORTANT_DATE', 'CONTACT');

-- CreateTable
CREATE TABLE "unsubscribe_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reminderType" "ReminderEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unsubscribe_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unsubscribe_tokens_token_key" ON "unsubscribe_tokens"("token");

-- CreateIndex
CREATE INDEX "unsubscribe_tokens_token_idx" ON "unsubscribe_tokens"("token");

-- CreateIndex
CREATE INDEX "unsubscribe_tokens_userId_idx" ON "unsubscribe_tokens"("userId");

-- CreateIndex
CREATE INDEX "unsubscribe_tokens_entityId_reminderType_idx" ON "unsubscribe_tokens"("entityId", "reminderType");

-- CreateIndex
CREATE INDEX "unsubscribe_tokens_expiresAt_idx" ON "unsubscribe_tokens"("expiresAt");

-- AddForeignKey
ALTER TABLE "unsubscribe_tokens" ADD CONSTRAINT "unsubscribe_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

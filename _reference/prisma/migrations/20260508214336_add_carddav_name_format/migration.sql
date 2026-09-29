-- CreateEnum
CREATE TYPE "CardDavNameFormat" AS ENUM ('FULL', 'NICKNAME_PREFERRED', 'SHORT');

-- DropIndex
DROP INDEX "custom_field_templates_userId_slug_active_key";

-- AlterTable
ALTER TABLE "carddav_connections" ADD COLUMN     "cardDavNameFormat" "CardDavNameFormat" NOT NULL DEFAULT 'FULL';

-- AlterTable
ALTER TABLE "people" ADD COLUMN     "cardDavDisplayName" TEXT;

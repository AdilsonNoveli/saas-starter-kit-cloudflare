-- CreateEnum
CREATE TYPE "NameOrder" AS ENUM ('WESTERN', 'EASTERN');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "nameOrder" "NameOrder" NOT NULL DEFAULT 'WESTERN';

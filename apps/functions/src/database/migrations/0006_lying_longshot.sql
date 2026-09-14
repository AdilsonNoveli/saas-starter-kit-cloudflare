ALTER TABLE "User" ADD COLUMN "mfaSecret" text;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "mfaEnabledAt" timestamp with time zone;
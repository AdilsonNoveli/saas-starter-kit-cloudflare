ALTER TABLE "Plan" ADD COLUMN "maxSeats" integer;--> statement-breakpoint
ALTER TABLE "Plan" ADD COLUMN "limits" jsonb;--> statement-breakpoint
ALTER TABLE "Plan" ADD COLUMN "isArchived" boolean DEFAULT false NOT NULL;
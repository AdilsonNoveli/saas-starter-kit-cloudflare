CREATE TABLE "DeadLetterRecord" (
	"id" text PRIMARY KEY NOT NULL,
	"message" jsonb NOT NULL,
	"error" text NOT NULL,
	"teamId" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"replayedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "DeadLetterRecord" ADD CONSTRAINT "DeadLetterRecord_teamId_Team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE no action ON UPDATE no action;
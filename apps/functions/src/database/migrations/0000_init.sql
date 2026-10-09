-- Enables geospatial types/functions (needed for upcoming map features).
-- Supabase and most managed Postgres providers ship this extension already.
CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE TABLE "Log" (
	"id" text PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"jobId" text DEFAULT 'cron',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "MfaRecoveryCode" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"scope" text NOT NULL,
	"codeHash" text NOT NULL,
	"usedAt" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "MfaRecoveryCode_userId_scope_codeHash_unique" UNIQUE("userId","scope","codeHash")
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"image" text,
	"mfaSecret" text,
	"mfaEnabledAt" timestamp with time zone,
	CONSTRAINT "User_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "WaitlistEmail" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "MfaRecoveryCode" ADD CONSTRAINT "MfaRecoveryCode_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "MfaRecoveryCode_userId_scope_idx" ON "MfaRecoveryCode" USING btree ("userId","scope");
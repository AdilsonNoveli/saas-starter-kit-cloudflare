CREATE TABLE "EmailChangeRequest" (
	"userId" text PRIMARY KEY NOT NULL,
	"newEmail" text NOT NULL,
	"currentCodeHash" text NOT NULL,
	"newCodeHash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserPreference" (
	"userId" text PRIMARY KEY NOT NULL,
	"locale" text NOT NULL,
	"timeZone" text NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"dateFormat" text NOT NULL,
	"nameOrder" text NOT NULL,
	"onboardedAt" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "UserSession" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"browser" text NOT NULL,
	"os" text NOT NULL,
	"country" text,
	"region" text,
	"city" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lastUsedAt" timestamp with time zone NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "EmailChangeRequest" ADD CONSTRAINT "EmailChangeRequest_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "UserSession_userId_idx" ON "UserSession" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "UserSession_expiresAt_idx" ON "UserSession" USING btree ("expiresAt");
CREATE TYPE "public"."platform_role" AS ENUM('SUPER_ADMIN', 'SUPPORT');--> statement-breakpoint
CREATE TABLE "AuditLog" (
	"id" text PRIMARY KEY NOT NULL,
	"actorUserId" text NOT NULL,
	"action" text NOT NULL,
	"targetType" text NOT NULL,
	"targetId" text,
	"metadata" jsonb,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "PlatformAdmin" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"role" "platform_role" NOT NULL,
	"mfaSecret" text,
	"mfaEnabledAt" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revokedAt" timestamp with time zone,
	CONSTRAINT "PlatformAdmin_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "PlatformAdmin" ADD CONSTRAINT "PlatformAdmin_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
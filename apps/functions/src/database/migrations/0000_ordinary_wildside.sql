-- Enables geospatial types/functions (needed for upcoming map features).
-- Supabase and most managed Postgres providers ship this extension already.
CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE TABLE "Benefit" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "BenefitsOnPlan" (
	"planId" text NOT NULL,
	"benefitId" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "BenefitsOnPlan_planId_benefitId_pk" PRIMARY KEY("planId","benefitId")
);
--> statement-breakpoint
CREATE TABLE "Job" (
	"id" text PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"teamId" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Log" (
	"id" text PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"jobId" text DEFAULT 'cron',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"userId" text NOT NULL,
	"data" jsonb,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Permission" (
	"title" text NOT NULL,
	"description" text,
	"action" text NOT NULL,
	"roleId" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Permission_action_roleId_pk" PRIMARY KEY("action","roleId")
);
--> statement-breakpoint
CREATE TABLE "Plan" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tier" text DEFAULT 'FREE' NOT NULL,
	"price" text NOT NULL,
	"period" text NOT NULL,
	"provider" text,
	"providerPriceId" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Role" (
	"id" text PRIMARY KEY NOT NULL,
	"teamId" text,
	"name" text NOT NULL,
	"description" text,
	"isSystemRole" boolean DEFAULT false NOT NULL,
	"isDefault" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"teamId" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"provider" text NOT NULL,
	"providerSubscriptionId" text NOT NULL,
	"planId" text NOT NULL,
	"currentPeriodStart" timestamp with time zone,
	"currentPeriodEnd" timestamp with time zone,
	"cancelAtPeriodEnd" boolean DEFAULT false NOT NULL,
	"providerMetadata" jsonb,
	"customerEmail" text,
	"lastPaymentDate" timestamp with time zone,
	"nextPaymentDate" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "TeamInvite" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"teamId" text NOT NULL,
	"invitedById" text NOT NULL,
	"roleId" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"expiresAt" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "TeamInvite_teamId_email_unique" UNIQUE("teamId","email")
);
--> statement-breakpoint
CREATE TABLE "TeamMembership" (
	"id" text PRIMARY KEY NOT NULL,
	"teamId" text NOT NULL,
	"userId" text NOT NULL,
	"roleId" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "TeamMembership_teamId_userId_unique" UNIQUE("teamId","userId")
);
--> statement-breakpoint
CREATE TABLE "Team" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"logo" text,
	"planId" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"image" text,
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
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_roleId_Role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_roleId_Role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE no action ON UPDATE no action;
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
CREATE TABLE "PendingPurchase" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"planId" text NOT NULL,
	"provider" text NOT NULL,
	"providerCheckoutId" text NOT NULL,
	"providerCustomerId" text,
	"providerSubscriptionId" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"failureReason" text,
	"claimEmailSentAt" timestamp with time zone,
	"claimedAt" timestamp with time zone,
	"claimedByUserId" text,
	"resultTeamId" text,
	"expiresAt" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "PendingPurchase_providerCheckoutId_unique" UNIQUE("providerCheckoutId")
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
	"providerProductId" text,
	"unitAmount" integer,
	"currency" text,
	"maxSeats" integer,
	"limits" jsonb,
	"buyerTeamMode" text DEFAULT 'NEW_TEAM' NOT NULL,
	"buyerTeamId" text,
	"isArchived" boolean DEFAULT false NOT NULL,
	"isPublicOffer" boolean DEFAULT false NOT NULL,
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
ALTER TABLE "PendingPurchase" ADD CONSTRAINT "PendingPurchase_planId_Plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PendingPurchase" ADD CONSTRAINT "PendingPurchase_claimedByUserId_User_id_fk" FOREIGN KEY ("claimedByUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PendingPurchase" ADD CONSTRAINT "PendingPurchase_resultTeamId_Team_id_fk" FOREIGN KEY ("resultTeamId") REFERENCES "public"."Team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_buyerTeamId_Team_id_fk" FOREIGN KEY ("buyerTeamId") REFERENCES "public"."Team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_teamId_Team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_Plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "PendingPurchase_email_idx" ON "PendingPurchase" USING btree ("email");--> statement-breakpoint
CREATE INDEX "PendingPurchase_status_idx" ON "PendingPurchase" USING btree ("status");
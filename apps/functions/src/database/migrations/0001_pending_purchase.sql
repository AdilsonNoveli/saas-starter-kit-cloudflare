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
ALTER TABLE "PendingPurchase" ADD CONSTRAINT "PendingPurchase_planId_Plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PendingPurchase" ADD CONSTRAINT "PendingPurchase_claimedByUserId_User_id_fk" FOREIGN KEY ("claimedByUserId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "PendingPurchase" ADD CONSTRAINT "PendingPurchase_resultTeamId_Team_id_fk" FOREIGN KEY ("resultTeamId") REFERENCES "public"."Team"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "PendingPurchase_email_idx" ON "PendingPurchase" USING btree ("email");--> statement-breakpoint
CREATE INDEX "PendingPurchase_status_idx" ON "PendingPurchase" USING btree ("status");
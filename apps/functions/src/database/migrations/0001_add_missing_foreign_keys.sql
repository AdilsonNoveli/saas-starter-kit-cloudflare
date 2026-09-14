-- Adds the seven foreign keys that were declared only as drizzle `relations()`
-- (query-builder sugar) and never existed in Postgres. Follow the expand/
-- contract rule in ../MIGRATIONS.md: every constraint is added `NOT VALID`
-- first, so the statement takes only a brief lock and does NOT scan existing
-- rows, then validated in its own statement at the bottom of this file.
--
-- RUN THESE BEFORE APPLYING. Each must return zero rows. A non-empty result
-- means orphaned data that has to be fixed by hand first — the matching
-- VALIDATE CONSTRAINT below will fail otherwise (the NOT VALID constraint
-- itself still applies to every new/updated row, so nothing is silently
-- skipped).
--
-- Job.teamId -> Team.id
--   SELECT * FROM "Job" j WHERE j."teamId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Team" t WHERE t.id = j."teamId");
-- Subscription.teamId -> Team.id
--   SELECT * FROM "Subscription" s WHERE s."teamId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Team" t WHERE t.id = s."teamId");
-- Subscription.planId -> Plan.id
--   SELECT * FROM "Subscription" s WHERE s."planId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Plan" p WHERE p.id = s."planId");
-- TeamInvite.teamId -> Team.id
--   SELECT * FROM "TeamInvite" i WHERE i."teamId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Team" t WHERE t.id = i."teamId");
-- TeamInvite.invitedById -> User.id
--   SELECT * FROM "TeamInvite" i WHERE i."invitedById" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = i."invitedById");
-- TeamInvite.roleId -> Role.id
--   SELECT * FROM "TeamInvite" i WHERE i."roleId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Role" r WHERE r.id = i."roleId");
-- Team.planId -> Plan.id
--   SELECT * FROM "Team" t WHERE t."planId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "Plan" p WHERE p.id = t."planId");
ALTER TABLE "Job" ADD CONSTRAINT "Job_teamId_Team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_teamId_Team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_Plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_teamId_Team_id_fk" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_invitedById_User_id_fk" FOREIGN KEY ("invitedById") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "TeamInvite" ADD CONSTRAINT "TeamInvite_roleId_Role_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "Team" ADD CONSTRAINT "Team_planId_Plan_id_fk" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE no action ON UPDATE no action NOT VALID;--> statement-breakpoint
ALTER TABLE "Job" VALIDATE CONSTRAINT "Job_teamId_Team_id_fk";--> statement-breakpoint
ALTER TABLE "Subscription" VALIDATE CONSTRAINT "Subscription_teamId_Team_id_fk";--> statement-breakpoint
ALTER TABLE "Subscription" VALIDATE CONSTRAINT "Subscription_planId_Plan_id_fk";--> statement-breakpoint
ALTER TABLE "TeamInvite" VALIDATE CONSTRAINT "TeamInvite_teamId_Team_id_fk";--> statement-breakpoint
ALTER TABLE "TeamInvite" VALIDATE CONSTRAINT "TeamInvite_invitedById_User_id_fk";--> statement-breakpoint
ALTER TABLE "TeamInvite" VALIDATE CONSTRAINT "TeamInvite_roleId_Role_id_fk";--> statement-breakpoint
ALTER TABLE "Team" VALIDATE CONSTRAINT "Team_planId_Plan_id_fk";

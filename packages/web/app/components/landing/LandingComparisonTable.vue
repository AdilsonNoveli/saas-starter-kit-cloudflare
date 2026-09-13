<template>
  <section id="comparison" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full">
    <div class="mx-auto w-full">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-10 lg:mb-14">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-scale" class="w-4 h-4 text-emerald-400" />
              <span>NuxFire vs. Building from Scratch</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-pretty text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight lg:leading-[1.12em] text-highlighted mb-4">
          Everything You'd Spend Months Building — Ready on Day One
        </h2>

        <p class="text-muted text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
          52 production-verified features audit-tested in our codebase. Stop rebuilding auth, multi-tenancy, billing, and edge infrastructure from scratch.
        </p>
      </div>

      <!-- Quick Metrics Highlight Bar -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
        <div class="p-4 rounded-lg bg-night-900/60 border border-night-800 text-center">
          <span class="block text-2xl lg:text-3xl font-extrabold text-emerald-400">52 / 52</span>
          <span class="text-xs sm:text-sm text-muted">Production-ready features in NuxFire</span>
        </div>
        <div class="p-4 rounded-lg bg-night-900/60 border border-night-800 text-center">
          <span class="block text-2xl lg:text-3xl font-extrabold text-highlighted">3+ Months</span>
          <span class="text-xs sm:text-sm text-muted">Engineering time saved</span>
        </div>
        <div class="p-4 rounded-lg bg-night-900/60 border border-night-800 text-center">
          <span class="block text-2xl lg:text-3xl font-extrabold text-amber-400">36 Features</span>
          <span class="text-xs sm:text-sm text-muted">Typically missing from early-stage builds</span>
        </div>
      </div>

      <!-- Centered & Long Search Input (Above Group Menus) -->
      <div class="w-full max-w-2xl mx-auto mb-6">
        <div class="relative w-full">
          <UIcon
            name="i-lucide-search"
            class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none"
          />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search among 52 production-ready features (e.g., Stripe, RBAC, Passkey, Queue)..."
            class="w-full bg-night-900/80 border border-neutral-700/90 ring-1 ring-white/10 hover:border-neutral-500/80 hover:ring-white/20 focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/30 rounded-lg pl-12 pr-10 py-3 text-sm sm:text-base text-highlighted placeholder:text-muted/70 transition-all outline-none shadow-sm"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-highlighted p-1 cursor-pointer"
            @click="searchQuery = ''"
          >
            <UIcon name="i-lucide-x" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Group Menus in a Single Line -->
      <div class="w-full max-w-5xl mx-auto mb-8 overflow-x-auto no-scrollbar">
        <div class="flex flex-nowrap items-center justify-start md:justify-center gap-2 min-w-max px-2 py-1">
          <button
            v-for="category in categories"
            :key="category.id"
            type="button"
            :class="[
              'px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md whitespace-nowrap transition-all cursor-pointer',
              activeCategory === category.id && !searchQuery
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/50 shadow-sm font-semibold'
                : 'bg-night-900/50 text-muted hover:text-highlighted border border-night-800 hover:border-night-700'
            ]"
            @click="activeCategory = category.id; searchQuery = ''"
          >
            {{ category.label }}
            <span class="ml-1.5 text-[11px] px-1.5 py-0.5 rounded bg-night-950/60 text-muted border border-night-800/80">
              {{ getCategoryCount(category.id) }}
            </span>
          </button>
        </div>
      </div>

      <!-- Comparison Table Container -->
      <div class="overflow-hidden rounded-xl border border-night-800 bg-night-950/60 backdrop-blur-md shadow-2xl max-w-5xl mx-auto">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-night-800 bg-night-900/80">
                <th class="py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-muted uppercase tracking-wider w-1/2">
                  Feature / Capability
                </th>
                <th class="py-4 px-4 sm:px-6 text-xs sm:text-sm font-bold text-emerald-400 uppercase tracking-wider text-center bg-emerald-500/5 border-x border-emerald-500/20 w-1/4">
                  <div class="flex items-center justify-center gap-1.5">
                    <UIcon name="i-lucide-sparkles" class="w-4 h-4 text-emerald-400" />
                    <span>NuxFire</span>
                  </div>
                </th>
                <th class="py-4 px-4 sm:px-6 text-xs sm:text-sm font-semibold text-muted uppercase tracking-wider text-center w-1/4">
                  SaaS from Scratch
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-night-800/60 text-sm">
              <template v-for="category in visibleCategories" :key="category.id">
                <!-- Category Section Header Row -->
                <tr class="bg-night-900/40">
                  <td colspan="3" class="py-2.5 px-4 sm:px-6 font-bold text-xs uppercase tracking-wider text-night-400">
                    <div class="flex items-center gap-2">
                      <UIcon :name="category.icon" class="w-4 h-4 text-emerald-400" />
                      <span>{{ category.label }}</span>
                    </div>
                  </td>
                </tr>

                <!-- Feature Rows -->
                <tr
                  v-for="item in getCategoryItems(category.id)"
                  :key="item.name"
                  class="hover:bg-night-900/30 transition-colors group"
                >
                  <!-- Feature Info -->
                  <td class="py-3.5 px-4 sm:px-6">
                    <div class="font-medium text-highlighted group-hover:text-white transition-colors">
                      {{ item.name }}
                    </div>
                    <div v-if="item.description" class="text-xs text-muted mt-0.5">
                      {{ item.description }}
                    </div>
                  </td>

                  <!-- NuxFire Column -->
                  <td class="py-3.5 px-4 sm:px-6 text-center bg-emerald-500/5 border-x border-emerald-500/20">
                    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium text-xs">
                      <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-emerald-400" />
                      <span>Included</span>
                    </div>
                  </td>

                  <!-- From Scratch Column -->
                  <td class="py-3.5 px-4 sm:px-6 text-center">
                    <!-- Ready -->
                    <div
                      v-if="item.scratch === 'ready'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-night-800/80 border border-night-700 text-night-300 font-medium text-xs"
                    >
                      <UIcon name="i-lucide-check" class="w-3.5 h-3.5 text-emerald-400" />
                      <span>Common</span>
                    </div>

                    <!-- Partial -->
                    <div
                      v-else-if="item.scratch === 'partial'"
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 font-medium text-xs"
                    >
                      <UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5 text-amber-400" />
                      <span>Partial / Basic</span>
                    </div>

                    <!-- Missing -->
                    <div
                      v-else
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-night-900/60 border border-night-800 text-night-500 font-medium text-xs"
                    >
                      <UIcon name="i-lucide-x" class="w-3.5 h-3.5 text-night-500" />
                      <span>Build from Scratch</span>
                    </div>
                  </td>
                </tr>
              </template>

              <!-- Empty State when filtering returns nothing -->
              <tr v-if="filteredItemsCount === 0">
                <td colspan="3" class="py-12 text-center text-muted">
                  No features matching "{{ searchQuery }}" found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table Legend Footer -->
        <div class="py-3 px-6 bg-night-900/70 border-t border-night-800 flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-check" class="w-4 h-4 text-emerald-400" />
              <span>Production verified</span>
            </span>
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-alert-circle" class="w-4 h-4 text-amber-400" />
              <span>Basic or improvised</span>
            </span>
            <span class="flex items-center gap-1.5">
              <UIcon name="i-lucide-x" class="w-4 h-4 text-night-500" />
              <span>Requires custom engineering</span>
            </span>
          </div>
          <span class="text-night-500 text-[11px]">Source: Verified codebase audit (September 2026)</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface FeatureItem {
  name: string;
  description?: string;
  category: string;
  scratch: "ready" | "partial" | "missing";
}

const activeCategory = ref("auth");
const searchQuery = ref("");

const categories = [
  { id: "auth", label: "Auth & Security", icon: "i-lucide-shield-check" },
  { id: "teams", label: "Teams & RBAC", icon: "i-lucide-users" },
  { id: "admin", label: "Platform Admin", icon: "i-lucide-crown" },
  { id: "billing", label: "Payments & Billing", icon: "i-lucide-credit-card" },
  { id: "realtime", label: "Realtime & Queues", icon: "i-lucide-zap" },
  { id: "content", label: "CMS & Docs", icon: "i-lucide-file-text" },
  { id: "infra", label: "Edge Infra", icon: "i-lucide-cpu" },
];

const features: FeatureItem[] = [
  // 1. Auth & Security
  {
    name: "Email & Password Authentication",
    description: "Argon2 / scrypt password hashing managed securely via OpenAuth.js",
    category: "auth",
    scratch: "ready",
  },
  {
    name: "Passwordless Email OTP Codes",
    description: "One-time passcode login and verification emails",
    category: "auth",
    scratch: "partial",
  },
  {
    name: "Social OAuth (GitHub + Google)",
    description: "One-click OAuth account linkage with conditional provider toggle",
    category: "auth",
    scratch: "partial",
  },
  {
    name: "Persistent Anti-Brute-Force Rate Limiting",
    description: "Fixed-window rate limiting on Cloudflare KV protecting login & MFA",
    category: "auth",
    scratch: "missing",
  },
  {
    name: "Multi-Tiered Session Hierarchy",
    description: "Separated access tokens, refresh tokens, and sealed elevated MFA sessions",
    category: "auth",
    scratch: "missing",
  },
  {
    name: "Remote Session Termination",
    description: "Sign out of all other active sessions with dedicated revocation endpoint",
    category: "auth",
    scratch: "missing",
  },
  {
    name: "Self-Service TOTP MFA / 2FA",
    description: "Client-side QR generation with AES-GCM encrypted secrets at rest",
    category: "auth",
    scratch: "missing",
  },
  {
    name: "Full Account & Identity Deletion",
    description: "GDPR / LGPD compliant cascading deletion across KV and Postgres",
    category: "auth",
    scratch: "missing",
  },

  // 2. Teams, Workspaces & RBAC
  {
    name: "Multi-Tenancy by Workspace Slug / Sub-route",
    description: "Clean URL routing (/team-slug/dashboard) with automatic tenant resolution",
    category: "teams",
    scratch: "missing",
  },
  {
    name: "Workspace Switcher UI",
    description: "Seamless team switching dropdown and team creation modal",
    category: "teams",
    scratch: "missing",
  },
  {
    name: "Complete Team Workspace CRUD",
    description: "Update team name, slug, description, and workspace metadata",
    category: "teams",
    scratch: "missing",
  },
  {
    name: "Team Logo Upload & Storage",
    description: "Dedicated avatar uploads powered by Cloudflare R2 via NuxtHub blob",
    category: "teams",
    scratch: "missing",
  },
  {
    name: "Safe Workspace Deletion Gate",
    description: "Protected team removal with name confirmation and cascading cleanup",
    category: "teams",
    scratch: "partial",
  },
  {
    name: "Email Invitations with Roles & Expiration",
    description: "Invites delivered via transactional email with 7-day token expiration",
    category: "teams",
    scratch: "partial",
  },
  {
    name: "Full Invite Lifecycle Management",
    description: "Accept, decline, resend, and revoke invitations in real-time",
    category: "teams",
    scratch: "missing",
  },
  {
    name: "Member Role Changes & Removal",
    description: "Manage collaborator permissions and remove inactive members",
    category: "teams",
    scratch: "partial",
  },
  {
    name: "Plan Seat Limit Validation on Invite",
    description: "Blocks invitations when team exceeds subscription seat capacity",
    category: "teams",
    scratch: "missing",
  },
  {
    name: "Structured RBAC (Abilities & Bouncer)",
    description: "Granular permissions checked via defineAbility in tRPC and Vue Can component",
    category: "teams",
    scratch: "partial",
  },
  {
    name: "Auto-Provisioned System Roles",
    description: "Default OWNER and MEMBER roles seeded automatically with permission sets",
    category: "teams",
    scratch: "missing",
  },

  // 3. Platform Admin Console
  {
    name: "Dedicated Platform Admin Console (/admin)",
    description: "Completely isolated from tenant RBAC to prevent privilege escalation",
    category: "admin",
    scratch: "missing",
  },
  {
    name: "Triple-Barrier Security Gate",
    description: "Requires active admin record + TOTP enrollment + valid elevated session",
    category: "admin",
    scratch: "missing",
  },
  {
    name: "Operator Executive Metrics Dashboard",
    description: "Live revenue metrics, total users, active workspaces, and plan distribution",
    category: "admin",
    scratch: "missing",
  },
  {
    name: "Global Account & Team Management",
    description: "Suspend, reactivate, or inspect any tenant account instantly",
    category: "admin",
    scratch: "missing",
  },
  {
    name: "In-App Pricing Plan CRUD",
    description: "Create, edit, and soft-delete subscription plans with live Stripe syncing",
    category: "admin",
    scratch: "missing",
  },
  {
    name: "Background Jobs & DLQ Console",
    description: "Monitor queue processing status, view dead-letter errors, and trigger replay",
    category: "admin",
    scratch: "missing",
  },
  {
    name: "Immutable Operator Audit Trail",
    description: "AuditLog table tracking every critical operator action with timestamp and IP",
    category: "admin",
    scratch: "missing",
  },
  {
    name: "Realtime Global Announcements",
    description: "Broadcast system notifications to active users via WebSockets",
    category: "admin",
    scratch: "missing",
  },

  // 4. Payments & Billing
  {
    name: "Dual Provider Architecture (Stripe + Paddle)",
    description: "Pluggable payment engine with provider toggle via configuration flags",
    category: "billing",
    scratch: "missing",
  },
  {
    name: "Automatic Plan Sync with Stripe",
    description: "Creates and updates Stripe Products and Prices directly from admin panel",
    category: "billing",
    scratch: "missing",
  },
  {
    name: "Database-Driven Pricing Plans",
    description: "Modify pricing, trial days, and benefits in PostgreSQL without redeploying",
    category: "billing",
    scratch: "missing",
  },
  {
    name: "Seat Limits & Custom Plan Quotas (JSONB)",
    description: "Flexible benefit limits attached to plan records and enforced in code",
    category: "billing",
    scratch: "missing",
  },
  {
    name: "Smart Checkout with Customer ID Reuse",
    description: "Prevents duplicate Stripe customer records across repeat subscriptions",
    category: "billing",
    scratch: "partial",
  },
  {
    name: "Resilient Webhook Handlers",
    description: "Handles subscription creation, payment failures, upgrades, and cancellations",
    category: "billing",
    scratch: "partial",
  },
  {
    name: "Webhook Event Idempotency",
    description: "Deduplicates webhook retries to prevent double billing or race conditions",
    category: "billing",
    scratch: "missing",
  },
  {
    name: "Self-Service Customer Billing Portal",
    description: "Allows customers to manage cards, download invoices, and cancel anytime",
    category: "billing",
    scratch: "partial",
  },

  // 5. Realtime & Background Queues
  {
    name: "Native Edge WebSockets (Durable Objects)",
    description: "Stateful realtime connection hub built on Cloudflare Durable Objects",
    category: "realtime",
    scratch: "missing",
  },
  {
    name: "HMAC-Signed Ticket Authentication",
    description: "Short-lived tickets in Sec-WebSocket-Protocol prevent session token exposure",
    category: "realtime",
    scratch: "missing",
  },
  {
    name: "Realtime Dashboard Push Notifications",
    description: "Instant in-app notification toasts and badge updates over WebSockets",
    category: "realtime",
    scratch: "missing",
  },
  {
    name: "Cloudflare Queues with Concurrency Control",
    description: "Asynchronous background job buffer (batch size 10, max concurrency 5)",
    category: "realtime",
    scratch: "missing",
  },
  {
    name: "Dead Letter Queue (JobDLQ) & Operator Replay",
    description: "Captures failed retries into DeadLetterRecord for manual inspection",
    category: "realtime",
    scratch: "missing",
  },
  {
    name: "Scheduled Cron Jobs with Execution Logs",
    description: "Hourly maintenance triggers running serverless jobs with database logs",
    category: "realtime",
    scratch: "partial",
  },

  // 6. CMS, Blog & Documentation
  {
    name: "Multi-Collection Markdown CMS",
    description: "Nuxt Content v3 managing docs, blog, faq, and legal collections",
    category: "content",
    scratch: "missing",
  },
  {
    name: "Full-Text Documentation Search (Ctrl+K)",
    description: "Instant client search powered by Cloudflare D1 SQL database index",
    category: "content",
    scratch: "missing",
  },
  {
    name: "Schema-Validated Markdown Blog",
    description: "Enforced frontmatter schema for authors, dates, tags, and reading time",
    category: "content",
    scratch: "partial",
  },
  {
    name: "Production-Ready Legal Pages",
    description: "Terms of Service and Privacy Policy templates pre-wired in layout",
    category: "content",
    scratch: "partial",
  },
  {
    name: "High-Converting Landing Page",
    description: "Hero, architecture diagram, feature comparison, testimonials, and pricing",
    category: "content",
    scratch: "ready",
  },

  // 7. Engineering & Edge Infrastructure
  {
    name: "100% Serverless Edge Architecture",
    description: "Deployed entirely to Cloudflare Workers with zero container overhead",
    category: "infra",
    scratch: "missing",
  },
  {
    name: "Declarative Infrastructure as Code (SST v4)",
    description: "Reproducible deployments across dev and production stages via bun run deploy",
    category: "infra",
    scratch: "missing",
  },
  {
    name: "Drizzle ORM with Automated Migrations",
    description: "Type-safe PostgreSQL queries with automatic drizzle-kit migrations on deploy",
    category: "infra",
    scratch: "partial",
  },
  {
    name: "Idempotent Post-Migration Seeding",
    description: "Free plan and system permissions seeded automatically without duplication",
    category: "infra",
    scratch: "missing",
  },
  {
    name: "End-to-End Type-Safe API Layer",
    description: "Full TypeScript inference from PostgreSQL schema to tRPC and Vue components",
    category: "infra",
    scratch: "partial",
  },
  {
    name: "Zero Cold-Start Edge Connection Pooling",
    description: "Cloudflare Hyperdrive pools and accelerates Postgres connections at the edge",
    category: "infra",
    scratch: "missing",
  },
];

const filteredFeatures = computed(() => {
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    return features.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q))
    );
  }
  return features.filter((f) => f.category === activeCategory.value);
});

const filteredItemsCount = computed(() => filteredFeatures.value.length);

const visibleCategories = computed(() => {
  if (searchQuery.value.trim()) {
    return categories.filter((c) => getCategoryItems(c.id).length > 0);
  }
  return categories.filter((c) => c.id === activeCategory.value);
});

function getCategoryItems(categoryId: string) {
  return filteredFeatures.value.filter((f) => f.category === categoryId);
}

function getCategoryCount(categoryId: string) {
  return features.filter((f) => f.category === categoryId).length;
}
</script>

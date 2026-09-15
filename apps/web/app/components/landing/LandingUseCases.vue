<template>
  <section id="use-cases" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full relative overflow-hidden">
    <div class="mx-auto w-full">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-sparkles" class="w-4 h-4 text-emerald-400" />
              <span>Business Opportunities &amp; Use Cases</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-pretty text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight lg:leading-[1.12em] text-highlighted mb-4">
          What Can You Build with NuxFire?
        </h2>

        <p class="text-muted text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
          Most SaaS boilerplates break the moment you need stateful WebSockets, async job queues, or true enterprise multi-tenancy. NuxFire is engineered to carry your project from day-one MVP all the way to millions of daily requests without refactoring your core architecture.
        </p>
      </div>

      <!-- Grid of 6 SaaS Application Archetypes -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-16">
        <div
          v-for="useCase in useCases"
          :key="useCase.title"
          class="flex flex-col justify-between rounded-xl border border-night-700/60 bg-night-900/40 p-6 sm:p-7 hover:border-night-600 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/5 group"
        >
          <div>
            <!-- Top: Icon & Category Badge -->
            <div class="flex items-center justify-between gap-4 mb-4">
              <div
                class="w-12 h-12 rounded-lg flex items-center justify-center border transition-colors shrink-0"
                :class="useCase.iconContainerClass"
              >
                <UIcon :name="useCase.icon" class="w-6 h-6" :class="useCase.iconClass" />
              </div>
              <span class="text-[10px] sm:text-xs font-mono uppercase tracking-wider font-semibold px-2.5 py-1 rounded bg-night-800/80 border border-night-700 text-muted">
                {{ useCase.category }}
              </span>
            </div>

            <!-- Title & Pitch -->
            <h3 class="text-lg sm:text-xl font-bold text-highlighted mb-2.5 group-hover:text-emerald-400 transition-colors">
              {{ useCase.title }}
            </h3>

            <p class="text-sm text-muted leading-relaxed mb-5">
              {{ useCase.description }}
            </p>

            <!-- Examples Pill List -->
            <div class="mb-5">
              <span class="text-xs font-semibold text-neutral-400 block mb-2 font-mono uppercase tracking-wider">
                Product Examples:
              </span>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="example in useCase.examples"
                  :key="example"
                  class="text-xs px-2.5 py-0.5 rounded-full bg-night-800 border border-night-700/70 text-neutral-300 font-medium"
                >
                  {{ example }}
                </span>
              </div>
            </div>
          </div>

          <!-- Superpower Box -->
          <div class="pt-4 border-t border-night-800 mt-auto">
            <div class="flex items-start gap-2">
              <UIcon name="i-lucide-check-circle-2" class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span class="text-xs font-semibold text-highlighted block">Included Superpower:</span>
                <span class="text-xs text-muted leading-tight block">{{ useCase.superpower }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Trust & ROI Value Banner -->
      <div class="max-w-5xl mx-auto rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-night-900/60 to-night-950 p-8 sm:p-10 text-center relative overflow-hidden shadow-xl shadow-emerald-500/5">
        <div class="relative z-10">
          <UBadge color="success" variant="subtle" size="md" class="mb-4">
            <span class="font-mono text-xs uppercase tracking-wider font-semibold">Strategic Engineering Decision</span>
          </UBadge>

          <h3 class="text-2xl sm:text-3xl font-extrabold text-highlighted mb-4">
            Save 3 to 6 Months of Critical Engineering
          </h3>

          <p class="text-muted text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Building passwordless edge auth, relational database pooling, multi-tenant RBAC, async queues with DLQ, and Stripe billing from scratch costs upwards of <strong class="text-highlighted">$10,000+ in senior engineering hours</strong>. With NuxFire, everything runs on your first <code class="text-emerald-400 font-mono text-xs bg-night-800 px-1.5 py-0.5 rounded">$ bun run deploy</code>.
          </p>

          <!-- 4 Pillars of Competitive Advantage -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-left mb-8">
            <div class="p-3.5 rounded-lg bg-night-900/80 border border-night-700/60">
              <div class="flex items-center gap-2 mb-1 text-emerald-400">
                <UIcon name="i-lucide-gauge" class="w-4 h-4 shrink-0" />
                <span class="text-xs font-bold font-mono uppercase">&lt; 50ms Edge</span>
              </div>
              <p class="text-[11px] text-muted leading-snug">300+ global Cloudflare datacenters with zero cold starts.</p>
            </div>

            <div class="p-3.5 rounded-lg bg-night-900/80 border border-night-700/60">
              <div class="flex items-center gap-2 mb-1 text-sky-400">
                <UIcon name="i-lucide-database" class="w-4 h-4 shrink-0" />
                <span class="text-xs font-bold font-mono uppercase">Zero DB Crashes</span>
              </div>
              <p class="text-[11px] text-muted leading-snug">Hyperdrive pooling maintains persistent TCP connections to PostgreSQL.</p>
            </div>

            <div class="p-3.5 rounded-lg bg-night-900/80 border border-night-700/60">
              <div class="flex items-center gap-2 mb-1 text-amber-400">
                <UIcon name="i-lucide-shield-alert" class="w-4 h-4 shrink-0" />
                <span class="text-xs font-bold font-mono uppercase">SOC2 &amp; MFA Ready</span>
              </div>
              <p class="text-[11px] text-muted leading-snug">Dedicated /admin portal with TOTP two-factor auth and audit logs.</p>
            </div>

            <div class="p-3.5 rounded-lg bg-night-900/80 border border-night-700/60">
              <div class="flex items-center gap-2 mb-1 text-purple-400">
                <UIcon name="i-lucide-code" class="w-4 h-4 shrink-0" />
                <span class="text-xs font-bold font-mono uppercase">100% Type-Safe</span>
              </div>
              <p class="text-[11px] text-muted leading-snug">From Drizzle ORM queries to Nuxt UI components through tRPC.</p>
            </div>
          </div>

          <!-- Bottom Action Button: Strategic redirect to #pricing -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <CTAButton
              to="/#pricing"
              size="lg"
              radius="lg"
              trailing-icon="i-lucide-arrow-right"
            >
              GET STARTED NOW
            </CTAButton>
            <NuxtLink
              to="/docs/saas-starter-kit"
              class="inline-flex items-center justify-center h-11 px-6 rounded-md text-sm font-semibold text-muted hover:text-highlighted border border-night-700 hover:border-night-600 bg-night-900/60 transition-colors w-full sm:w-auto"
            >
              View Documentation
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const useCases = [
  {
    category: "B2B SaaS Core",
    title: "B2B SaaS & Team Workspaces",
    icon: "i-lucide-building-2",
    iconContainerClass: "border-emerald-500/30 bg-emerald-500/10",
    iconClass: "text-emerald-400",
    description:
      "Sell subscription tiers with per-seat or workspace billing. Strict tenant isolation, tokenized team invitations, and fine-grained role-based access control (RBAC) are fully audited and production-ready on day one.",
    examples: [
      "Vertical CRMs",
      "ATS & Recruiting Systems",
      "Task & Project Managers (Linear/Asana)",
      "Helpdesks & Ticketing",
    ],
    superpower:
      "Native teams layer, nuxt-authorization, Stripe Checkout/Portal, and integrated Kanban layer.",
  },
  {
    category: "Realtime Engine",
    title: "Stateful Realtime Applications",
    icon: "i-lucide-zap",
    iconContainerClass: "border-teal-500/30 bg-teal-500/10",
    iconClass: "text-teal-400",
    description:
      "Build multiplayer collaborative apps without expensive Redis clusters or dedicated Socket.io servers. Each room or channel operates in an isolated Cloudflare Durable Object backed by low-latency embedded SQLite.",
    examples: [
      "Collaborative Whiteboards",
      "Live Telemetry Dashboards",
      "Support Chats & Messaging",
      "Multiplayer Canvas & Docs",
    ],
    superpower:
      "Durable Objects with SQLite storage, HMAC-signed ticket handshake, and sub-50ms global edge latency.",
  },
  {
    category: "AI & Background Processing",
    title: "AI Platforms & Autonomous Agents",
    icon: "i-lucide-bot",
    iconContainerClass: "border-purple-500/30 bg-purple-500/10",
    iconClass: "text-purple-400",
    description:
      "Execute long-running LLM completions and heavy compute without blocking the UI or hitting HTTP request timeouts. Cloudflare Queues process async jobs with exponential backoff and Dead Letter Queue capture.",
    examples: [
      "Batch Media Generators",
      "Domain-Specific AI Copilots",
      "Audio / Video Pipelines",
      "PDF & Contract Analyzers",
    ],
    superpower:
      "Cloudflare Queues with DLQ, unlimited R2 storage with zero egress fees, and live updates via WebSockets.",
  },
  {
    category: "Rapid Monetization",
    title: "Micro-SaaS & Membership Portals",
    icon: "i-lucide-credit-card",
    iconContainerClass: "border-sky-500/30 bg-sky-500/10",
    iconClass: "text-sky-400",
    description:
      "Ship lean, highly profitable subscription tools in a single weekend. OpenAuth.js authentication runs in Cloudflare KV with zero database connection overhead, and Nuxt Content v3 provides lightning-fast documentation and blogs.",
    examples: [
      "Curated Premium Directories",
      "SEO & Automation Tools",
      "Paid Member Communities",
      "Courses & Digital Product Portals",
    ],
    superpower:
      "OpenAuth with zero-DB sessions, D1 SQL Full-Text Search, and pre-configured Stripe Billing.",
  },
  {
    category: "Enterprise & Governance",
    title: "Client Portals & Internal Backoffices",
    icon: "i-lucide-shield-check",
    iconContainerClass: "border-amber-500/30 bg-amber-500/10",
    iconClass: "text-amber-400",
    description:
      "Deliver self-service portals and operational backoffices that pass stringent corporate security audits. Comes standard with a dedicated Super-Admin console, TOTP Multi-Factor Authentication, and full audit logging.",
    examples: [
      "Agency Client Portals",
      "Financial Backoffices",
      "Compliance & Audit Dashboards",
      "Internal Operations Consoles",
    ],
    superpower:
      "Isolated /admin portal with TOTP MFA, audit_logs table in PostgreSQL, and end-to-end type safety.",
  },
  {
    category: "High-Throughput APIs",
    title: "High-Scale APIs & Event Pipelines",
    icon: "i-lucide-activity",
    iconContainerClass: "border-orange-500/30 bg-orange-500/10",
    iconClass: "text-orange-400",
    description:
      "Process millions of webhooks and background jobs with near-zero idle infrastructure cost. Hyperdrive connection pooling accelerates PostgreSQL queries without connection exhaustion, and transactional emails handle failovers.",
    examples: [
      "Webhook Dispatchers",
      "Transactional Notification Engines",
      "Metric Ingestion Pipelines",
      "Scheduled Hourly Crons",
    ],
    superpower:
      "Cloudflare Hyperdrive TCP connection pooling, multi-provider React Email (Resend/Brevo/SES), and edge Crons.",
  },
];
</script>

<template>
  <section id="pricing" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full relative">
    <div class="mx-auto w-full max-w-5xl">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-tag" class="w-4 h-4 text-emerald-400" />
              <span>Lifetime License</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-pretty text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight lg:leading-[1.12em] text-highlighted mb-4">
          Simple, Transparent Pricing
        </h2>

        <p class="text-muted text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
          One payment. Complete ownership. No recurring monthly fees or hidden platform tax.
        </p>
      </div>

      <!-- Modern Enterprise Pricing Card -->
      <div class="max-w-xl mx-auto rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-night-900 via-night-950 to-night-950 p-7 sm:p-10 shadow-2xl shadow-emerald-500/10 relative overflow-hidden">
        <!-- Top Accent Glow Line -->
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500/20 via-emerald-500 to-emerald-500/20" />

        <!-- Card Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 class="text-2xl font-black text-highlighted tracking-tight">
              NuxFire Production Kit
            </h3>
            <p class="text-sm text-muted mt-1">
              Full-stack enterprise SaaS codebase &amp; cloud infrastructure
            </p>
          </div>
          <span class="inline-flex items-center text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
            Lifetime Access
          </span>
        </div>

        <!-- Price Display -->
        <div class="p-5 rounded-xl bg-night-900/80 border border-night-800 mb-8 flex flex-col sm:flex-row items-baseline justify-between gap-4">
          <div class="flex items-baseline gap-3">
            <span class="text-2xl sm:text-3xl text-neutral-500 line-through font-bold">
              $79
            </span>
            <span class="text-5xl sm:text-6xl font-black text-highlighted tracking-tight">
              $49
            </span>
            <span class="text-sm font-semibold text-muted">
              USD
            </span>
          </div>
          <div class="text-left sm:text-right">
            <span class="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold block">
              One-Time Payment
            </span>
            <span class="text-[11px] text-muted block">
              Never pay monthly for code
            </span>
          </div>
        </div>

        <!-- What You Get (Clean, High-Value Checklist) -->
        <div class="space-y-3.5 mb-8">
          <span class="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 block mb-4">
            Everything Included in Your License:
          </span>

          <div
            v-for="feature in includedFeatures"
            :key="feature.text"
            class="flex items-start gap-3"
          >
            <UIcon
              name="i-lucide-check"
              class="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"
            />
            <span class="text-sm text-neutral-200 font-medium leading-tight">
              <strong class="text-highlighted font-semibold">{{ feature.highlight }}</strong>
              <span class="text-neutral-300 font-normal"> — {{ feature.text }}</span>
            </span>
          </div>
        </div>

        <!-- CTA Action Button (Existing Model Button) -->
        <div class="mb-5">
          <CTAButton
            :to="signupUrl"
            size="lg"
            radius="lg"
            block
            trailing-icon="i-lucide-arrow-right"
          >
            GET STARTED NOW
          </CTAButton>
        </div>

        <!-- Trust Badges / Guarantees -->
        <div class="pt-4 border-t border-night-800/80 text-center">
          <p class="text-xs text-muted flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-shield-check" class="w-3.5 h-3.5 text-emerald-400" />
              14-Day Money-Back Guarantee
            </span>
            <span class="hidden sm:inline">•</span>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-code-2" class="w-3.5 h-3.5 text-emerald-400" />
              Unlimited Personal &amp; Commercial Projects
            </span>
            <span class="hidden sm:inline">•</span>
            <span class="flex items-center gap-1">
              <UIcon name="i-lucide-zap" class="w-3.5 h-3.5 text-emerald-400" />
              Instant GitHub Access
            </span>
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const signupUrl = computed(() => config.public.appUrl || "/signup");

const includedFeatures = [
  {
    highlight: "Full Monorepo Source Code",
    text: "Nuxt 3, Nitro, tRPC, and declarative SST v4 IaC.",
  },
  {
    highlight: "B2B Multi-Tenancy & Teams",
    text: "Organization switching, tokenized invites, and granular RBAC.",
  },
  {
    highlight: "OpenAuth.js Edge Authentication",
    text: "Zero-DB KV session caching, Google & GitHub OAuth, password & OTP.",
  },
  {
    highlight: "Stateful Realtime Engine",
    text: "Cloudflare Durable Objects with embedded SQLite & HMAC WebSockets.",
  },
  {
    highlight: "Background Job Queues & DLQ",
    text: "Cloudflare Queues with automatic retries and dead-letter capture.",
  },
  {
    highlight: "Stripe Billing & Subscriptions",
    text: "Checkout sessions, Customer Portal, and multi-tier benefits gating.",
  },
  {
    highlight: "Transactional Email System",
    text: "React Email templates with multi-provider fallback (Resend/Brevo/SES).",
  },
  {
    highlight: "Dedicated Super-Admin Portal",
    text: "Protected with TOTP MFA, user impersonation, and audit logs.",
  },
  {
    highlight: "Drizzle ORM & Hyperdrive Postgres",
    text: "Zero cold-start edge TCP connection pooling for any PostgreSQL.",
  },
  {
    highlight: "Object Storage & D1 Database",
    text: "Cloudflare R2 with zero egress fees and D1 SQL full-text search.",
  },
  {
    highlight: "Production Kanban Application",
    text: "Included production-ready Kanban layer with drag & drop cards.",
  },
  {
    highlight: "Lifetime Updates & Documentation",
    text: "Complete docs, future updates, and private developer community.",
  },
];
</script>

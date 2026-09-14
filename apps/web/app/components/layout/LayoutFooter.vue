<template>
  <footer class="w-full border-t border-default bg-default/60 backdrop-blur-sm">
    <div class="container mx-auto max-w-6xl px-6 py-12">
      <div class="grid gap-8 grid-cols-2 md:grid-cols-4">
        <!-- Brand -->
        <div class="col-span-2 flex flex-col gap-4">
          <NuxtLink to="/" aria-label="NuxFire" class="flex items-center">
            <img src="/nuxfire.svg" alt="NuxFire" class="h-7 w-auto dark:hidden" />
            <img src="/nuxfire-white.svg" alt="NuxFire" class="h-7 w-auto hidden dark:block" />
          </NuxtLink>
          <p class="text-sm text-muted max-w-xs leading-relaxed">
            Production-ready enterprise-grade Nuxt starter kit for Cloudflare.
            Launch your SaaS in days, not months.
          </p>
          <p class="text-xs text-muted">
            &copy; {{ currentYear }} NuxFire. All rights reserved.
          </p>
        </div>

        <!-- Legal -->
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold uppercase tracking-widest text-muted">Legal</span>
          <div v-for="link in legal" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="text-sm text-muted hover:text-highlighted transition-colors"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>

        <!-- Links -->
        <div class="flex flex-col gap-3">
          <span class="text-xs font-semibold uppercase tracking-widest text-muted">Navigation</span>
          <div v-for="link in links" :key="link.to">
            <NuxtLink
              :to="link.to"
              class="text-sm text-muted hover:text-highlighted transition-colors"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
const currentYear = new Date().getFullYear();

const legal = [
  { label: "Terms of Service", to: "/terms-of-service" },
  { label: "Privacy Policy", to: "/privacy-policy" },
  { label: "License", to: "/license" },
];
const links = [
  { label: "Home", to: "/" },
  { label: "Docs", to: "/docs" },
  { label: "Blog", to: "/blog" },
];
</script>


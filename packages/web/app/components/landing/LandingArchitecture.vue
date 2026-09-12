<template>
  <section id="architecture" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8">
    <div class="container mx-auto max-w-7xl">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-10 lg:mb-14">
        <div class="inline-flex items-center justify-center mb-4">
          <UBadge color="primary" variant="subtle" size="md" class="text-xs sm:text-sm">
            <div class="flex gap-2 items-center">
              <UIcon name="i-lucide-layers" class="w-4 h-4 text-fire-500" />
              <span class="font-semibold tracking-wide">100% Serverless Edge Architecture</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-highlighted mb-5">
          Projetado para Escalar sem Fricção
        </h2>

        <p class="text-lg sm:text-xl text-muted leading-relaxed">
          Infraestrutura completa na borda da Cloudflare: PostgreSQL acelerado via Hyperdrive com Drizzle ORM,
          autenticação OpenAuth, WebSockets em tempo real e filas assíncronas com DLQ.
        </p>
      </div>

      <!-- Architecture Diagram Card Container -->
      <div
        class="relative mx-auto rounded-2xl md:rounded-3xl p-2 sm:p-4 md:p-6 bg-night-950/80 border border-night-800 shadow-2xl shadow-black/60 backdrop-blur-md overflow-hidden"
      >
        <!-- Ambient Decorative Glows -->
        <div class="absolute -top-24 -left-24 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-fire-500/10 rounded-full blur-3xl pointer-events-none" />

        <!-- Diagram SVG (Centered & Responsive) -->
        <div class="relative w-full overflow-hidden rounded-xl md:rounded-2xl bg-night-900/50 flex justify-center items-center">
          <img
            src="/svg/architecture_diagram.svg"
            alt="NuxFire Architecture Diagram"
            class="w-full h-auto max-h-[850px] object-contain block mx-auto transition-transform duration-300"
            loading="lazy"
          />
        </div>
      </div>

      <!-- Architecture Highlights Grid -->
      <div class="mt-10 lg:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div class="p-5 rounded-2xl bg-night-900/50 border border-night-800/80 hover:border-night-700 transition-colors">
          <div class="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-3">
            <UIcon name="i-lucide-database" class="w-5 h-5 text-sky-400" />
          </div>
          <h3 class="font-bold text-base text-highlighted mb-1">Postgres + Hyperdrive</h3>
          <p class="text-sm text-muted">
            Pooling global na borda e aceleração TCP com Drizzle ORM. Compatível com Supabase, RDS e Neon.
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-night-900/50 border border-night-800/80 hover:border-night-700 transition-colors">
          <div class="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
            <UIcon name="i-lucide-zap" class="w-5 h-5 text-violet-400" />
          </div>
          <h3 class="font-bold text-base text-highlighted mb-1">WebSockets em Tempo Real</h3>
          <p class="text-sm text-muted">
            Cloudflare Durable Objects com canais privados e tickets HMAC seguros para comunicação instantânea.
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-night-900/50 border border-night-800/80 hover:border-night-700 transition-colors">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
            <UIcon name="i-lucide-cpu" class="w-5 h-5 text-amber-400" />
          </div>
          <h3 class="font-bold text-base text-highlighted mb-1">Filas &amp; Resiliência DLQ</h3>
          <p class="text-sm text-muted">
            Processamento assíncrono em lote via Cloudflare Queues com isolamento de falhas em Dead Letter Queue.
          </p>
        </div>

        <div class="p-5 rounded-2xl bg-night-900/50 border border-night-800/80 hover:border-night-700 transition-colors">
          <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
            <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-emerald-400" />
          </div>
          <h3 class="font-bold text-base text-highlighted mb-1">OpenAuth &amp; Service Bindings</h3>
          <p class="text-sm text-muted">
            Tokens e credenciais isolados no KV, com chamadas internas zero-hop entre Workers Cloudflare.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

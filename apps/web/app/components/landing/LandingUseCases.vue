<template>
  <section id="use-cases" class="py-16 md:py-24 px-4 sm:px-6 lg:px-8 xl:px-40 w-full relative overflow-hidden">
    <div class="mx-auto w-full">
      <!-- Section Header -->
      <div class="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
        <div class="inline-flex items-center justify-center mb-3">
          <UBadge color="primary" variant="subtle" size="md">
            <div class="flex gap-2 items-center text-xs lg:text-sm">
              <UIcon name="i-lucide-sparkles" class="w-4 h-4 text-emerald-400" />
              <span>Oportunidades de Negócio &amp; Casos de Uso</span>
            </div>
          </UBadge>
        </div>

        <h2 class="text-pretty text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight lg:leading-[1.12em] text-highlighted mb-4">
          O Que Você Pode Construir com o NuxFire?
        </h2>

        <p class="text-muted text-base sm:text-lg lg:text-xl font-normal leading-relaxed">
          A maioria dos boilerplates quebra quando você precisa de WebSockets com estado, filas assíncronas ou multi-tenancy corporativo. O NuxFire foi projetado para sustentar desde o seu primeiro assinante até milhões de requisições sem reescrever uma única linha de infraestrutura.
        </p>
      </div>

      <!-- Grid de 6 Arquétipos de Aplicações SaaS -->
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
                Exemplos de Produtos:
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
                <span class="text-xs font-semibold text-highlighted block">Superpoder Incluso:</span>
                <span class="text-xs text-muted leading-tight block">{{ useCase.superpower }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Trust & ROI Value Banner (Por Que o NuxFire é a Melhor Escolha) -->
      <div class="max-w-5xl mx-auto rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-night-900/60 to-night-950 p-8 sm:p-10 text-center relative overflow-hidden shadow-xl shadow-emerald-500/5">
        <div class="relative z-10">
          <UBadge color="success" variant="subtle" size="md" class="mb-4">
            <span class="font-mono text-xs uppercase tracking-wider font-semibold">Decisão de Engenharia &amp; Negócios</span>
          </UBadge>

          <h3 class="text-2xl sm:text-3xl font-extrabold text-highlighted mb-4">
            Economize de 3 a 6 Meses de Engenharia Crítica
          </h3>

          <p class="text-muted text-sm sm:text-base max-w-2xl mx-auto mb-8 leading-relaxed">
            Criar autenticação passwordless, pooling de banco no edge, controle multi-tenant por time, filas assíncronas com DLQ e checkout Stripe do zero custa mais de <strong class="text-highlighted">R$ 40.000 em horas de desenvolvedor sênior</strong>. Com o NuxFire, tudo isso roda no primeiro <code class="text-emerald-400 font-mono text-xs bg-night-800 px-1.5 py-0.5 rounded">$ bun run deploy</code>.
          </p>

          <!-- 4 Pillars of Competitive Advantage -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-left mb-8">
            <div class="p-3.5 rounded-lg bg-night-900/80 border border-night-700/60">
              <div class="flex items-center gap-2 mb-1 text-emerald-400">
                <UIcon name="i-lucide-gauge" class="w-4 h-4 shrink-0" />
                <span class="text-xs font-bold font-mono uppercase">&lt; 50ms Edge</span>
              </div>
              <p class="text-[11px] text-muted leading-snug">300+ datacenters mundiais da Cloudflare com zero cold-starts.</p>
            </div>

            <div class="p-3.5 rounded-lg bg-night-900/80 border border-night-700/60">
              <div class="flex items-center gap-2 mb-1 text-sky-400">
                <UIcon name="i-lucide-database" class="w-4 h-4 shrink-0" />
                <span class="text-xs font-bold font-mono uppercase">Zero DB Crashes</span>
              </div>
              <p class="text-[11px] text-muted leading-snug">Hyperdrive mantendo pool TCP ativo para PostgreSQL sem esgotar conexões.</p>
            </div>

            <div class="p-3.5 rounded-lg bg-night-900/80 border border-night-700/60">
              <div class="flex items-center gap-2 mb-1 text-amber-400">
                <UIcon name="i-lucide-shield-alert" class="w-4 h-4 shrink-0" />
                <span class="text-xs font-bold font-mono uppercase">SOC2 &amp; MFA</span>
              </div>
              <p class="text-[11px] text-muted leading-snug">Console /admin com TOTP duplo fator e auditoria de ações no banco.</p>
            </div>

            <div class="p-3.5 rounded-lg bg-night-900/80 border border-night-700/60">
              <div class="flex items-center gap-2 mb-1 text-purple-400">
                <UIcon name="i-lucide-code" class="w-4 h-4 shrink-0" />
                <span class="text-xs font-bold font-mono uppercase">100% Type-Safe</span>
              </div>
              <p class="text-[11px] text-muted leading-snug">Da query Drizzle ORM aos componentes Nuxt UI através de tRPC.</p>
            </div>
          </div>

          <!-- Bottom Action Button -->
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
            <NuxtLink
              :to="signupUrl"
              external
              class="inline-flex items-center justify-center h-11 px-7 rounded-md text-sm font-bold tracking-wider uppercase bg-emerald-500 hover:bg-emerald-400 text-night-950 shadow-md shadow-emerald-500/25 transition-all duration-150 active:scale-95 cursor-pointer w-full sm:w-auto"
            >
              LANÇAR SEU SAAS AGORA
              <UIcon name="i-lucide-arrow-right" class="w-4 h-4 ml-2" />
            </NuxtLink>
            <NuxtLink
              to="/docs/saas-starter-kit"
              class="inline-flex items-center justify-center h-11 px-6 rounded-md text-sm font-semibold text-muted hover:text-highlighted border border-night-700 hover:border-night-600 bg-night-900/60 transition-colors w-full sm:w-auto"
            >
              Ver Documentação Técnica
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const config = useRuntimeConfig();
const signupUrl = computed(() => config.public.appUrl || "/signup");

const useCases = [
  {
    category: "B2B SaaS Core",
    title: "SaaS B2B & Gestão de Equipes",
    icon: "i-lucide-building-2",
    iconContainerClass: "border-emerald-500/30 bg-emerald-500/10",
    iconClass: "text-emerald-400",
    description:
      "Venda planos empresariais cobrando por assento ou assinatura recorrente. O isolamento de dados por tenant, convites por token e controle de acesso granular (RBAC) já vêm auditados e prontos para produção.",
    examples: [
      "CRMs Verticais",
      "Sistemas ATS / RH",
      "Kanban & Gestão (Linear/Asana)",
      "Helpdesks & Tickets",
    ],
    superpower:
      "Camada de teams nativa, nuxt-authorization, Stripe Checkout/Portal e layer Kanban inclusa.",
  },
  {
    category: "Realtime Engine",
    title: "Plataformas em Tempo Real",
    icon: "i-lucide-zap",
    iconContainerClass: "border-teal-500/30 bg-teal-500/10",
    iconClass: "text-teal-400",
    description:
      "Crie aplicações multiplayer ultra-rápidas sem custos de Redis ou servidores dedicados. Cada sala ou canal opera em uma Cloudflare Durable Object independente com SQLite de baixa latência embutido.",
    examples: [
      "Whiteboards Colaborativos",
      "Dashboards Operacionais Ao Vivo",
      "Chats de Suporte & Comunicação",
      "Ferramentas de Telemetria",
    ],
    superpower:
      "Durable Objects com novo runtime SQLite, handshake seguro HMAC e latência sub-50ms.",
  },
  {
    category: "AI & Background Processing",
    title: "Plataformas de IA & Copilotos",
    icon: "i-lucide-bot",
    iconContainerClass: "border-purple-500/30 bg-purple-500/10",
    iconClass: "text-purple-400",
    description:
      "Absorva requisições demoradas de LLM sem travar a interface do usuário nem estourar timeouts HTTP. Filas assíncronas processam tarefas em background com retentativas automáticas e captura de falhas.",
    examples: [
      "Geradores de Mídia em Lote",
      "Copilotos Jurídicos / Médicos",
      "Pipelines de Transcrição / Áudio",
      "Análise de PDFs e Contratos",
    ],
    superpower:
      "Cloudflare Queues com DLQ, armazenamento R2 sem taxas de tráfego e retorno via WebSockets.",
  },
  {
    category: "Monetização Rápida",
    title: "Micro-SaaS & Comunidades Pagas",
    icon: "i-lucide-credit-card",
    iconContainerClass: "border-sky-500/30 bg-sky-500/10",
    iconClass: "text-sky-400",
    description:
      "Lance um negócio enxuto e lucrativo em poucos dias. Autenticação OpenAuth sem custo de banco de dados, cobrança Stripe global e Nuxt Content v3 integrado com banco D1 para páginas de alta conversão.",
    examples: [
      "Diretórios Curados Premium",
      "Ferramentas de SEO e Automação",
      "Comunidades de Membros",
      "Portais de Cursos & Guias",
    ],
    superpower:
      "OpenAuth.js com sessões em KV, banco D1 SQL Full-Text Search e Stripe Billing pré-configurado.",
  },
  {
    category: "Enterprise & Governance",
    title: "Portais B2B & Ferramentas Internas",
    icon: "i-lucide-shield-check",
    iconContainerClass: "border-amber-500/30 bg-amber-500/10",
    iconClass: "text-amber-400",
    description:
      "Entregue portais de autoatendimento para clientes corporativos ou backoffices operacionais. Console Super-Admin com proteção TOTP MFA, impersonation de usuários e registro detalhado de auditoria.",
    examples: [
      "Portais de Clientes de Agências",
      "Backoffices Financeiros",
      "Painéis de Compliance & Auditoria",
      "Ferramentas de Operações Internas",
    ],
    superpower:
      "Módulo /admin isolado com TOTP MFA, tabela audit_logs no PostgreSQL e tRPC seguro ponta a ponta.",
  },
  {
    category: "High-Throughput APIs",
    title: "APIs e Microsserviços de Alta Escala",
    icon: "i-lucide-activity",
    iconContainerClass: "border-orange-500/30 bg-orange-500/10",
    iconClass: "text-orange-400",
    description:
      "Processe milhões de webhooks e eventos transacionais com custo quase zero quando ocioso. O Hyperdrive elimina o gargalo de conexões com o PostgreSQL e o pipeline de e-mails garante entrega com fallback.",
    examples: [
      "Motores de Webhooks & Eventos",
      "Disparadores Transacionais de E-mail",
      "Pipelines de Ingestão de Métricas",
      "Rotinas Agendadas & Crons",
    ],
    superpower:
      "Cloudflare Hyperdrive connection pooling, React Email multi-provedor (Resend/Brevo/SES) e Crons.",
  },
];
</script>

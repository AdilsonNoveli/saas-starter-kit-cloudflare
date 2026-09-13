import tailwindcss from '@tailwindcss/vite'
import { createLogger } from 'vite'

// Script inline de tema (evita FOUC).
const THEME_SCRIPT =
  "(function(){try{var c=document.cookie;function g(n){var m=c.match(new RegExp('(?:^|; )'+n+'=([^;]+)'));return m?decodeURIComponent(m[1]):''}var u=g('theme'),s=g('store_theme');var e=(u==='light'||u==='dark')?u:(s==='light'||s==='dark')?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var r=document.documentElement;if(e==='dark'){r.classList.add('dark')}else{r.classList.remove('dark')}r.style.colorScheme=e}catch(e){}})();"

/**
 * Cria um `customLogger` para o Vite que silencia warnings cosméticos de
 * sourcemap conhecidos:
 *   - `@tailwindcss/vite:generate:build` (não emite sourcemaps em prod)
 *   - `nuxt:module-preload-polyfill` (idem)
 *
 * O Vite roteia warnings de plugin Rollup pelos métodos `warn` e
 * `warnOnce` (este último com dedup `(xN)`). Filtramos ambos.
 *
 * Qualquer outra mensagem (info/warn/error reais) continua sendo propagada.
 */
function createSilentSourcemapLogger(): ReturnType<typeof createLogger> {
  const logger = createLogger()
  const NOISE_RE = /Sourcemap is likely to be incorrect.*(@tailwindcss\/vite|nuxt:module-preload-polyfill)|(@tailwindcss\/vite|nuxt:module-preload-polyfill).*Sourcemap is likely to be incorrect/i

  const isNoise = (msg: unknown): boolean => typeof msg === 'string' && NOISE_RE.test(msg)

  const originalWarn = logger.warn.bind(logger)
  const originalWarnOnce = logger.warnOnce.bind(logger)

  logger.warn = (msg, options) => {
    if (isNoise(msg)) return
    originalWarn(msg, options)
  }
  logger.warnOnce = (msg, options) => {
    if (isNoise(msg)) return
    originalWarnOnce(msg, options)
  }
  return logger
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  
  // Alvo único de deploy: Cloudflare Workers, preset `cloudflare-durable`
  // (`package.json` → `build:cf`, `NITRO_PRESET=cloudflare-durable`).
  // Extensão de `cloudflare-module` (mesmo runtime, mesmas Queues/Cron
  // Triggers/Tasks) que soma suporte nativo a WebSocket via Durable Object
  // interna do Nitro (`$DurableObject`) — trocado de `cloudflare-module` para
  // isto quando o Chat precisou de socket único sem Supabase Realtime
  // (`_docs/CHAT/PRD.md`). Self-host (Docker/node-server) foi descontinuado —
  // nunca chegou a ser usado em produção.
  // Docs: https://nitro.build/deploy/providers/cloudflare
  nitro: {
    cloudflare: {
      // Faz o Nitro gerar .output/server/wrangler.json (com `main` + binding
      // `ASSETS`) e .wrangler/deploy/config.json, permitindo `wrangler deploy`
      // sem flags. Só é lido pelos presets cloudflare-*; inerte no node-server.
      deployConfig: true,
      // Polyfills Node sobre workerd (jsonwebtoken, @aws-sdk). Redundante com o
      // `nodejs_compat` do wrangler.toml, mas explícito para builds locais.
      nodeCompat: true,
    },
    // Nitro Tasks — acionadas por CF Cron Triggers (Workers) e disponíveis
    // também via POST /_nitro/tasks/:name para uso manual/testes.
    // Docs: https://nitro.build/guide/tasks
    //
    // `websocket: true` liga o suporte nativo de WebSocket do Nitro
    // (`defineWebSocketHandler`, via `crossws`) — usado só pelo Chat
    // (`server/api/admin/chat/socket.ts`, substitui Supabase Realtime por
    // custo, ver `_docs/CHAT/PRD.md`). No preset `cloudflare-durable`
    // (`package.json` → `build:cf`) o transporte é uma Durable Object
    // hibernatável nativa do próprio Nitro (`$DurableObject`, sem classe
    // customizada); no preset padrão `node-server` seria o adaptador `ws`
    // (não usado hoje — só o alvo Cloudflare liga o Chat nesta fase).
    experimental: {
      tasks: true,
      websocket: true,
    },
    // Mapeamento cron → tasks. A expressão DEVE bater com wrangler.toml [triggers].
    scheduledTasks: {
      '* * * * *': ['webhook:drain'],
      '0 * * * *': ['orders:archive'],
      // Sem esta linha o Worker recebe o cron de 15 min do wrangler.toml e não
      // roteia para task nenhuma: `agent:evaluate` nunca roda e NADA falha —
      // os turnos só acumulam com avaliacao_pendente = true.
      '*/15 * * * *': ['agent:evaluate'],
    },
    // Headers de segurança aplicados a todas as rotas.
    // CSP omitida deliberadamente: já tentamos uma vez (2026-09-01) e quebrou
    // produção — Nuxt injeta script(s) inline de hidratação com conteúdo
    // dinâmico por página (hash fixo nunca casa), o Nitro/Vue injeta handlers
    // inline em alguns componentes, o Google Fonts e o beacon de analytics da
    // própria Cloudflare (injetado na borda, fora do nosso controle) também
    // precisam de allowlist. Uma CSP correta aqui exige nonce por request
    // (plumbing novo no Nitro) + mapear TODO domínio de terceiro real up
    // front — não algo pra refazer sem testar contra o deploy real primeiro.
    routeRules: {
      '/**': {
        headers: {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
          // Desativa o XSS Auditor legado (causa XSS em alguns browsers).
          // Proteção real viria via CSP (ver nota acima — não é este momento).
          'X-XSS-Protection': '0',
          // HSTS apenas em produção; em dev quebraria requisições HTTP.
          ...(process.env.NODE_ENV === 'production'
            ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' }
            : {}),
        },
      },
    },
  },
  
  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@nuxt/image',
    '@nuxt/eslint'
  ],
  // Provider 'none' (sem transformação server-side):
  // o storage S3-compatível (Cloudflare R2/Supabase Storage) já entrega
  // imagens via CDN dedicada — adicionar IPX/Vercel inseriria latência
  // sem ganho de qualidade. NuxtImg continua aplicando lazy/sizes/loading
  // automaticamente, que é o objetivo da Fase 3.1.
  image: {
    provider: 'none',
  },
  supabase: {
    redirect: false,
    types: '~~/app/types/database.types.ts',
    // serviceKey lê a env var existente no projeto (NUXT_SUPABASE_SECRET_KEY).
    // O módulo @nuxtjs/supabase esperaria SUPABASE_SERVICE_KEY ou
    // NUXT_SUPABASE_SERVICE_KEY — como o projeto usa outro nome, passamos aqui
    // de forma explícita para que serverSupabaseServiceRole funcione.
    serviceKey: process.env.NUXT_SUPABASE_SECRET_KEY,
  },
  runtimeConfig: {
    // Private runtime config (server-side only)
    // Automaticamente populado por variáveis de ambiente com prefixo NUXT_
    // URL pública deste ambiente — base de todo link que a aplicação gera e
    // envia para fora (link de catálogo do agente, convite de usuário).
    // OBRIGATÓRIA: `resolveSiteUrl` lança quando vazia, não deriva da request.
    // Dois motivos: o link do agente é montado no consumer da fila, quando a
    // requisição do webhook já respondeu e não existe mais; e derivar do header
    // `Host` seria Host header injection — o link sairia por WhatsApp, no nome
    // da loja, apontando para o domínio de quem forjou o header.
    siteUrl: '', // NUXT_SITE_URL
    // Os segredos de SAÍDA do webhook (Bearer do canal e chave do HMAC do
    // corpo) NÃO ficam aqui: vivem no Supabase Vault desde a migration 103 e
    // são configurados pelo lojista em Configurações → Webhooks. Com eles em
    // variável de ambiente, só quem tinha acesso ao deploy conseguia apontar a
    // notificação para o sistema da loja.
    // Token imprevisível embutido no path da URL do webhook do WhatsApp — nem
    // a Meta nem o provedor enviam assinatura HMAC (ver
    // arquitetura-agente-whatsapp-in-app.md § 3).
    whatsappWebhookToken: '', // NUXT_WHATSAPP_WEBHOOK_TOKEN
    // Token do provedor de WhatsApp (parceiro homologado Meta, espelho 1:1 da
    // Cloud API) — enviado como `Authorization: Bearer` em toda chamada de
    // envio (ver arquitetura-agente-whatsapp-in-app.md § 10). Descontinuado a
    // partir da fase 2 de arquitetura-midia-e-provedor-whatsapp.md § 11, quando
    // a credencial passa para o Vault e a URL base para `loja`.
    whatsappApiToken: '', // NUXT_WHATSAPP_API_TOKEN
    // S3 — sem prefixo NUXT_; injetados explicitamente para garantir
    // disponibilidade no runtime Nitro (process.env não é garantido em Nuxt 4)
    s3Region: process.env.S3_REGION ?? '',
    s3Endpoint: process.env.S3_ENDPOINT ?? '',
    s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
    s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    s3AvatarBucketName: process.env.S3_AVATAR_BUCKET_NAME ?? '',
    s3AttachmentsBucketName: process.env.S3_ATTACHMENTS_BUCKET_NAME ?? '',
    // URL pública do bucket (domínio customizado R2/CDN)
    s3PublicUrl: process.env.S3_PUBLIC_URL ?? '',
    // Google Maps Platform — CHAVE PRIVADA (server-only). Restrita por IP dos
    // servidores/edge e às APIs Places/Geocoding/Routes. Usada apenas pelo BFF
    // em /api/maps/*. NUNCA vai ao cliente.
    googleMapsServerKey: '', // NUXT_GOOGLE_MAPS_SERVER_KEY
    public: {
      // Public runtime config (client + server)
      // Automaticamente populado por variáveis de ambiente com prefixo NUXT_PUBLIC_
      // CHAVE PÚBLICA — restrita a "Websites (HTTP referrers)" e à Maps JavaScript
      // API APENAS (renderização visual do mapa). Não tem acesso a Places/Geocoding.
      googleMapsApiKey: '' // NUXT_PUBLIC_GOOGLE_MAPS_API_KEY
    }
  },
  css: ['~/assets/main.css'],
  app: {
    head: {
      // Script inline executado antes da renderização para evitar FOUC
      // (Flash of Unstyled Content). Resolve o tema com a MESMA prioridade do
      // `resolvedTheme` (useTheme): tema da loja (cookie `store_theme`, quando
      // definido e != system) > preferência do usuário (cookie `theme`) > SO
      // (`prefers-color-scheme`). Aplica `.dark` no <html> de forma síncrona,
      // antes do parse do CSS principal.
      script: [
        {
          tagPriority: 'critical',
          tagPosition: 'head',
          innerHTML: THEME_SCRIPT,
        },
      ],
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
    // Sourcemaps desativados em build de produção:
    // 1) `@tailwindcss/vite` não emite sourcemaps próprios em produção e gera
    //    o warning "Sourcemap is likely to be incorrect" quando o Vite os pede.
    // 2) Sourcemaps de produção expõem código original em prod (risco de leak)
    //    e não são lidos por nenhuma rota crítica.
    // O setting `nuxt.sourcemap` (server/client) cobre o lado Nuxt; este aqui
    // garante que o pipeline interno do Vite/Rollup também desative.
    build: {
      sourcemap: false,
    },
  },
  hooks: {
    // Injetamos o `customLogger` AQUI (não em `vite.customLogger`) porque o
    // Nuxt cria duas instâncias Vite (client + server) durante o build e
    // sobrescreve o logger no setup. O hook `vite:extendConfig` roda DEPOIS
    // dessa configuração e garante que nosso filtro fique ativo nos dois
    // ambientes — silenciando warnings cosméticos de sourcemap conhecidos
    // (Tailwind v4 e module-preload-polyfill) sem afetar erros reais.
    'vite:extendConfig'(viteInlineConfig: Readonly<import('vite').UserConfig>) {
      ;(viteInlineConfig as import('vite').UserConfig).customLogger = createSilentSourcemapLogger()
    },
  },
  eslint: {
    // Default config (stylistic desligado): mantém só os checks de
    // qualidade/correção que o time core do Nuxt empacota. Regras de
    // formatação ficam por conta do editor (Prettier opcional) — evita
    // ruído em código legado fora do escopo da fase atual.
    config: {
      stylistic: false,
    },
  },
  sourcemap: {
    server: false,
    client: false,
  },
})

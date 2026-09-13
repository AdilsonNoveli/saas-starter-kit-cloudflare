# NuxFire — Product Roadmap (Única Fonte da Verdade)

> **Documento Oficial de Direção Estratégica e Evolução do Produto**  
> **Localização canônica:** `_docs/ROADMAP.md`  
> **Papel no ecossistema de documentação:**  
> - Para saber o que **já existe hoje no código**: consulte [`_docs/CURRENT_STATE.md`](file:///c:/nuxfire/_docs/CURRENT_STATE.md) (As-Is).  
> - Para ver a **lista detalhada de tarefas e tickets operacionais**: consulte [`_docs/BACKLOG.md`](file:///c:/nuxfire/_docs/BACKLOG.md) (Backlog).  
> - Este documento define **para onde o produto vai, em que ordem e por quais marcos (To-Be)**.

---

## 1. Visão do Produto (Target State / To-Be)

O objetivo do **NuxFire** é ser a **referência definitiva de SaaS Starter Kit Serverless na Borda (Cloudflare Edge)**, combinando:

1. **Custo Fixo Praticamente Zero:** Arquitetura 100% serverless edge (Cloudflare Workers, Hyperdrive, KV, R2, D1, Queues, Durable Objects) escalando de zero a milhões de requisições sem servidores dedicados ociosos.
2. **Pronto para Produção Enterprise:** Autenticação robusta (OpenAuth.js + OAuth + MFA TOTP com chaves AES-GCM), isolamento estrito de autoridade (RBAC tenant vs. Platform Admin com barreira tripla) e conformidade LGPD/privacidade.
3. **DX (Developer Experience) Impecável:** Nuxt 4 + Vue 3 + Tailwind/Nuxt UI v4 + tRPC + Drizzle ORM sobre PostgreSQL, proporcionando type-safety estrita de ponta a ponta e deploys declarativos via SST v4.

---

## 2. Resumo da Base Atual (v1.0.0 — Concluída)

A versão **v1.0.0** representa a fundação estável da aplicação atualmente implementada no código:

* ✅ **Infraestrutura Serverless Edge:** Monorepo Bun + Cloudflare Workers + SST v4 com deploy declarativo multi-stage (`dev`, `stage`, `production`).
* ✅ **Autenticação & Identidade:** OpenAuth.js com E-mail/Senha (`scrypt`), Código OTP por E-mail, **Social OAuth (GitHub e Google)**, Rate Limiting em Cloudflare KV e revogação remota de sessões.
* ✅ **MFA / 2FA TOTP:** Criptografia AES-GCM no Postgres, QR Code gerado 100% no cliente (`uqr`) e elevação de sessão temporária (<30 min).
* ✅ **Multi-Tenancy & RBAC:** Sub-rotas dinâmicas por time (`/[team]/*`), papéis via `nuxt-authorization`, convites com expiração e controle rígido de limite de assentos (`maxSeats`).
* ✅ **Platform Admin Console (`/admin`):** Shell segregado do RBAC de times, bloqueio por MFA, busca cross-tenant, suspensão/reativação de empresas, sincronização de catálogo de planos com a Stripe, visualizador de fila/DLQ com replay e auditoria imutável.
* ✅ **Billing Híbrido:** Stripe Checkout (com reaproveitamento de `stripeCustomerId`) + Paddle.js overlay, planos no banco de dados e ledger de eventos idempotente via Cloudflare KV.
* ✅ **Real-Time & Jobs:** WebSockets nativos em Cloudflare Durable Objects, filas assíncronas com Cloudflare Queues + DLQ e Cron de hora em hora.
* ✅ **Site Público & Docs:** Nuxt Content v3 com Cloudflare D1 e **busca full-text funcional na documentação** via `UCommandPalette` (`Ctrl+K`).
* ✅ **Testes Unitários:** 4 arquivos de teste cobrindo regras críticas de negócio (14 testes passando no Vitest).

---

## 3. Horizontes de Entrega (Now / Next / Later)

A priorização de desenvolvimento obedece à metodologia de três horizontes:

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│           NOW           │     │          NEXT           │     │          LATER          │
│     (Curto Prazo - P0)  │───► │     (Médio Prazo - P1)  │───► │    (Longo Prazo - P2/P3)│
│  Fundacional & Gaps P0  │     │   Expansão & Escala P1  │     │   Ecossistema & V2 P2   │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

### 🔴 NOW — Prioridade Imediata (Produção, Credibilidade & Gaps Críticos)
> Foco em fechar as lacunas operacionais mais urgentes para que qualquer projeto derivado do NuxFire possa ir a público com processos automatizados.

1. **Pipeline de CI/CD Oficial (`OPS-01`, `OPS-02`):**
   * Workflows no GitHub Actions para validação de tipagem (`vue-tsc`), linter e testes no Vitest em cada Pull Request.
   * Deploy automatizado por branch (`main` -> produção, `staging` -> stage).
2. **Histórico e Download de Invoices (`BIL-01`):**
   * Visualização da lista de faturas pagas na tela `[[team]]/settings/billing.vue`.
   * Acesso direto aos recibos e notas emitidas via Stripe/Paddle Customer Portal ou download direto.
3. **Wizard de Onboarding Inicial (`AUT-01`):**
   * Fluxo guiado após o primeiro login: (1) Definir nome e slug do primeiro time, (2) Upload opcional de logotipo, (3) Convite do primeiro colega de equipe, (4) Redirecionamento ao dashboard com boas-vindas.
4. **Busca Unificada no Site Público (`CNT-01`):**
   * Adicionar a coleção `blog` ao índice de busca do `@nuxt/content` v3 no componente `Search.vue` (`Ctrl+K`).

---

### 🟡 NEXT — Médio Prazo (Retenção, Expansão & Automação)
> Foco em tornar o faturamento mais flexível e a comunicação proativa.

1. **Migração de Planos In-App com Rateio (`BIL-02`, `BIL-03`):**
   * Troca direta de plano (upgrade/downgrade) na interface sem precisar cancelar e assinar novamente.
   * Cálculo de rateio proporcional (*proration*) nativo das APIs Stripe e Paddle.
   * Validação de assentos antes de permitir downgrade para planos menores.
2. **Motor de Notificações por E-mail (`EML-01`, `EML-02`):**
   * Disparo automático de e-mails transacionais a partir de notificações inseridas no banco de dados.
   * Painel de preferências do usuário para selecionar quais notificações deseja receber por e-mail vs. apenas no sino do dashboard.
3. **Analytics Reais de Uso do Tenant (`OBS-02`):**
   * Substituição do gráfico ilustrativo do dashboard por métricas agregadas reais do time (número de assentos ocupados, jobs processados, histórico de atividades).
   * Integração configurável com ferramentas de web analytics sem cookies (Plausible, Umami ou Cloudflare Web Analytics).
4. **Internacionalização Completa (i18n) (`CNT-02`):**
   * Extração de todas as strings estáticas da UI para arquivos de mensagens traduzidos em Inglês (`en`), Português (`pt-BR`) e Espanhol (`es`).

---

### 🟢 LATER — Longo Prazo (Recursos Avançados & Plataforma)
> Expansão da plataforma para padrões enterprise e suporte a desenvolvedores externos.

1. **Novos Provedores de Autenticação OAuth (`AUT-04`, `AUT-05`):**
   * Integração com Apple e Microsoft no OpenAuth.js.
   * Suporte a Passkeys / WebAuthn para login biométrico sem senha.
2. **Webhooks de Saída (Outgoing Webhooks):**
   * Interface para que os times configurem URLs de webhook e recebam eventos da aplicação em seus próprios servidores com assinatura HMAC.
3. **Suíte Completa de Testes E2E (`TST-02`):**
   * Testes ponta a ponta com Playwright simulando jornada de usuário: cadastro -> login social/senha -> checkout mock -> convite de membros.
4. **Impersonação de Tenant & IP Allowlisting no Admin (`ADM-01`, `ADM-02`):**
   * Capacidade de operadores autorizados acessarem temporariamente a visão de um cliente para suporte técnico com auditoria dedicada.
   * Restrição de acesso ao console `/admin` por faixa de IPs autorizados.
5. **Gerenciador de Feature Flags:**
   * Controle granular de funcionalidades por plano e por tenant via dashboard admin.

---

## 📅 4. Plano de Lançamentos por Versões (Release Plan)

```
   v1.0.0                 v1.1.0                 v1.2.0                 v2.0.0
 (Current Base)      (DevOps & Onboard)     (Billing & Notifs)       (Enterprise)
───────●──────────────────────●──────────────────────●──────────────────────●──────►
  • Cloudflare Edge      • GitHub CI/CD         • In-App Proration     • Outgoing Webhooks
  • OpenAuth + MFA       • Invoices History     • Email Notifications  • E2E Playwright
  • Teams + RBAC         • Onboarding Flow      • i18n Completo        • Passkeys/Apple
  • Stripe/Paddle        • Unified Search       • Tenant Analytics     • Feature Flags
```

### 📦 Versão v1.0.0 — *Base Atual Estável (Produção)*
* **Status:** Concluída e em operação.
* **Escopo:** Infraestrutura Cloudflare + SST v4, OpenAuth.js (Senha, OTP, GitHub, Google), MFA TOTP criptografado, Multi-Tenancy com slugs e assentos, Platform Admin triplo com auditoria, Stripe/Paddle billing, Durable Objects WebSockets, Queues + DLQ, Nuxt Content v3 com D1 e 14 testes unitários no Vitest.

### 📦 Versão v1.1.0 — *DevOps, Usabilidade & Transparência Financeira*
* **Meta:** Eliminar todos os itens do horizonte **NOW**.
* **Entregáveis:**
  - [ ] Pipeline CI/CD GitHub Actions (`.github/workflows/ci.yml` e `deploy.yml`).
  - [ ] Tela/modal de histórico de faturas e recibos na aba de Billing.
  - [ ] Wizard de primeiro acesso orientando a criação e configuração do time inicial.
  - [ ] Busca de documentação expandida para incluir artigos do blog.
  - [ ] Atualização dos testes unitários cobrindo os novos utilitários.

### 📦 Versão v1.2.0 — *Faturamento Dinâmico & Comunicação Omnichannel*
* **Meta:** Executar os itens prioritários do horizonte **NEXT**.
* **Entregáveis:**
  - [ ] Fluxo nativo de troca de plano com cálculo proporcional (*proration*) via Stripe e Paddle.
  - [ ] Worker de e-mail consumindo eventos de notificação e respeitando preferências do usuário.
  - [ ] Dashboard com métricas de uso real do time.
  - [ ] Tradução completa da UI com alternador de idioma no perfil.

### 📦 Versão v2.0.0 — *Plataforma Aberta & Padrões Corporativos*
* **Meta:** Concluir o horizonte **LATER**.
* **Entregáveis:**
  - [ ] Sistema de Outgoing Webhooks com assinaturas de segurança e retentativas automáticas.
  - [ ] Suíte Playwright E2E rodando no pipeline de CI.
  - [ ] Suporte a login com Apple, Microsoft e Passkeys/WebAuthn.
  - [ ] Ferramenta de impersonação de clientes para suporte no Platform Admin.
  - [ ] Sistema de Feature Flags dinâmicas por time.

---

## 🚦 5. Critérios de Conclusão (Definition of Done - DoD)

Para qualquer funcionalidade deste roadmap ser considerada concluída e promovida para o [`_docs/CURRENT_STATE.md`](file:///c:/nuxfire/_docs/CURRENT_STATE.md):

1. **Type-Safety Estrita:** Zero erros no comando `bun run typecheck`.
2. **Cobertura de Testes:** Regras de negócio acompanhadas de testes unitários no Vitest (`bun run test`).
3. **Compatibilidade Cloudflare Edge:** Código compatível com o runtime de Workers (sem dependências nativas de Node que violem o isolamento do Cloudflare).
4. **Zero Suposição / Documentação Sincronizada:** Atualizar o [`_docs/BACKLOG.md`](file:///c:/nuxfire/_docs/BACKLOG.md) (marcar concluído) e transferir a especificação para o [`_docs/CURRENT_STATE.md`](file:///c:/nuxfire/_docs/CURRENT_STATE.md).
5. **Auditoria no Admin:** Se a funcionalidade envolver mutações do Platform Admin, deve registrar log na tabela `AuditLog`.

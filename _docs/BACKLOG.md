# NuxFire — Product Backlog (Lista de Funcionalidades & Tarefas)

> **Documento Operacional de Tarefas e Funcionalidades Planejadas**  
> **Classificação de Prioridades:**  
> - **[P0 - Crítico]**: Blocker funcional, conformidade ou credibilidade do produto.  
> - **[P1 - Alto]**: Alto valor de negócio, retenção de clientes e usabilidade fundamental.  
> - **[P2 - Médio]**: Melhorias contínuas, polimento e flexibilidade.  
> - **[P3 - Baixo]**: Nice-to-have, experimentações e expansões futuras.

---

## 1. DevOps, Infraestrutura & CI/CD

| ID | Tarefa / User Story | Prioridade | Esforço Est. | Descrição |
|---|---|---|---|---|
| **OPS-01** | Pipeline de CI automatizado (PRs) | **P0** | Médio | Criar workflow no GitHub Actions para rodar `bun run typecheck`, linter e `bun run test` em todo Pull Request. |
| **OPS-02** | Pipeline de CD para Staging e Produção | **P0** | Médio | Deploy automatizado no Cloudflare via SST ao fazer merge na branch `main` ou `staging`. |
| **OPS-03** | Secrets Checker de Pré-deploy | **P1** | Baixo | Script de validação que impede deploy caso variáveis obrigatórias do `.env.example` estejam ausentes no SST. |
| **OPS-04** | Backup Automatizado do Banco | **P1** | Médio | Rotina agendada (Cron Worker ou script) para snapshot diário do PostgreSQL. |

---

## 2. Faturamento & Assinaturas (Billing)

| ID | Tarefa / User Story | Prioridade | Esforço Est. | Descrição |
|---|---|---|---|---|
| **BIL-01** | Histórico e Download de Invoices | **P0** | Médio | Exibir lista de faturas na aba Billing (`billing.vue`) com link direto para download de recibos da Stripe/Paddle. |
| **BIL-02** | Migração In-App de Planos (Upgrade/Downgrade) | **P1** | Alto | Permitir upgrade/downgrade direto no painel com cálculo de rateio proporcional (*proration*) sem novo checkout completo. |
| **BIL-03** | Alerta de Limite de Assentos Pré-Checkout | **P1** | Baixo | Quando um time tentar fazer downgrade para um plano com menos assentos do que membros atuais, alertar antes. |
| **BIL-04** | Suporte a Cupons e Códigos Promocionais | **P2** | Baixo | Campo de inserção de cupom de desconto no fluxo de checkout da Stripe e Paddle. |
| **BIL-05** | Alertas de Pagamento Pendente / Falho na UI | **P1** | Médio | Exibir banner persistente de aviso no dashboard quando o webhook `invoice.payment_failed` for recebido. |

---

## 3. Autenticação, Identidade & Onboarding

| ID | Tarefa / User Story | Prioridade | Esforço Est. | Descrição |
|---|---|---|---|---|
| **AUT-01** | Wizard de Onboarding Inicial | **P0** | Alto | Fluxo de boas-vindas após o primeiro registro: (1) Nome do time, (2) Logo/Slug, (3) Convite de colegas, (4) Conclusão. |
| **AUT-02** | Alteração de Senha In-App | **P1** | Médio | Permitir que o usuário autenticado altere sua senha diretamente em `/account-settings/security` sem passar pelo esqueci minha senha. |
| **AUT-03** | Backup Codes para MFA / 2FA | **P1** | Médio | Geração de códigos de recuperação descartáveis (*recovery codes*) durante a ativação do 2FA TOTP. |
| **AUT-04** | Novos Provedores OAuth (Apple, Microsoft) | **P2** | Médio | Adicionar adaptadores Apple e Microsoft ao OpenAuth e botões no `AuthSocialLogin.vue`. |
| **AUT-05** | Suporte a Passkeys (WebAuthn) | **P3** | Alto | Autenticação moderna sem senha usando biometria e chaves FIDO2. |

---

## 4. E-mails Transacionais & Notificações

| ID | Tarefa / User Story | Prioridade | Esforço Est. | Descrição |
|---|---|---|---|---|
| **EML-01** | Motor de Notificação Híbrido (WebSocket + E-mail) | **P1** | Médio | Enviar e-mail automático quando notificações críticas forem inseridas (ex: convites, alertas de cobrança). |
| **EML-02** | Central de Preferências de E-mail | **P1** | Baixo | Tela em `/account-settings/notifications` permitindo ao usuário escolher quais tipos de e-mails deseja receber. |
| **EML-03** | Template de E-mail de Troca de Plano / Cancelamento | **P2** | Baixo | Novos templates React Email para confirmação de assinatura, renovação e cancelamento. |
| **EML-04** | Ativação do Provedor AWS SES e Mailgun | **P2** | Baixo | Finalizar abstração e documentação para alternar facilmente entre Resend, SES e Mailgun via `config.ts`. |

---

## 5. Site Público, Conteúdo & SEO

| ID | Tarefa / User Story | Prioridade | Esforço Est. | Descrição |
|---|---|---|---|---|
| **CNT-01** | Busca Unificada (Docs + Blog) | **P0** | Baixo | Integrar a coleção `blog` ao modal `Search.vue` do `@nuxt/content` v3. |
| **CNT-02** | Internacionalização Completa do Site e App | **P1** | Alto | **Fundação concluída** (ver detalhamento abaixo); extração das strings ainda pendente. Config reestruturada para a convenção oficial do `@nuxtjs/i18n` v10 (`restructureDir: "i18n"`, `i18n/i18n.config.ts`, `i18n/locales/*.json`), com `pt-BR` e `es` habilitados em `apps/app`, `apps/web` e `apps/login` (o `fr` placeholder foi removido). Convenção de prefixo de chave por layer travada. |
| **CNT-03** | RSS Feed Automatizado para o Blog | **P2** | Baixo | Rota Nitro gerando feed XML RSS/Atom para os posts do blog. |
| **CNT-04** | Componente de Tabela de Preços Dinâmica no Site | **P2** | Médio | Fazer com que a página `/pricing` pública consuma os planos ativos direto do banco em vez de cards estáticos. |

### CNT-02 — estado da internacionalização

**Feito (fundação):**

- `apps/app` (`strategy: "no_prefix"`), `apps/web` (`strategy: "prefix_except_default"`, por SEO) e `apps/login` (`strategy: "no_prefix"`; este app já força `ssr: false` no fluxo OpenAuth, prefixar rotas só ampliaria essa fragilidade sem ganho de indexação) com locales `en` / `pt-BR` / `es`.
- `@nuxtjs/i18n` adicionado ao `apps/login` (antes só existia em `apps/app` e `apps/web`).
- Esqueletos `i18n/locales/{en,pt-BR,es}.json` criados nos 5 layers, contendo apenas a raiz do namespace.
- `scripts/check-i18n-completeness.ts` + `bun run check:i18n`: compara o conjunto de chaves de cada locale contra o `en.json` da mesma pasta e falha (exit ≠ 0) em qualquer chave faltante ou sobrando.

**Ainda NÃO feito (rodadas futuras):**

- Extração das strings de `apps/app` (hoje só a chave `welcome`).
- Extração de `apps/web` — landing, docs, blog e meta de SEO (piloto, tarefa imediatamente seguinte).
- Extração de `apps/login` (login / signup / forgot-password) além do stub `common.*`.
- Extração dos 5 layers, incluindo o bug já identificado de strings em português hardcoded em `layers/kanban/app/components/KanbanBoard.vue`.
- Localização dos templates de e-mail (`packages/emails/templates/*.tsx`, hoje 100% em inglês).
- Persistência de idioma no banco de dados (hoje só o cookie nativo do módulo).

**Prefixo de chave por layer (convenção travada):**

| Layer | Prefixo de chave | Arquivos |
|---|---|---|
| `kanban` | `kanban.*` | `layers/kanban/i18n/locales/{en,pt-BR,es}.json` |
| `teams` | `teams.*` | `layers/teams/i18n/locales/{en,pt-BR,es}.json` |
| `billing` | `billing.*` | `layers/billing/i18n/locales/{en,pt-BR,es}.json` |
| `notifications` | `notifications.*` | `layers/notifications/i18n/locales/{en,pt-BR,es}.json` |
| `admin` | `admin.*` | `layers/admin/i18n/locales/{en,pt-BR,es}.json` |

Regra oficial da v10: mensagens do projeto principal (`apps/app/i18n/locales/*.json`) sempre sobrescrevem mensagens de um layer em caso de colisão de chave — por isso o prefixo por layer não é opcional.

---

## 6. Qualidade, Testes & Observabilidade

| ID | Tarefa / User Story | Prioridade | Esforço Est. | Descrição |
|---|---|---|---|---|
| **TST-01** | Testes de Integração de Rotas tRPC | **P1** | Médio | Adicionar suites de testes Vitest simulando chamadas completas a roteadores tRPC (teams, invites, account). |
| **TST-02** | Suíte de Testes E2E com Playwright | **P2** | Alto | Testes ponta a ponta simulando fluxo do usuário: cadastro -> login -> criar time -> checkout mock. |
| **OBS-01** | Integração com Sentry / Error Tracking | **P1** | Médio | Captura automática de erros não tratados nos Workers com contexto de usuário e release. |
| **OBS-02** | Integração Nativa de Web Analytics | **P1** | Baixo | Suporte configurável a Cloudflare Web Analytics, Plausible ou Umami sem cookies intrusivos. |

---

## 7. Console Platform Admin (`/admin`)

| ID | Tarefa / User Story | Prioridade | Esforço Est. | Descrição |
|---|---|---|---|---|
| **ADM-01** | Impersonação de Tenant (Login como Time) | **P1** | Alto | Permitir ao Super Admin acessar temporariamente o painel de um cliente para suporte técnico. |
| **ADM-02** | Restrição de Acesso por IP (IP Allowlisting) | **P2** | Médio | Bloquear acesso a rotas `/admin/*` para IPs fora de uma lista configurada no ambiente. |
| **ADM-03** | Gráficos de Receita MRR/ARR no Painel Admin | **P2** | Médio | Exibir métricas financeiras consolidadas (Stripe + Paddle) na visão geral `/admin`. |

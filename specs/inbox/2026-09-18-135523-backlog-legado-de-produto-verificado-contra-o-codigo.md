# Inbox: Backlog legado de produto verificado contra o codigo

| Metadado | Valor |
| --- | --- |
| Status | Capturada |
| Capturada em | 2026-09-18T16:55:23Z |
| Slug | backlog-legado-de-produto-verificado-contra-o-codigo |
| Origem | Input do usuário |
| Processamento | Análise inicial sem perguntas |
| Sessão de descoberta | Captura avulsa. |
| Turno da conversa | Não se aplica. |
| Integridade do original | SHA-256 `53d9f1d412a78c19555f236f75f83348efdaefd9fe8452ef1e0005160f7950ff` |
| Backlog derivado | Nenhum |
| Spec derivada | Nenhuma |

## Texto original

Backlog de produto legado (origem: _docs/docs/BACKLOG.md, CLEANUP_DEBT_PLAN.md e as lacunas de CURRENT_STATE.md), conferido item a item contra o código em 2026-09-18. Só entram aqui os itens que continuam em aberto; cada um deve ser refinado por fireskill-02-backlog antes de virar spec. A prioridade P0..P3 e o esforço são os do documento de origem, não foram reavaliados.

ABERTOS (verificados ausentes no código)
DevOps: OPS-01 pipeline de CI em PR (typecheck, lint, test; .github/workflows não existe) P0; OPS-02 CD para staging e produção via SST P0; OPS-03 checagem de secrets antes do deploy (scripts/ não tem) P1; OPS-04 backup agendado do PostgreSQL (nada em infra/ nem scripts/) P1.
Billing: BIL-01 histórico e download de invoices (billing.vue só cita "invoices" no texto) P0; BIL-02 troca de plano dentro do app com proration (nenhum código de troca de plano) P1; BIL-03 alerta de limite de assentos antes de downgrade P1.
Autenticação: AUT-01 wizard de onboarding pós-cadastro P0; AUT-02 alterar senha dentro do app (o botão hoje redireciona para o fluxo "esqueci minha senha" em account-settings/security.vue) P1; AUT-03 códigos de recuperação do MFA P1; AUT-04 provedores Apple e Microsoft (o emissor só registra GitHub e Google) P2; AUT-05 passkeys/WebAuthn P3.
E-mail e notificações: EML-01 e-mail automático para notificações críticas (sendEmail só é usado em convites e no Worker de auth) P1; EML-02 central de preferências de e-mail (a página account-settings/notifications não tem preferências de e-mail) P1; EML-03 templates de troca de plano e cancelamento (só existem Welcome, VerificationCode e Invitation) P2; EML-04 ativar Mailgun/SES/SparkPost/SMTP (transportes comentados em apps/functions/src/emails.ts e desligados em config.ts) P2.
Site: CNT-02 internacionalização completa: apps/web já tem as strings extraídas, mas apps/app só tem a chave welcome, apps/login só common.* e as cinco layers só o namespace; faltam também os templates de e-mail e a persistência do idioma no banco; há texto em português fixo em layers/kanban/app/components/KanbanBoard.vue ("Nova coluna") P1; CNT-03 feed RSS do blog P2; CNT-04 página de preços lendo os Plan do banco (PricingCard é estático) P2.
Qualidade: TST-01 testes de integração das rotas tRPC (não existe nenhum teste de router) P1; TST-02 testes E2E (sem Playwright/Cypress) P2; OBS-01 Sentry/error tracking P1; OBS-02 Web Analytics P1.
Admin: ADM-01 impersonação de tenant P1; ADM-02 allowlist de IP para /admin P2; ADM-03 gráficos MRR/ARR P2.
Produto: métricas reais no gráfico do dashboard da equipe (hoje é uma série ilustrativa gerada por random walk em TeamDashboardChart.client.vue).

PARA CONFERIR ANTES DE REFINAR (não deu para provar aberto ou fechado só com busca)
BIL-04 cupons e códigos promocionais (layers/billing/app/composables/use-payments.ts cita "discount"); BIL-05 aviso persistente de pagamento pendente ou falho (existe layers/billing/app/components/billing/BillingTrialBanner.vue e os webhooks tratam past_due; falta confirmar se o aviso cobre pagamento falho).

JÁ RESOLVIDOS OU DESATUALIZADOS NA ORIGEM (não entram no backlog)
CNT-01 busca unificada docs + blog: já existe (apps/web/app/pages/blog/index.vue usa Search collection="blog"). CLEANUP item 1 (paths.json gerado por scripts/generate-paths.ts): feito. CLEANUP item 2 (endpoints de IA sem uso): removidos. CLEANUP item 3 (team-dashboard fica em apps/app): decisão de manter; continua valendo.

## Contexto consultado

_docs/docs/BACKLOG.md; _docs/docs/CLEANUP_DEBT_PLAN.md; _docs/docs/CURRENT_STATE.md

## Resumo processado

**Inferência:** Itens de backlog do _docs/docs ainda em aberto, conferidos contra o codigo em 2026-09-18.

## Análise inicial

### Problema ou oportunidade

**Declaração ou inferência identificada:** Não identificado no texto original.

### Pessoas afetadas ou beneficiadas

**Declaração ou inferência identificada:** Não identificado no texto original.

### Resultado ou valor esperado

**Declaração ou inferência identificada:** Não identificado no texto original.

### Sinais de escopo, regras ou solução

**Sinais extraídos, não decisões:** Não identificado no texto original.

### Informações que talvez precisem ser guardadas

**Sinais para conversar depois, não confirmação:** Não identificado no texto original.

### Riscos e dependências

**Análise preliminar:** Não identificado no texto original.

## Possíveis direções futuras

**Hipóteses para backlog ou spec, não requisitos:** Não identificado no texto original.

## Pontos a revisar no futuro

**A revisar:** Revisar as lacunas antes da promoção.

## Rastreabilidade

- Formulação original preservada integralmente nesta captura.
- Análises não substituem decisões do usuário.
- Backlogs e specs derivados devem referenciar este arquivo.

## Próximo passo

Manter em `specs/inbox/` ou refinar com `$fireskill-02-backlog`.

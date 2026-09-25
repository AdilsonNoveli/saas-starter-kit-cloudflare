# Inbox: Checkout: criar time, entrada do comprador e plano pago apos o pagamento

| Metadata | Value |
| --- | --- |
| Status | Captured |
| Captured at | 2026-09-25T23:26:21Z |
| Slug | checkout-criar-time-entrada-do-comprador-e-plano-pago-apos-o-pagamento |
| Origin | User input |
| Processing | Initial analysis without questions |
| Discovery session | Standalone capture. |
| Conversation turn | Not applicable. |
| Original integrity | SHA-256 `d2a0e9a828c284ef702bc2be98bcc62ac5aa0a6cb64352a05bc299eb642cc7fb` |
| Derived backlog | None |
| Derived spec | None |

## Original Text

A próxima peça é a spec do checkout, que lê a configuração de Plan.buyerTeamMode/buyerTeamId (implementada em specs/inbox/2026-09-25-200250-plan-setting-what-happens-to-the-buyer-s-team.md e já codificada) para criar o time, a entrada do comprador e o plano pago após o pagamento. Referenciado como 'Phase 7 — Later spec' em specs/draft/0003-landing-refactor-one-offer/spec.md: 'Stripe checkout, webhooks, license delivery and thank-you page, reading the same landing.offer configuration'.

## Consulted Context

No contextual sources consulted.

## Processed Summary

**Inference:** Depois do checkout (Stripe), o sistema precisa criar ou localizar o time do comprador conforme Plan.buyerTeamMode/buyerTeamId, adicionar o comprador a esse time e ativar o plano pago (Subscription).

## Initial Analysis

### Problem or Opportunity

**Statement or identified inference:** Not identified in the original text.

### Affected or Benefited People

**Statement or identified inference:** Comprador (recebe o time/entrada e o plano); Plataforma (recebe a assinatura ativa e a receita).

### Expected Result or Value

**Statement or identified inference:** O pagamento efetivamente provisiona acesso: time certo, comprador com papel no time, plano ativo — sem intervencao manual.

### Signals of Scope, Rules, or Solution

**Extracted signals, not decisions:** Declaracao: deve ler Plan.buyerTeamMode e Plan.buyerTeamId ja existentes no schema. Declaracao: Phase 7 do SPEC-0003 menciona Stripe checkout, webhooks, license delivery e thank-you page lendo landing.offer. Inferencia: para NEW_TEAM, cria um time novo com o comprador como Owner. Inferencia: para EXISTING_TEAM, adiciona o comprador ao Plan.buyerTeamId com algum papel (Member, nao confirmado). Inferencia: se o time de EXISTING_TEAM foi removido ou suspenso, o provisionamento deve recusar e sinalizar erro em vez de criar destino alternativo silenciosamente (regra ja aplicada na validacao do admin).

### Information That May Need Storage

**Signals to discuss later, not confirmation:** Nenhuma tabela nova evidente alem do que ja existe (Plan, Team, TeamMember/entrada, Subscription); a ligacao webhook-pagamento-provisionamento pode exigir idempotencia (registro do evento do Stripe ja processado).

### Risks and Dependencies

**Preliminary analysis:** Depende da spec do checkout/pagamento (Stripe) ainda nao escrita. Webhooks exigem idempotencia (nao duplicar time/entrada em reentrega do evento). Papel do comprador em time existente nao confirmado. 'License delivery' mencionado na Phase 7 pode nao se aplicar a este modelo de negocio (a confirmar). Efeito colateral financeiro/irreversivel: qualquer teste real de checkout exige autorizacao explicita (Stripe test mode, chaves).

## Possible Future Directions

**Hypotheses for backlog or spec, not requirements:** Abrir specs/draft para a Phase 7 do SPEC-0003 (checkout, webhooks, provisionamento) via fireskill-02-backlog e fireskill-03-specify; especialista fireskill-specialist-billing deve ser carregado antes de tocar codigo.

## Points to Review in the Future

**To review:** Confirmar o papel do comprador ao entrar em time existente (Member e suposicao). Confirmar se 'license delivery' e thank-you page fazem parte do escopo real do produto. Confirmar estrategia de idempotencia de webhook do Stripe.

## Traceability

- Original formulation fully preserved in this capture.
- Analyses do not replace user decisions.
- Derived backlogs and specs must reference this file.

## Next Step

Keep in `specs/inbox/` or refine with `$fireskill-02-backlog`.

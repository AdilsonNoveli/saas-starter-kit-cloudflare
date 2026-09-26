# Backlog: Checkout provisiona time e assinatura conforme Plan.buyerTeamMode

| Metadata | Value |
| --- | --- |
| ID | BACKLOG-0007 |
| Status | Promoted |
| Product | Nuxfire (starter kit) — billing genérico de times (`layers/billing`) |
| Epic | Billing: destino do comprador (`Plan.buyerTeamMode`/`buyerTeamId`) |
| Feature | Checkout sem time prévio: comprador paga, depois cria/entra na conta |
| Type | Technical / Story |
| Priority | Unprioritized |
| Milestones | |
| Created at | 2026-09-25 |
| Promoted spec | `specs/defined/0004-checkout-provisiona-time-e-assinatura-conforme-plan-buyerteammode/spec.md` |

## Original Idea

A proxima peca e a spec do checkout, que le Plan.buyerTeamMode/buyerTeamId para criar o time, a entrada do comprador e o plano pago.

## Perceived Problem

O checkout Stripe e Paddle do `layers/billing` (webhooks, ledger de idempotencia em KV, sincronizacao de assinatura) ja existe, mas so serve para um usuario **ja autenticado e ja membro** de um time que quer trocar/assinar o plano desse time (`createStripeCheckoutSession` e `protectedProcedure`, verifica `teamMemberships`; o `team_id` do Paddle vem assinado de uma checagem de membresia equivalente). Nao existe nenhum caminho de checkout para um comprador sem time — que e exatamente o caso que `Plan.buyerTeamMode = NEW_TEAM` precisa (o comprador ainda nao tem time nenhum) e tambem o caso em que `EXISTING_TEAM` aponta para um time do qual o comprador nao e membro. Sem esse caminho, nenhum codigo cria time ou membresia para o comprador e uma compra nao atualiza `Team.planId` (confirmado em `fireskills/specialists/fireskill-specialist-billing/references/nuxfire-billing.md:39` e em `.fireskills/PROJECT.md` "Boundaries and Non-Goals").

## Affected or Benefited Person

Comprador (paga um plano e recebe o time e o acesso, mesmo sem ter conta no momento do pagamento); plataforma (fecha o ciclo de receita: pagamento vira acesso real, sem provisionamento manual).

## Expected Result or Value

Um visitante sem conta consegue pagar um plano cujo destino (`Plan.buyerTeamMode`) e `NEW_TEAM` ou `EXISTING_TEAM`, e o pagamento efetivamente provisiona o acesso depois que ele cria conta ou faz login com o mesmo e-mail do pagamento:

- `NEW_TEAM`: um time novo e criado, o comprador vira Owner, `Team.planId` aponta para o plano comprado.
- `EXISTING_TEAM`: o comprador e adicionado como Member ao `buyerTeamId`, e `Team.planId` desse time e atualizado — desde que o time exista e nao esteja suspenso no momento em que o comprador reivindica o acesso; caso contrario o provisionamento e recusado, fica visivel para investigacao, e nada e criado pela metade.

## Context

Decisoes tomadas com o usuario nesta rodada:

- **Correcao de escopo relevante**: a captura original desta peca (`specs/inbox/2026-09-25-232621-...md`) ligava este checkout a "Phase 7" do SPEC-0003. Isso estava errado: lendo `specs/draft/0003-landing-refactor-one-offer/spec.md`, a Phase 7 daquele spec e sobre vender **licencas do proprio Nuxfire** (o kit-base, pagamento unico, "license delivery" real, lendo `landing.offer`) — nao tem relacao com `Plan`/`Team`/`Subscription`. Este item (BACKLOG-0007) e sobre o billing generico de times do starter kit (`layers/billing`), e e independente do SPEC-0003.
- Cobre os dois provedores ja existentes: Stripe e Paddle.
- Papel do comprador ao entrar em `EXISTING_TEAM`: Member.
- Recompra/upgrade de um time que ja tem plano pago ativo: fora de escopo (item futuro); este item cobre apenas a primeira ativacao de um destino sem plano pago.
- "License delivery" nao se aplica aqui (pertence ao outro checkout, SPEC-0003); mantem-se apenas o redirecionamento pos-checkout (thank-you page).
- **Ordem conta/pagamento**: o comprador paga antes de ter conta (checkout anonimo, apenas e-mail). Depois do pagamento, ele cria conta ou faz login (OpenAuth) com o mesmo e-mail para reivindicar o time. Esse e um padrao novo na base — o unico precedente parecido, o convite de time (`layers/teams/server/trpc/invites.ts`), exige sessao ja ativa em `acceptInvite` (`protectedProcedure`) e nunca cria usuario a partir do convite; aqui o comprador tambem nao existe como `User` no momento do pagamento.

## Related References

- `fireskills/specialists/fireskill-specialist-billing/references/nuxfire-billing.md` (relacionado: mapeia webhooks, checkout, catalogo e o gap na linha 39).
- `.fireskills/PROJECT.md` "Boundaries and Non-Goals" (relacionado: confirma a ausencia deste provisionamento).
- `specs/inbox/2026-09-25-200250-plan-setting-what-happens-to-the-buyer-s-team.md` (origem: captura que levou a implementar `Plan.buyerTeamMode`/`buyerTeamId`, ja commitado em `b48e2ba`).
- `specs/inbox/2026-09-25-232621-checkout-criar-time-entrada-do-comprador-e-plano-pago-apos-o-pagamento.md` (origem desta captura; a ligacao com SPEC-0003 Phase 7 registrada la esta desatualizada, ver Contexto acima).
- `specs/draft/0003-landing-refactor-one-offer/spec.md` (relacionado, nao dependente: confirma que a Phase 7 daquele spec e um checkout diferente, de venda de licenca do kit).
- `layers/billing/server/trpc/stripe.ts`, `layers/billing/server/api/webhooks/{stripe,paddle}.post.ts`, `layers/billing/server/utils/stripe/subscription-sync.ts`, `layers/billing/server/utils/billing/{event-ledger,subscription-repository}.ts` (relacionado: checkout/webhook existentes, para um comprador ja com time).
- `layers/teams/server/trpc/invites.ts` (relacionado: padrao existente mais proximo de "conceder acesso a alguem por e-mail", mas pressupoe sessao ja ativa — nao resolve o caso "paga sem conta" sem adaptacao).

## Expected Behavior

1. O comprador inicia um checkout (Stripe ou Paddle) para um `Plan` sem estar autenticado e sem informar `teamId` (fluxo novo, distinto do `createStripeCheckoutSession` atual que exige time). O checkout coleta pelo menos o e-mail do comprador.
2. O pagamento e confirmado pelo webhook do provedor (reaproveitando ledger de idempotencia e sincronizacao de assinatura ja existentes).
3. O sistema registra a compra como pendente de reivindicacao, associada ao e-mail do comprador e ao `Plan` comprado (mecanismo exato de armazenamento e como o webhook identifica o plano/destino: a decidir na especificacao — ver `$fireskill-data-discovery`).
4. O comprador cria conta ou faz login (OpenAuth) usando o mesmo e-mail do pagamento.
5. Ao autenticar com esse e-mail (ou por uma acao explicita de "reivindicar", padrao a decidir na spec, espelhando ou nao o fluxo de aceitar convite), o sistema finaliza o provisionamento:
   - `NEW_TEAM`: cria o time, define o comprador como Owner, ativa `Team.planId`.
   - `EXISTING_TEAM`: valida que `buyerTeamId` ainda existe e nao esta suspenso; se valido, adiciona o comprador como Member e ativa `Team.planId`; se invalido, recusa e sinaliza para investigacao (nenhum time e criado como alternativa).
6. Reentregas do mesmo evento de webhook (retry do Stripe/Paddle) nao duplicam nem o registro pendente nem o provisionamento (idempotencia).

## Business Rules

- O papel do comprador em `EXISTING_TEAM` e sempre Member.
- `EXISTING_TEAM` com time inexistente ou suspenso no momento da reivindicacao: provisionamento recusado, sem criar destino alternativo.
- Um time de destino (`NEW_TEAM` ou `EXISTING_TEAM` valido) so recebe `Team.planId` atualizado se ainda nao tiver uma assinatura/plano pago ativo (recompra de time ja pagante e fora de escopo desta peca).
- O comprador so e provisionado ao autenticar com o mesmo e-mail usado no pagamento.

## Acceptance Criteria

- Given um `Plan` com `buyerTeamMode = NEW_TEAM`, When um comprador sem conta paga esse plano e depois cria conta com o e-mail do pagamento, Then um time novo existe com o comprador como Owner e `Team.planId` aponta para o plano pago.
- Given um `Plan` com `buyerTeamMode = EXISTING_TEAM` apontando para um time ativo, When um comprador sem conta paga esse plano e depois faz login/cria conta com o e-mail do pagamento, Then o comprador e Member desse time e `Team.planId` foi atualizado para o plano pago.
- Given um `Plan` com `buyerTeamMode = EXISTING_TEAM` cujo time foi removido ou suspenso antes da reivindicacao, When o comprador tenta reivindicar o acesso, Then nada e criado (nem time novo nem membresia) e a falha fica registrada/visivel para investigacao.
- Given um evento de webhook de pagamento entregue mais de uma vez (retry do provedor), When o sistema processa a segunda entrega, Then o provisionamento nao e duplicado (nao ha dois times, nem duas membresias, nem dupla ativacao de plano).
- Given um time que ja tem uma assinatura/plano pago ativo, When um novo evento de pagamento chega para esse mesmo destino, Then este item nao altera o plano do time (fora de escopo; comportamento fica para item futuro).

## Qualities and Operation

- Security: o e-mail do checkout e a unica chave de vinculo entre pagamento e conta — a reivindicacao deve ser resistente a um e-mail alheio tentar reivindicar a compra de outra pessoa (a decidir: link assinado/expiravel enviado ao e-mail do pagamento, no padrao dos convites de time, versus apenas casar por e-mail no login, que e mais fraco). A decidir na especificacao.
- Privacy: nenhum dado novo alem do que o checkout ja coleta (e-mail, dados de pagamento no provedor); nao introduzir armazenamento de dados de cartao (permanece no Stripe/Paddle).
- Performance and volume: sem requisito novo; volume esperado e o mesmo do checkout ja existente.
- Audit and observability: uma recusa de `EXISTING_TEAM` invalido precisa ficar visivel (log estruturado e/ou fila de erros ja usada pelo admin, `layers/admin` DLQ) para investigacao manual, conforme mencionado no resultado esperado.

## Dependencies

- Depende de `Plan.buyerTeamMode`/`buyerTeamId` (ja implementado e commitado em `b48e2ba`).
- Depende da infraestrutura de checkout/webhook/idempotencia ja existente em `layers/billing`.
- Depende do OpenAuth existente (`apps/functions/src/auth.ts`, `apps/login`) para a etapa de criar conta/login pos-pagamento.
- Nenhuma dependencia em SPEC-0003 (relacao removida — ver Contexto).

## Error Situations

- Pagamento aprovado para `EXISTING_TEAM` cujo time foi removido/suspenso antes da reivindicacao: recusar, nao criar destino alternativo, deixar visivel para investigacao (ja coberto nas regras e criterios acima).
- Comprador nunca cria conta/reivindica o pagamento: a decidir na especificacao (prazo de expiracao da reivindicacao, se ha reenvio de lembrete, o que mostrar se o link expirar).
- Comprador reivindica com um e-mail diferente do e-mail do pagamento: a decidir (rejeitar por padrao, ja que o vinculo e por e-mail).
- Retry do webhook do provedor: idempotencia ja coberta pelo ledger existente (`event-ledger.ts`); este item so precisa garantir que o registro pendente e o provisionamento tambem sejam idempotentes, nao so a sincronizacao de assinatura.

## Scope

- In scope: novo caminho de checkout (Stripe e Paddle) para comprador sem time; registro do pagamento como pendente de reivindicacao; criacao de time (NEW_TEAM) ou membresia (EXISTING_TEAM) e ativacao de `Team.planId` ao reivindicar; recusa segura quando `EXISTING_TEAM` e invalido; idempotencia do provisionamento.
- Out of scope: recompra/upgrade/downgrade de um time que ja tem plano pago ativo; qualquer coisa do checkout de venda de licenca do Nuxfire (SPEC-0003 Phase 7); mudar o papel do comprador em `EXISTING_TEAM`, hoje fixo em Member; portal de cliente, cupons, notas fiscais (ja fora do que `layers/billing` cobre hoje).

## Questions, Decisions, and Risks

- **Decidido**: provedores = Stripe e Paddle; papel em EXISTING_TEAM = Member; recompra de time ja pagante = fora de escopo; license delivery = nao se aplica a este item; ordem conta/pagamento = paga primeiro, sem conta.
- **Risco registrado, a resolver na especificacao**: como o vinculo pagamento→conta e protegido (link assinado por e-mail vs. so casar por e-mail no login) — afeta seguranca (ver Qualities and Operation).
- **Risco registrado, a resolver na especificacao**: forma de armazenamento da "compra pendente de reivindicacao" (tabela nova, reaproveito de `teamInvites`, ou outra estrutura) — encaminhar para `$fireskill-data-discovery` a partir da especificacao, como o proprio fluxo do framework pede quando a jornada envolve dado novo persistido.
- **Aberto**: prazo de expiracao e comportamento de lembrete para uma compra paga e nunca reivindicada.

## Ready for Development

- [x] The problem and benefited person are clear.
- [x] The initial trigger and expected result are clear.
- [x] Permissions, rules, and relevant exceptions are clear.
- [x] The result can be objectively verified.
- [ ] Security, privacy, and performance were evaluated according to risk. (vinculo pagamento→conta ainda em aberto, ver Questions/Risks)
- [x] Out of scope, dependencies, and pending decisions are recorded.

## Next Step

Item suficientemente maduro para abrir com `$fireskill-03-specify`, que deve resolver o vinculo pagamento→conta e o formato de dado da compra pendente (incluindo, se necessario, uma passagem por `$fireskill-data-discovery`) durante a analise MCR-10.

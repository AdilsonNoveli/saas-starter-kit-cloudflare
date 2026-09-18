# Diretrizes publicáveis do framework

- Derivado do bloco `specsfy:framework` do monorepo `promovaweb/specsfy`.
- Adaptação: bloco **encurtado** para o Nuxfire (o original tinha ~40 linhas); o
  contrato completo continua em `{{SPECSFY_SPEC_PATH}}`, lido só quando uma skill de
  fluxo é executada.

<!-- specsfy:framework:start -->
## Framework Fireskills

Fluxo, caminhos e gates: `{{SPECSFY_SPEC_PATH}}` (leia ao executar uma skill de fluxo).
Contexto do projeto: `.fireskills/` (`PROJECT`, `STACK`, `RULES`, `DATABASE`, `PACKAGES`,
`INTERFACE`, `DESIGNSYSTEM`, `USER-PROFILE`).

- Antes de uma skill de fluxo, execute `$fireskill-setup`; rode o monitor de
  contexto no início, após cada tarefa e antes de concluir, e resolva todo `PENDING`.
- Não repita pergunta já respondida em `.fireskills/USER-PROFILE.md`.
- Specs: `specs/inbox/`, `specs/backlog/` e `specs/<estado>/<NNNN>-<slug>/spec.md`,
  a única fonte normativa (sem `plan.md`, `tasks.md` ou `research.md`).
- Tarefa que muda o banco inclui `[MIGRATION]`: migração versionada (drizzle-kit),
  aplicada no deploy, nunca no banco de desenvolvimento.
- Depois de cada implementação, execute `$fireskill-documentator`.
<!-- specsfy:framework:end -->

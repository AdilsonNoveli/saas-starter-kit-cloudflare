# Nuxfire — instruções para agentes

O desenvolvimento deste repositório é feito com o **Fireskills** (`fireskills/`):
um fluxo orientado a especificações e 33 especialistas técnicos que já conhecem o
código. Não trabalhe de memória: trabalhe por ele.

## Comece sempre aqui

1. Leia `fireskills/SKILL.md`. Ele diz qual skill de fluxo e qual especialista
   carregar para o pedido.
2. Leia `.specsfy/RULES.md` (regras do projeto) e, para o assunto em questão,
   `.specsfy/PROJECT.md`, `STACK.md`, `DATABASE.md`, `INTERFACE.md` ou
   `DESIGNSYSTEM.MD`.
3. Carregue o especialista da área **antes** de ler ou escrever código
   (`fireskills/specialists/`; a tabela de áreas está em `fireskills/SKILL.md`).

## Regras de trabalho

- Muda comportamento (feature, regra, dados, tela): siga o fluxo em
  `fireskills/skills/`. Ajuste trivial: pode ir direto, mas com RULES lidas e o
  especialista da área carregado.
- O código vence qualquer documento. Toda afirmação sobre o projeto precisa de um
  arquivo como evidência.
- Nada de deploy, exclusão de dados ou ação irreversível sem autorização explícita.
- Não declare "pronto" sem rodar a validação: `bun run test`, typecheck
  (`apps/app`, e `vue-tsc -p server/tsconfig.json`) e o que o especialista indicar.

<!-- specsfy:framework:start -->
## Framework Fireskills

Fluxo, caminhos e gates: `fireskills/skills/Spec.md` (leia ao executar uma skill de fluxo).
Contexto do projeto: `.specsfy/` (`PROJECT`, `STACK`, `RULES`, `DATABASE`, `PACKAGES`,
`INTERFACE`, `DESIGNSYSTEM`, `USER-PROFILE`).

- Antes de uma skill de fluxo, execute `$fireskill-setup`; rode o monitor de
  contexto no início, após cada tarefa e antes de concluir, e resolva todo `PENDING`.
- Não repita pergunta já respondida em `.specsfy/USER-PROFILE.md`.
- Specs: `specs/inbox/`, `specs/backlog/` e `specs/<estado>/<NNNN>-<slug>/spec.md`,
  a única fonte normativa (sem `plan.md`, `tasks.md` ou `research.md`).
- Tarefa que muda o banco inclui `[MIGRATION]`: migração versionada (drizzle-kit),
  aplicada no deploy, nunca no banco de desenvolvimento.
- Depois de cada implementação, execute `$fireskill-documentator`.
<!-- specsfy:framework:end -->

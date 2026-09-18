# Migração de `_docs/docs` para o Fireskills

Data: 2026-09-18. Critério: **só migra o que o código confirma**; o resto fica
registrado aqui como desatualizado ou não verificado. Os originais continuam
intactos em `_docs/docs/`.

## Resultado por documento

| Documento | Veredito | Destino |
|---|---|---|
| `AGENTS.md` (58 KB) | **Majoritariamente verdadeiro.** Conferido seção a seção enquanto se escreviam os 10 especialistas. Erros achados: lista 17 tabelas (são **20**; faltam as 3 do Kanban) e chama `BenefitOnPlan` a tabela real `BenefitsOnPlan`; cita `_docs/REFATORE_ARCHITETURE.md`, que foi removido | Especialistas (`references/nuxfire-*.md`), `.specsfy/STACK.md`, `.specsfy/RULES.md`, `.specsfy/DATABASE.md` |
| `CURRENT_STATE.md` | **Desatualizado em pontos concretos:** usa `packages/app`, `packages/functions`, `packages/auth-frontend`, `@nuxfire/design-tokens` (hoje `apps/app`, `apps/functions`, `apps/login`, `@nuxfire/tokens`); diz "4 suítes / 14 testes" (são **7 arquivos / 131 testes**); diz que a busca cobre só a documentação (o blog também usa `<Search collection="blog">`); "i18n com uma string" vale só para `apps/app` (`apps/web` já tem ~28 KB de strings). Estado dos módulos e lista "não existe" conferidos | `PROJECT.md` (capacidades e limites reescritos com os caminhos reais) |
| `BACKLOG.md` | 29 itens conferidos: **CNT-01 já está feito**; **CNT-02 está defasado** (web já extraído); BIL-04 e BIL-05 **não deu para provar** aberto/fechado; os demais continuam abertos | `specs/inbox/2026-09-18-…-backlog-legado-…md` (só os abertos, com evidência) |
| `CLEANUP_DEBT_PLAN.md` | Histórico: itens 1 e 2 feitos (`scripts/generate-paths.ts` existe; os dois endpoints de IA foram removidos), item 3 decidido (manter `team-dashboard` em `apps/app`) | Só citado no inbox como resolvido |
| `DESIGN_SYSTEM.md` | **Verdadeiro nos valores** (paletas, `--ui-radius`, tokens do modo escuro, overrides de `UCard`/`UAvatar`/`UTabs`/`UTable`); **desatualizado** nos nomes (`packages/design-tokens`, `packages/app`, `auth-frontend`) e na afirmação de que `apps/web`/`apps/login` têm escala `night` quente própria (o `night` é definido uma vez em `packages/tokens/theme.css`; `apps/web` só importa) | `DESIGNSYSTEM.MD` (bloco "Tokens e componentes") |
| `ESTRUTURA_ATUAL.md` | Datado de 2026-09-16, já pós-migração. **Não foi conferido linha a linha**; as partes cruzadas (diretórios de topo, `infra/*`, `apps/app`, layers) batem. Não migrado como está: o mapa fica coberto por `PROJECT.md`, `STACK.md`, `INTERFACE.md` e pelos especialistas | — (permanece como referência) |
| `RULES.md` | Regras do time, mantidas. Uma ressalva: "Imagens via S3" — não há S3 da AWS no projeto; as imagens usam **R2** (`hubBlob()`, API compatível com S3). Registrado como R2 | `.specsfy/RULES.md` |
| `Architecture diagram.svg` | Não avaliado (SVG de 353 KB, não verificável por texto) | — |

## O que foi gerado a partir do próprio código (não de documento)

- `.specsfy/DATABASE.md`: tabelas e colunas extraídas de `0000_init.sql` pelo
  `fireskill-aux-database` (20 tabelas).
- `.specsfy/STACK.md`: inventário detectado por `fireskill-aux-stack`.
- `.specsfy/PACKAGES.md` e `docs/`: `fireskill-documentator` (heurístico; ver
  ressalvas no `PLANO-REFATORACAO.md`).
- `INTERFACE.md`: 34 componentes e 24 telas listados a partir dos `.vue` reais.
  A coluna "Finalidade" só tem texto onde o arquivo traz um comentário de
  cabeçalho; nos demais fica "A mapear".

## Documentos que sumiram de `_docs`

`REFATORE_ARCHITETURE.md`, `ROADMAP.md` e `MAILER_FORK_PLAN.md` estavam em `_docs/`
e não estão mais em lugar nenhum do disco (nem em `_docs/docs/`). Continuam no
histórico do git:

```bash
git show HEAD:_docs/REFATORE_ARCHITETURE.md
```

Comentários de código e a memória do projeto ainda os citam. Nada foi restaurado.

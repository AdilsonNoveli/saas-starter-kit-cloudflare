---
name: fireskill-04-validate
description: "Use quando o usuário pede para validar, revisar, auditar ou checar se `specs/{id}-{slug}/spec.md` segue o formato rígido Specsfy/2.0 e está pronto para planejar. Use também quando uma transição automática pedir prova do Definition Gate ou nova validação após correção. Use antes do Ato II. Registre gates na seção 13 do mesmo arquivo; não crie checklist, relatório, plan.md ou outro artefato."
---

# Validar a especificação

## Preparação obrigatória

Antes de executar esta skill, carregue obrigatoriamente `$fireskill-setup` na
raiz do projeto. Em handoff automático, carregue-o de novo antes desta etapa.
Reutilize a raiz confirmada na conversa e não prossiga se o setup apontar uma
pendência.

## Modo de interação

Modo de interação: `perguntas`.
Antes de formular qualquer pergunta, leia e aplique o
`Contrato de perguntas numeradas` de `fireskills/skills/Spec.md`.

Trate `spec.md` como a única fonte da verdade e como código em linguagem natural: verifique primeiro o formato rígido, depois clareza, completude, consistência e testabilidade semanticamente.

## Orquestrar a conversa

Ao concluir esta etapa ou detectar trabalho de outra etapa, anuncie
`Pendência detectada: <descrição> — ação: resolvendo nesta etapa` e resolva-a
quando pertencer ao próprio escopo. Quando houver troca de responsabilidade,
anuncie `Transição automática: $fireskill-04-validate → $<destino> — motivo:
<motivo> — resultado esperado: <resultado>` e carregue imediatamente a skill de
destino, sem pedir confirmação nem repetir o comando. Continue na mesma
conversa. Depois de uma correção necessária a esta etapa, anuncie `Retomada
automática: $<destino> → $fireskill-04-validate — pendência resolvida:
<resultado>` e retome-a imediatamente. Reavalie o estado após cada handoff para
evitar ciclos. Não peça confirmação para o handoff; ações sensíveis continuam
exigindo autorização específica.

## Executar a validação

1. Resolva `specs/<estado>/<NNNN>-<slug>/spec.md` pelo caminho informado; se houver várias specs e nenhum slug, pergunte qual validar.
2. Confirme `Formato: Specsfy/2.0`, os três atos na ordem, slug igual ao diretório e pacote restrito a `spec.md` e ao diretório opcional `research/`.
3. Para toda API ou documentação externa consultada, confirme uma evidência local em `research/` e seu índice em `Artefatos de pesquisa armazenados`; esse material é informativo, nunca uma segunda fonte normativa.
4. Enquanto `Status` ou `Definition Gate` ainda estiverem pendentes, execute:

```bash
node fireskills/skills/fireskill-04-validate/scripts/validate_spec.mjs specs/<estado>/<NNNN>-<slug>/spec.md --allow-draft
```

1. Leia `references/quality-gates.md` e faça a revisão semântica.
2. Confira o campo `Interface para pessoas`. Se for `Sim`, exija na seção 10
   stack e convenções observadas, telas e responsabilidades, fluxo de
   informação e navegação, menus e navegação principal, formulários e ações,
   composição e disposição, estados e acessibilidade. Confira se a tecnologia
   proposta segue as fontes
   da stack ou se a lacuna foi registrada para a pessoa. Um CRUD sem telas e
   formulário é `BLOCKER`; retorne automaticamente ao
   `$fireskill-02-backlog` para esclarecer a lacuna.
3. Compare research, requisitos, BDD, plano técnico, modelo de dados, contratos,
   TDD, matriz e tarefas. Confirme no mínimo três `AC` distintos para a feature
   inteira e para cada `US`, `FR` e `NFR`; não confunda “arquivo bem formatado”
   com “especificação correta”.
4. Quando produto, arquitetura ou segurança forem materiais, leia
   `references/review-lenses.md`, registre findings na seção 13 e execute
   `scripts/review_findings.mjs`. `P1 Open` mantém o gate pendente.
5. Se a definição alterar stack ou persistência, exija que a Definition of Done
   cite respectivamente `.fireskills/STACK.md` ou `.fireskills/DATABASE.md`. Para
   mudança material de finalidade ou capacidade, exija revisão de `.fireskills/PROJECT.md`;
   para regra nova confirmada, exija `.fireskills/RULES.md`.
6. No aceite final, procure tarefas `[MIGRATION]` e execute
   `verify_evidence.mjs --delivery` para cada uma. Mantenha o Delivery Gate
   pendente quando a tarefa estiver aberta ou quando o arquivo, o comando de
   aplicação ou a consulta de estado estiver ausente.

## Classificar achados

- `BLOCKER`: impede tarefa ou teste correto; requisito contraditório, sem comportamento observável, decisão de alto impacto ausente ou cenário principal não coberto.
- `WARNING`: aumenta retrabalho ou risco, mas admite implementação segura.
- `NOTE`: melhoria editorial sem efeito material.

Para cada achado, cite seção ou ID, explique o impacto e proponha uma correção concreta.

## Gate

Retorne exatamente um resultado:

- `READY`: nenhuma falha de formato e nenhum `BLOCKER` sem resolução.
- `NOT READY`: qualquer falha estrutural ou `BLOCKER`.

Inclua contagens, cobertura mínima `US/FR/NFR ↔ 3 ACs` e os três achados mais
importantes e a transição automática:

- `READY` → `$fireskill-05-tasks` para planejar a seção 14;
- `NOT READY` → retorno a `$fireskill-02-backlog` quando faltar decisão; a
  o refinamento do backlog executa seu ciclo completo e esta validação só é retomada depois
  de fechar as lacunas ou registrar a saída explícita `avançar`; após essa
  saída, registre `NOT READY` e não reabra o mesmo ciclo nesta retomada;
  quando a correção já estiver decidida, use `$fireskill-update-spec` para
  uma spec anteriormente aprovada e `$fireskill-03-specify` para a definição
  inicial.

Anuncie o motivo e carregue imediatamente a skill escolhida.

## Registrar no arquivo único

Sem alterar requisitos automaticamente:

1. atualize `Gate do Ato I — Definição` na seção 13 com resultado, data e achados;
2. em `READY`, defina `Definition Gate: Passed` e `Status: Defined`;
3. em `NOT READY`, defina `Definition Gate: Failed`, `Plan Gate: Pending`,
   `Delivery Gate: Pending` e mantenha `Status: Draft`;
4. execute novamente `validate_spec.mjs specs/<estado>/<NNNN>-<slug>/spec.md` sem `--allow-draft` quando o gate passar;
5. relate o resultado no chat.

Quando o Definition Gate passar, execute `bun run fireskill transition <id> defined`.
Em `review`, use a mesma análise para o aceite final. Com Delivery Gate passado,
Status `Complete` e a DoD comprovada, execute `bun run fireskill transition <id> completed`.
Antes disso, chame `$fireskill-interviewer` quando uma resposta puder mudar a
entrega ou o Effort.

Se o usuário pedir correções, edite as seções de origem, preserve IDs e revalide. Nunca crie outro arquivo de especificação ou validação.

## Enforcement do repositório

Use o mesmo runner localmente e no CI:

```bash
node fireskills/skills/fireskill-04-validate/scripts/verify_repo.mjs . \
  --boundary local --timeout-seconds 300 --max-output-bytes 65536
```

As fronteiras `local`, `git` e `ci` não mudam a política. `--attestation PATH`
é a única forma de persistir uma atestação; `--self-test` executa canários em
diretório temporário e nunca produz binding probatório. A atestação schema 2
liga commit, digest executável, checks aprovados, tarefas e hashes de arquivos.
O digest cobre comandos, limites e os arquivos da política. Não aceite um gate
que passa em apenas uma fronteira, excede limites ou trunca diagnóstico sem
marcar `truncated`.

O contrato do catálogo exige as quatorze skills base, `fireskill-setup`,
`fireskill-documentator` e
as três `fireskill-aux-*`; também valida cada `fireskill-specialist-*` instalada,
sem impor um total máximo de especialistas.
O Gherkin BDD é referência exclusiva da `spec.md`: o enforcement nunca executa
`.feature`. Ele executa os testes derivados com o Vitest já configurado no
projeto (`bun run test`; para um arquivo, `bunx vitest run <arquivo>`).

## Especialistas sob demanda

Leia [references/specialists.md](references/specialists.md) quando um gate
depender de revisão técnica específica. Instalação é recomendação explícita,
nunca efeito colateral da validação.

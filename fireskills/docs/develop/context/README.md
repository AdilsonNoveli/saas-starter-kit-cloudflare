# Contexto do projeto

<!-- markdownlint-disable MD033 -->
<p align="center">
  <picture>
    <source srcset="../../../brand/logo/icon.svg" type="image/svg+xml">
    <img src="../../../brand/logo/icon.png" alt="Logo do Specsfy" width="128">
  </picture>
</p>
<!-- markdownlint-enable MD033 -->

## Classificação

| Campo | Valor |
| --- | --- |
| Natureza | índice |
| Escopo | contexto transversal do repositório |
| Autoridade | roteamento e precedência entre fontes |

## Papel

Este arquivo roteia pessoas e agentes para a menor unidade de contexto necessária
à mudança. Ele também declara a precedência entre instruções, requisitos,
decisões transversais e evidências executáveis.

## Como usar

Identifique o tipo de alteração na tabela e leia somente os documentos indicados,
além da `spec.md` da fatia. Siga links adicionais apenas quando o contexto
selecionado indicar uma dependência real.

## Atualize quando

- um contexto for criado, movido, dividido ou removido.
- os gatilhos de leitura ou atualização mudarem.
- a precedência entre fontes precisar ser esclarecida.

## Não use para

- resumir todos os documentos desta árvore.
- registrar comportamento de uma feature.
- manter histórico de decisões arquiteturais.

## Fonte da verdade e precedência

O [`AGENTS.md` do workspace](../../../AGENTS.md) governa como o trabalho
integrado é executado. `specs/<estado>/<NNNN>-<slug>/spec.md` governa o
comportamento da fatia. Estes contextos governam decisões transversais dentro
do escopo declarado. Código, testes, manifests, configurações, schemas e
migrations são fontes executáveis do estado implementado.
[ADRs](../decisions/README.md) explicam o histórico, mas não substituem o
contexto vigente.

Quando as fontes divergirem, não escolha silenciosamente: preserve o estado
observado, identifique qual escopo está em conflito e reabra a decisão normativa
apropriada.

## Roteamento por tipo de alteração

| Alteração ou dúvida | Leia quando | Atualize quando |
| --- | --- | --- |
| Finalidade, capacidades ou limites do produto | [project.md](project.md) | a definição transversal do produto mudar |
| Termo do domínio ou nomenclatura ambígua | [glossary.md](glossary.md) | um termo canônico for criado ou redefinido |
| Arquitetura, módulos, dependências ou integrações | [architecture/README.md](architecture/README.md) | a organização do contexto arquitetural mudar |
| Topologia, público ou destino da documentação oficial | [documentation.md](documentation.md) | a separação entre `docs/user/` e `docs/develop/` mudar |
| Documentação técnica gerada no consumidor | [documentação técnica do sistema](../../user/system-documentation.md) | a topologia ou o ciclo de reconstrução mudar |
| Stack, pacotes, convenções ou testes | [engineering/README.md](engineering/README.md) | a organização do contexto de engenharia mudar |
| Persistência, migrations ou privacidade | [data/README.md](data/README.md) | a organização do contexto de dados mudar |
| Fluxo que atravessa módulos | [flows/README.md](flows/README.md) | um mapa transversal for criado ou sua rota mudar, inclusive publicação do CLI |
| Design system e padrões de interface | [design/README.md](design/README.md) | a fonte macro, os cenários CRUD ou a relação com `INTERFACE.md` mudar |

## Precedência das fontes

| Escopo | Fonte autorizada |
| --- | --- |
| Processo de trabalho | `AGENTS.md` da raiz ou do módulo |
| Comportamento da fatia | `specs/<estado>/<NNNN>-<slug>/spec.md` |
| Decisão transversal vigente | Documento específico desta árvore |
| Estado implementado | fontes executáveis e testes |
| Motivação e alternativas históricas | ADR em `docs/develop/decisions/` |
| Evidência de conclusão | testes, validadores e gates da spec |

# Módulos do monorepo Specsfy

## Classificação

| Campo | Valor |
| --- | --- |
| Natureza | descritivo |
| Escopo | responsabilidades e percursos públicos do projeto |
| Autoridade | fronteiras de módulo declaradas pelo monorepo |

## Papel

Ajudar usuários e contribuidores a localizar a fonte correta dentro do único
repositório [`promovaweb/specsfy`](https://github.com/promovaweb/specsfy).

## Como usar

Escolha o módulo pela responsabilidade e leia suas instruções antes de alterar.

## Mapa

| Módulo | Público principal | Responsabilidade |
| --- | --- | --- |
| [`specsfy/`](../../specsfy/) | novos usuários | tutorial completo e primeiro uso |
| [`docs/user/`](../user/) | usuários finais | guias simples e exemplos de uso |
| [`docs/develop/`](./) | agentes e mantenedores | metodologia, contribuição e contexto transversal |
| [`skills/`](../../skills/) | agentes e contribuidores | metodologia executável |
| [`specialists/`](../../specialists/) | equipes técnicas | catálogo opcional |
| [`cli/`](../../cli/) | usuários do terminal | instalação, TUI, progresso e atualização |
| [`example/`](../../example/) | mantenedores | validação do framework em aplicação real |
| [`brand/`](../../brand/) | comunicação e design | identidade e ativos oficiais |
| [`tests/`](../../tests/) | mantenedores | contratos integrados |

## Fronteiras

Os módulos possuem ownership de conteúdo, mas compartilham raiz Git, remoto,
branch, histórico, issues, tags e releases. Links entre eles são relativos e
uma mudança transversal forma um único commit ou pull request coerente.

Specs de produto vivem em `specs/<estado>/<NNNN>-<slug>/spec.md` dentro de cada
projeto consumidor, nunca neste monorepo.

## Atualize quando

- um módulo, público ou ownership mudar.

## Não use para

- inventariar arquivos.
- criar fronteiras Git internas.

## Fonte da verdade e precedência

[`AGENTS.md`](../../AGENTS.md) governa integração e contribuição.
[`context/architecture/modules.md`](context/architecture/modules.md) governa as
responsabilidades vigentes.

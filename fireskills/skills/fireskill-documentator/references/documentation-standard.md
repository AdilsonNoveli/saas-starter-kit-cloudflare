# Padrão da documentação técnica

- Fonte: objetivo de documentação do framework Specsfy.
- Observado em: 2026-07-27.
- Adaptação: topologia determinística para projetos Node (Nuxt/Bun), sem
  substituir fontes executáveis ou conteúdo humano.

## Topologia

| Arquivo | Responsabilidade |
| --- | --- |
| `docs/README.md` | portal, escopo e ordem de leitura |
| `docs/architecture.md` | limites, componentes, dependências e UML |
| `docs/application.md` | módulos e implementações existentes |
| `docs/database.md` | fontes, entidades, campos, relações e ER |
| `docs/flows.md` | rotas, jornadas e sequências |
| `docs/testing.md` | runners, comandos, inventário e resumo |
| `docs/frontend.md` | páginas, componentes Vue, `@nuxt/ui` e Tailwind |
| `docs/packages.md` | runtime, frameworks e dependências |
| `docs/integrations.md` | serviços externos e configuração segura |
| `docs/decisions.md` | decisões explícitas e proveniência |
| `.fireskills/PACKAGES.md` | inventário npm/Bun com versão, finalidade e fonte |

## Regras

- Usar caminhos relativos ao projeto como evidência.
- Usar Mermaid válido dentro de blocos `mermaid`.
- Distinguir observado, inferido e não identificado.
- Preservar texto fora dos marcadores gerados.
- Não publicar valores de ambiente, credenciais ou conteúdo de produção.
- Inventariar dependências diretas e transitivas observadas em todos os
  `package.json` e `bun.lock` do projeto, exceto árvores geradas como
  `node_modules/`, `.nuxt/`, `.output/` e `dist/`.
- Usar descrições locais; quando ausentes, registrar a lacuna sem inventar a
  finalidade.
- Gerar a mesma saída para a mesma entrada.

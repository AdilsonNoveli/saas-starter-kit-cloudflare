---
name: fireskill-specialist-nuxt-ui
description: Construir e revisar interface Vue com @nuxt/ui v4 (Reka UI + Tailwind + Tailwind Variants) no Nuxfire — componentes U*, formulários UForm, tabelas UTable com enterpriseTableUi, layouts de dashboard, ícones Lucide e tema via packages/tokens e app.config.ts. Use antes de escrever ou alterar qualquer `.vue` que use componente U*; não cobre escolha de paleta/marca (design-system), fluxo de UX nem Tailwind puro fora do Nuxt UI.
---

# Nuxt UI (@nuxt/ui v4)

## Quando usar

- Acionar antes de criar ou alterar `.vue` que use `UButton`, `UModal`, `UForm`,
  `UTable`, `UDashboard*`, `UNavigationMenu` ou qualquer outro `U*`.
- Acionar para customizar tema: cores semânticas, radius, variantes, slots,
  `app.config.ts` ou `packages/tokens`.
- Acionar para decidir o componente certo (Modal vs Slideover, Select vs
  SelectMenu, Toast vs Alert) e para montar formulário, tabela, overlay ou
  navegação.
- Não acionar para decidir identidade visual e escala de tokens — usar
  `$fireskill-specialist-design-system`; nem para composição/fluxo de tela —
  `$fireskill-specialist-ui-design` e `$fireskill-specialist-ux-design`; nem
  para classes Tailwind fora de componentes — `$fireskill-specialist-tailwind-css`.
- Combinar com `$fireskill-specialist-nuxt` (páginas, layouts, composables),
  `$fireskill-specialist-trpc` (mutações que o formulário chama) e
  `$fireskill-specialist-web-accessibility`.

## Fluxo

1. Ler [references/nuxfire-real.md](references/nuxfire-real.md): ela diz onde o
   tema mora, quais padrões já existem e o que **não** está em uso no projeto.
2. Procurar no código uma tela ou componente equivalente (`layers/*/app/`,
   `apps/app/app/`) e seguir o padrão existente antes de inventar um.
3. Carregar só as referências da tarefa (tabela abaixo) **antes** de escrever
   código.
4. Escolher o componente pela matriz de `component-selection`; conferir
   props/slots/eventos no tema gerado (`apps/app/.nuxt/ui/<componente>.ts`) ou
   na documentação oficial em `https://ui.nuxt.com`.
5. Implementar com cores semânticas, ícones `i-lucide-*` e textos via i18n
   quando a tela for localizada.
6. Se precisar mudar o visual de um componente **em todo o produto**, alterar
   `packages/tokens` (não a página) e validar no DOM renderizado.
7. Rodar a validação abaixo antes de declarar concluído.

## Roteamento de referências

| Tarefa | Carregar |
|---|---|
| Qualquer tela nova | `nuxfire-real`, `guidelines/conventions`, `guidelines/component-selection` |
| Dashboard / área administrativa | `nuxfire-real`, `layouts/dashboard`, `recipes/navigation` |
| Formulário ou página de configurações | `guidelines/forms`, `guidelines/conventions` |
| Login, cadastro, recuperar senha | `recipes/auth`, `guidelines/forms` |
| Listagem com filtro/paginação/seleção | `recipes/data-tables`, `component-selection`, `nuxfire-real` (§3) |
| Modal, slideover, drawer, command palette | `recipes/overlays`, `component-selection` |
| Tema, cores, variantes, prop `ui` | `guidelines/design-system`, `nuxfire-real` (§2) |
| Landing, preços, changelog | `layouts/landing`, `guidelines/design-system` |
| Achar o nome de um componente | `references/components.md` |

Arquivos em `references/`: `nuxfire-real.md`, `components.md`,
`guidelines/{design-system,component-selection,conventions,forms}.md`,
`layouts/{dashboard,landing,docs,chat,editor}.md`,
`recipes/{data-tables,auth,overlays,navigation}.md`.

`layouts/chat.md`, `layouts/editor.md` e `layouts/docs.md` descrevem recursos do
Nuxt UI que dependem de pacotes que o Nuxfire **não** tem hoje (Vercel AI SDK,
TipTap, conteúdo em Markdown). Não os aplique sem decisão explícita de adicionar
a dependência.

## Regras principais

- `<UApp>` envolve a aplicação uma única vez (já está em `app.vue`); toast,
  tooltip e overlay dependem dele. Não aninhar outro `UApp`.
- Usar **somente cores semânticas**: `text-default`, `text-muted`,
  `text-dimmed`, `bg-elevated`, `bg-muted`, `border-default`, `border-muted`,
  `text-primary`. Nunca paleta bruta (`text-gray-500`, `bg-red-600`).
- Ordem de prioridade de estilo (maior vence): prop `ui`/`class` da instância →
  `app.config.ts` (`sharedUiConfig`) → tema padrão do componente.
- Tema global vive em `packages/tokens` (`sharedUiConfig` em `index.ts`,
  variáveis em `theme.css`). Não duplicar token no `main.css` de um app.
- Ao sobrescrever componente globalmente, mexer na **variante** ativa, não em
  `slots`: a classe de variante é aplicada depois e descarta a de slot.
- Tabela: `<UTable :data :columns :ui="enterpriseTableUi" />`, importando de
  `@nuxfire/tokens`; variação por espalhamento do objeto, sem copiar classes.
- Formulário: `UForm` com `:schema` (zod) e `:state` reativo, `UFormField` com
  `name` igual ao campo do schema, `useToast()` para retorno; a mutação vai por
  `useTrpcClient()`.
- Modal: `v-model:open`; conteúdo em `#content` com `UCard` quando precisar de
  header/footer. Confirmação destrutiva: `useNotification().confirm(...)`, nunca
  um `UModal` novo por página.
- Ícones no formato `i-{coleção}-{nome}`; coleção padrão `lucide`
  (`i-lucide-users`). SVG próprio entra por `nuxt-svgo` (prefixo `icon`,
  pasta `~/assets/icons`).
- Estado dos itens de menu/tabs/selects vai em array `items` — não em slot
  manual por item.
- Um componente que já existe em `references/components.md` não é reescrito à
  mão (botão, card, badge, dropdown…).

## Antipadrões

- Cor de paleta bruta ou hex em `.vue` — quebra tema claro/escuro e rebranding
  centralizado (`packages/tokens/theme.css`).
- Copiar as classes de `enterpriseTableUi` para dentro da página em vez de
  importar o objeto.
- Colocar override global de aparência em `slots.root` quando a variante ativa
  redefine a mesma propriedade: a classe some sem erro.
- Redeclarar `--ui-*`, `--color-*` ou fonte no `main.css` de um app que já
  importa `@nuxfire/tokens/theme.css`.
- Inverter a ordem `tailwindcss` → `@nuxt/ui` → `theme.css` no CSS de entrada.
- Esquecer `@source "./index.ts"` em `theme.css` ao adicionar classes só em
  `packages/tokens/index.ts` — a classe chega ao DOM sem regra de CSS.
- Botão ou link de navegação feito à mão ao lado de `UNavigationMenu`: diverge
  dos tokens `navigationMenu` (já aconteceu na sidebar).
- Montar `UModal` de confirmação em cada página em vez de usar o
  `ConfirmDialog` único.
- Assumir `useOverlay()`, `locale` no `UApp`, MCP do Nuxt UI, chat ou editor
  como parte do projeto: nenhum está em uso (ver `nuxfire-real.md` §6).
- Implementar de memória a API de um componente sem checar props/slots no tema
  gerado ou na documentação da versão instalada (4.11.0).
- Adicionar biblioteca de UI paralela ao Nuxt UI para algo que ele já cobre.

## Validação

- `bun run typecheck` em `apps/app` (`nuxt typecheck`) sem erro de props/slots
  nos `.vue` alterados.
- Sem paleta bruta nos arquivos alterados:
  `grep -nE "\b(text|bg|border|ring)-(gray|zinc|slate|stone|neutral|red|green|blue)-[0-9]{2,3}\b" <arquivos>`
  deve retornar vazio.
- Subir o app (`bun run app` na raiz, que usa `sst shell`) e abrir a tela nos temas claro e
  escuro, em largura de celular e de desktop; conferir no DOM que a classe do
  override chegou (não confiar só no código).
- Percorrer a tela por teclado: foco visível, ordem de tab, `Esc` em overlays,
  rótulo em todo campo (`UFormField`).
- Formulário: caso inválido, válido e erro do servidor (toast/erro de campo).
- Tabela: estado vazio, carregando, erro e linha clicável quando aplicável.
- Não declarar "acessível" ou "responsivo" apenas porque o componente é do Nuxt
  UI; a evidência acima é obrigatória.

## Skills relacionadas

- `$fireskill-specialist-nuxt` para páginas, layouts, composables e SSR.
- `$fireskill-specialist-design-system` para paleta, tokens e decisões de marca
  que acabam em `packages/tokens`.
- `$fireskill-specialist-ui-design` e `$fireskill-specialist-ux-design` para
  composição de tela e fluxo antes do componente.
- `$fireskill-specialist-tailwind-css` para utilitários e responsividade fora dos
  componentes.
- `$fireskill-specialist-trpc` para a chamada que o formulário dispara.
- `$fireskill-specialist-nuxt-authorization` para esconder/mostrar ação por
  permissão (`<Can>`).
- `$fireskill-specialist-web-accessibility` para contraste, foco e teclado em
  profundidade.

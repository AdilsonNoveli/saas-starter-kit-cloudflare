# Design system do produto

`packages/tokens` (`@nuxfire/tokens`) é a única fonte de verdade para customização visual. Este arquivo diz onde ela vive e as regras para usá-la; os valores (paletas, raio, fontes, overrides de componente) ficam no código, nunca aqui.

## Fonte única

- `packages/tokens/theme.css`: fontes, paletas (`flame`, `fire`, `night`), raio de borda (`--ui-radius`) e o mapeamento de superfície, texto e borda dos modos claro e escuro (`--ui-*`, bloco `.dark`).
- `packages/tokens/index.ts`: `sharedUiConfig` (o bloco `ui` de cada `app.config.ts`, incluindo `colors`: `primary` → `flame`, `secondary` → `fire`, `neutral` → `night`) e `enterpriseTableUi` (o `:ui` da `UTable`). Os motivos de cada override estão nos comentários do arquivo.
- `packages/tokens/index.ts` também exporta `themeColor` (a cor do `<meta name="theme-color">`, que não aceita variável CSS); `theme-color.test.ts` falha se ela divergir do `--ui-bg` de `theme.css`.
- `apps/app`, `apps/web` e `apps/login` importam, nesta ordem, `tailwindcss`, `@nuxt/ui` e `@nuxfire/tokens/theme.css` no `main.css`. O `theme.css` vem depois para sobrescrever os defaults do Nuxt UI.
- `theme.css` declara `@source "./index.ts";`: sem essa linha o Tailwind não escaneia o pacote (chega por symlink) e uma classe que só existe em `index.ts` vai para o DOM sem regra de CSS.

## Regras

1. Toda customização visual (cor, tipografia, raio, modo escuro, defaults de componente) vive só em `packages/tokens`. O `main.css` de um app não redeclara token; serve ao que é genuinamente local (uma animação, um efeito de componente).
2. Em todos os apps e em `layers/`, use apenas as classes e cores semânticas do `@nuxt/ui` (`primary`, `success`, `text-default`, `bg-elevated`, `border-default`...); nunca paleta bruta (`text-red-500`) nem hex ou `rgba` no CSS: derive de um token (`var(--ui-*)`, `color-mix`). Exceção documentada no código: o QR code do MFA fica preto sobre branco nos dois temas.
3. Reaproveite os tokens antes de criar valores locais.
4. Toda `UTable` recebe `enterpriseTableUi` por `:ui`.
5. Não comunique erro ou sucesso só por cor; mantenha foco visível por teclado; respeite `prefers-reduced-motion`.

## Revisão visual

Antes do item `EVIDENCE` da tarefa, confirme bordas, espaçamentos, margens, padding e tipografia contra os tokens. Componentes reaproveitados ou criados são registrados em `.fireskills/INTERFACE.md`.

## Como rebrandar

- Cor de acento e neutros: paletas em `theme.css`. Se renomear uma paleta, atualize `ui.colors` em `index.ts`.
- Raio: `--ui-radius` em `theme.css`.
- Default de um componente Nuxt UI: `sharedUiConfig` ou `enterpriseTableUi` em `index.ts`.

## Exceções da entrega

Registre aqui toda exceção às regras acima, com motivo e alcance.

| Data | Tela ou fluxo | Regra substituída | Nova regra | Alcance | Motivo | Autor |
| --- | --- | --- | --- | --- | --- | --- |

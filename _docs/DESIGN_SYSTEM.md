# Design System NuxFire

> Histórico: este arquivo começou como um *prompt* para um agente de IDE implementar o design system do
> zero. O sistema descrito abaixo já está implementado — em `packages/design-tokens` — então este arquivo
> agora é a referência do que **existe de fato**, não uma instrução para construir algo. Se você for mudar
> uma cor, o raio de borda, ou o estilo de um componente, o lugar certo é `packages/design-tokens`, não
> este arquivo (ele só documenta).

## 1. Identidade da marca

NuxFire é um hub de código/aplicações. A personalidade visual é:

> Fogo + engenharia + execução. Uma plataforma técnica, rápida e confiável, com energia de quem constrói
> e entrega.

Regra de ouro: **a cor pode ser intensa, o design precisa ser calmo.** Vermelho + laranja + preto é uma
combinação que escorrega fácil para estética de gaming/esports/energético. Para evitar isso:

- Muito espaço negativo, sem excesso de elementos gráficos.
- Tipografia limpa e forte — não decorativa.
- Ícones monoline (outline, Lucide), nunca ícones "gordos" ou 3D.
- Gradiente usado com intenção, nunca como wallpaper de fundo.
- **Zero** chamas literais, partículas, brilho/glow exagerado ou glassmorphism.
- Vermelho/laranja = identidade da marca. Verde = **exclusivamente** feedback de sistema (sucesso,
  validado, deploy ok). Nunca usar verde como cor decorativa de marca.
- **Zero sombra em superfícies estáticas** (cards, seções, painéis) — separação vem de borda/`ring` de
  1px, nunca `box-shadow`. Modais, dropdowns, popovers e tooltips continuam com sombra — eles flutuam
  sobre o conteúdo sem um scrim, então a sombra ali é a única pista de profundidade, e é assim que o
  próprio Nuxt UI e a referência pedped fazem.
- **Raio de borda enterprise/flat**, não o padrão "arredondado" do Tailwind — ver seção 4.

## 2. Onde os tokens vivem: `packages/design-tokens`

Todo token de design do NuxFire está centralizado em **um único pacote de workspace**,
`@nuxfire/design-tokens`, consumido pelos três apps Nuxt (`packages/app`, `packages/web`,
`packages/auth-frontend`). Antes desse pacote existir, cada app duplicava seu próprio `app.config.ts` e
seu próprio `main.css` — risco real de um app divergir do outro sem ninguém perceber. Agora, mudar uma cor
de marca, o raio de borda, ou o estilo padrão de um componente é uma edição em um lugar só.

O pacote tem duas partes:

- **`packages/design-tokens/theme.css`** — tokens CSS: fontes, as paletas de acento `flame`/`fire`, o
  raio de borda (`--ui-radius`), e o mapeamento de superfície/texto/borda do modo escuro (e claro).
- **`packages/design-tokens/index.ts`** — exporta `sharedUiConfig` (o bloco `ui` que cada app espalha
  dentro do próprio `app.config.ts`: ícones, cores semânticas, e overrides de componente do Nuxt UI —
  card, avatar, navegação, tabs) e `enterpriseTableUi` (o `:ui` que toda `UTable` do app usa).

Um app novo consome assim:

```json [package.json]
{ "dependencies": { "@nuxfire/design-tokens": "workspace:*" } }
```

```css [app/assets/css/main.css]
@import "tailwindcss";
@import "@nuxt/ui";
@import "@nuxfire/design-tokens/theme.css"; /* depois do @nuxt/ui, pra sobrescrever os defaults dele */
```

```ts [app/app.config.ts]
import { sharedUiConfig } from "@nuxfire/design-tokens";

export default defineAppConfig({
  ui: { ...sharedUiConfig }, // extras específicos do app entram depois do spread
});
```

### A armadilha do `@source`

O pacote chega em cada app por um symlink em `node_modules` (workspace do Bun) — e o Tailwind **não**
varre `node_modules` por padrão em busca de classes usadas. Sem a diretiva abaixo, qualquer classe que só
existe dentro de `index.ts` (por exemplo, `before:bg-primary/15` num `compoundVariants`) é gerada no DOM
mas **sem nenhuma regra CSS por trás** — silenciosamente quebrada, sem erro nenhum. Foi um bug real,
encontrado e corrigido durante a implementação. `theme.css` já carrega isso:

```css
@source "./index.ts";
```

Se `index.ts` ganhar uma classe genuinamente nova (não uma reaproveitada de outro lugar já escaneado),
essa linha é o que garante que ela realmente vira CSS.

## 3. Paleta de tokens

### Acento de marca — `flame` (vermelho) e `fire` (laranja)

Compartilhadas pelos três apps, idênticas byte a byte — vivem só em `theme.css`.

| shade | flame | fire |
|---|---|---|
| 50 | #fff1f1 | #fff8ed |
| 100 | #ffe1e1 | #ffefd1 |
| 200 | #ffc7c7 | #ffdba3 |
| 300 | #ffa0a0 | #ffc06b |
| 400 | #ff6f6f | #ffa333 |
| **500** | **#ff4d4d** | **#ff8904** |
| **600** | **#f13a3a** | #e67200 |
| 700 | #d92626 | #bf5c00 |
| **800** | **#991b1b** | #99490a |
| 900 | #7a1616 | #7a3c10 |
| 950 | #450b0b | #431e08 |

`ui.colors` mapeia `primary: 'flame'`, `secondary: 'fire'` — igual nos três apps.

### Neutro — `night` (superfícies): **diferente por app, de propósito**

Ao contrário do acento de marca, a escala neutra **não é compartilhada** — cada app define a própria em
seu `main.css`, com o mesmo nome (`night-*`), mas hues diferentes:

**`packages/app`** — cinza frio puro, igual byte a byte à escala `gray-*` da referência pedped (o painel
admin "enterprise, estilo Linear" usado como alvo de qualidade):

| shade | hex |
|---|---|
| 50 | #fafafa |
| 100 | #f8f8f8 |
| 200 | #e6e6e6 |
| 300 | #cccccc |
| 400 | #888888 |
| 500 | #555555 |
| 600 | #333333 |
| 700 | #1a1a1a |
| 800 | #0d0d0d |
| 900 / 950 | #000000 |

**`packages/web`** e **`packages/auth-frontend`** — cinza com tom quente ("ember"), a identidade visual do
site público de marca:

| shade | hex |
|---|---|
| 50 | #f7f4f3 |
| 100 | #efe9e7 |
| 200 | #ddd2cf |
| 300 | #c2b3af |
| 400 | #9c8884 |
| 500 | #786461 |
| 600 | #5b4b48 |
| 700 | #443736 |
| 800 | #2a2627 |
| 900 | #1e1a1b |
| 950 | #140807 |

**Por quê a divisão**: `packages/app` é o painel de trabalho (dashboard + `/admin`) — um utilitário
enterprise, onde cinza neutro puro é o padrão certo (GitHub, Linear, Vercel fazem o mesmo: acento de marca
só nos pontos de ação, nunca na base neutra). `packages/web`/`auth-frontend` são a vitrine pública da
marca, onde o tom quente reforça a identidade "fogo". Rebrandar a base neutra de um app não afeta o outro —
edite só a escala `night-*` daquele app.

### Semânticas (feedback de sistema, não são "marca")

- **success** → `green` padrão do Tailwind.
- **warning** → `amber` padrão do Tailwind.
- **error** → `red` padrão do Tailwind (**não** `flame`). Propositalmente diferente do vermelho de marca:
  `flame` = ação/identidade, `red` = destrutivo/erro.
- **info** → `blue` padrão do Tailwind.

## 4. Raio de borda — enterprise/flat

Um único token, `--ui-radius: 0.1875rem` (3px), definido em `theme.css`. O Nuxt UI deriva toda a escala
`rounded-*` proporcionalmente a partir dele (`--radius-lg: calc(var(--ui-radius) * 2)`, etc.) — então
mudar essa **uma** variável afeta cards, botões, inputs, modais e badges de uma vez, sem precisar
sobrescrever cada `rounded-*` na mão.

| token | fórmula | valor atual |
|---|---|---|
| `rounded-xs` | `ui-radius × 0.5` | 1.5px |
| `rounded-sm` | `ui-radius × 1` | 3px |
| `rounded-md` | `ui-radius × 1.5` | 4.5px |
| `rounded-lg` (cards) | `ui-radius × 2` | 6px |
| `rounded-xl` | `ui-radius × 3` | 9px |
| `rounded-2xl` | `ui-radius × 4` | 12px |
| `rounded-3xl` | `ui-radius × 6` | 18px |

O valor mira o visual "flat, cantos quase retos" da referência pedped (que usa cantos ainda mais retos,
via `!important` por passo — aqui o mesmo efeito vem de uma única variável proporcional, sem hack por
componente).

## 5. Mapeamento de componentes (`sharedUiConfig`)

Overrides de componente do Nuxt UI, em `packages/design-tokens/index.ts`, aplicados nos três apps:

| Componente | O que muda | Por quê |
|---|---|---|
| `UCard` (`outline`/`subtle`/`soft`) | fundo `bg-elevated` em vez de `bg-default` | O padrão do Nuxt UI deixa o card na mesma cor da página (contraste 1:1 medido) — `bg-elevated` é um tom acima, a superfície "levantada" que a referência pedped usa. |
| `UAvatar` (`neutral`, sem imagem) | fundo `bg-accented` em vez de `bg-elevated` | O fallback padrão usa a mesma cor do card — um avatar sem foto dentro de um card ficava sem fundo visível nenhum. |
| `UNavigationMenu` (vertical) | ícone 24px (era 20px), linha colapsada como quadrado `size-11` centralizado, item ativo com `ring` colorido além do fundo | Ícone maior e um botão quadrado definido (não só um ícone flutuando numa linha) é o que faz a sidebar colapsada ler como enterprise em vez de amadora. |
| `UTabs` | variante padrão `link` (sublinhado) em vez de `pill` sólido | Um bloco cheio de cor de marca dentro de um card pesa demais visualmente; o sublinhado é o padrão que as telas de configuração da referência usam. |
| `UTable` (`enterpriseTableUi`) | cabeçalho `text-xs uppercase tracking-wider text-muted` (era `text-sm` normal), fundo do header sólido | Cabeçalho de tabela deve ler como rótulo de coluna, não como título — convenção usada por Linear/Stripe/Notion e pela própria referência pedped. |

`enterpriseTableUi` é exportado à parte de `sharedUiConfig` (não é um slot global do `UTable`) — é passado
explicitamente via prop `:ui` em cada `<UTable>`/`AdminDataTable`, porque uma prop de instância sempre
vence, enquanto um override global de slot não tinha sido validado para esse componente especificamente.

## 6. Acessibilidade (contraste, medido de verdade)

O mapeamento de modo escuro/claro em `theme.css` não é estimado — foi medido contra a superfície real do
app rodando (fórmula WCAG de luminância relativa), depois de uma versão anterior falhar:

**Antes** (herdado do Nuxt UI puro, sem os overrides): card contra o fundo da página = **1.00:1**
(invisível), borda do card = **1.117:1** (invisível), ícone inativo/placeholder = **2.61:1** (abaixo do
piso de 4.5:1 do WCAG AA para texto).

**Depois** (modo escuro, canvas `night-800` = `#0d0d0d`):

| token | valor | contraste no canvas |
|---|---|---|
| `--ui-border` | `night-600` (#333333) | 1.538:1 (elemento não-texto) |
| `--ui-text-highlighted` | `night-50` (#fafafa) | 18.7:1 |
| `--ui-text` | `night-200` (#e6e6e6) | 15.6:1 |
| `--ui-text-muted` | `night-300` (#cccccc) | 12.1:1 |
| `--ui-text-dimmed` | `night-400` (#888888) | 5.48:1 |

Todas as quatro faixas de texto passam WCAG AA (4.5:1) com folga — `dimmed` é a mais apertada de propósito,
porque ela também é usada em placeholder e ícone inativo, onde o piso importa de verdade. O modo claro
espelha a mesma lógica na direção oposta (ver `theme.css`, bloco `:root`).

Regras que continuam valendo independente do token exato:

- Nunca comunicar erro/sucesso só por cor — sempre ícone + texto.
- Focus visible funcionando por teclado em todo componente interativo (o Nuxt UI já cobre isso por
  padrão — não desative).
- Respeitar `prefers-reduced-motion` em qualquer transição/gradiente animado.

## 7. Tipografia e ícones

- Fonte de interface: **Geist**, fallback `Montserrat`/`system-ui`.
- Fonte monoespaçada: **Geist Mono**, fallback `JetBrains Mono`.
- Ícones: monoline/outline, **Lucide** (`@iconify-json/lucide`) — nunca preenchido/3D, e escolhidos por
  peso visual consistente entre si (evitar misturar um ícone bem detalhado com vários simples/bold na
  mesma navegação).

## 8. Como rebrandar

- **Trocar a cor de acento (primária/secundária) em todo o produto**: editar as escalas `flame-*`/`fire-*`
  em `packages/design-tokens/theme.css`. Um lugar, três apps atualizados.
- **Trocar o raio de borda em todo o produto**: editar `--ui-radius` no mesmo arquivo.
- **Trocar o visual padrão de um componente Nuxt UI em todo o produto** (fundo de card, cor de avatar,
  estado ativo de nav, estilo de tabela): editar `sharedUiConfig`/`enterpriseTableUi` em
  `packages/design-tokens/index.ts`.
- **Trocar só o tom neutro de UM app** (sem afetar os outros dois): editar a escala `--color-night-*`
  daquele app, no `main.css` dele — não em `design-tokens`.
- **Sobrescrever algo só em UM app**: espalhar `sharedUiConfig` no `app.config.ts` daquele app e adicionar
  chaves depois do spread — a última definição vence.

Como cada token é uma custom property CSS (nunca uma classe Tailwind hardcoded dentro de um componente),
essa mesma estrutura é a base certa para um futuro editor de tema por tenant: sobrescrever um punhado de
`--ui-*`/`--color-*` em runtime (injetado, por exemplo, por um painel admin) alcança todo componente de
graça — nenhum componente precisa ser tocado.

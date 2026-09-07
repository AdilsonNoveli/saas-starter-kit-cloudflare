# Prompt de implementação — Design System Nuxfire (Dark Mode)

> Cole este arquivo no repositório (ex.: `docs/design-system.md` ou `.cursor/rules/design-system.mdc` /
> `CLAUDE.md`) e peça ao agente de IDE: **"Implemente o design system descrito neste arquivo em toda a
> aplicação, usando Nuxt UI (https://ui.nuxt.com) como base de componentes."**

## 1. Identidade da marca

A Nuxfire é um hub de código/aplicações. A personalidade visual é:

> Fogo + engenharia + execução. Uma plataforma técnica, rápida e confiável, com energia de quem constrói
> e entrega.

Regra de ouro: **a cor pode ser intensa, o design precisa ser calmo.** Vermelho + laranja + preto é uma
combinação que escorrega fácil para estética de gaming/esports/energético. Para evitar isso:

- Muito espaço negativo, sem excesso de elementos gráficos.
- Tipografia limpa e forte — não decorativa.
- Ícones monoline (outline), nunca ícones "gordos" ou 3D.
- Gradiente usado com intenção, nunca como wallpaper de fundo.
- **Zero** chamas literais, partículas, brilho/glow exagerado ou glassmorphism.
- Vermelho/laranja = identidade da marca. Verde = **exclusivamente** feedback de sistema (sucesso,
  validado, deploy ok). Nunca use verde como cor decorativa de marca.

## 2. Paleta de tokens

Gerar as escalas completas (50→950) abaixo em `app/assets/css/main.css`, dentro de um bloco `@theme`
(Tailwind v4 / Nuxt UI v3+). Os valores em **negrito** são os hex originais da marca — os demais são
tints/shades derivados para dar suporte a hover, texto e bordas.

### Neutro — `night` (superfícies, baseado no template de referência + #2a2627)

| shade | hex | uso |
|---|---|---|
| 50 | #f7f4f3 | texto sobre fundo escuro (raramente usado) |
| 100 | #efe9e7 | texto principal em modo claro |
| 200 | #ddd2cf | bordas em modo claro |
| 300 | #c2b3af | texto secundário |
| 400 | #9c8884 | ícones inativos, placeholders |
| 500 | #786461 | texto desabilitado |
| 600 | #5b4b48 | bordas em modo escuro (hover) |
| 700 | #443736 | bordas padrão em modo escuro |
| **800** | **#2a2627** | **superfície elevada: sidebar, cards, inputs, popovers** |
| 900 | #1e1a1b | fundo secundário / hover de superfície |
| **950** | **#140807** | **fundo base da aplicação (canvas)** |

> Por que dois tons de fundo? No print de referência (calendar-template.nuxt.dev) o canvas principal e a
> sidebar/cards têm profundidades diferentes — isso cria hierarquia sem precisar de sombra. Use `night-950`
> como fundo da página e `night-800` (o hex que você já tinha escolhido, #2a2627) para tudo que "flutua"
> sobre ela: sidebar, cards, modais, popovers, inputs.

### Primária — `flame` (vermelho, cor principal da marca)

| shade | hex |
|---|---|
| 50 | #fff1f1 |
| 100 | #ffe1e1 |
| 200 | #ffc7c7 |
| 300 | #ffa0a0 |
| 400 | #ff6f6f |
| **500** | **#ff4d4d** ("cor principal") |
| **600** | **#f13a3a** ("acento de ação") |
| 700 | #d92626 |
| **800** | **#991b1b** ("profundidade") |
| 900 | #7a1616 |
| 950 | #450b0b |

### Secundária — `fire` (laranja, "acende" pontos específicos — usar com moderação)

| shade | hex |
|---|---|
| 50 | #fff8ed |
| 100 | #ffefd1 |
| 200 | #ffdba3 |
| 300 | #ffc06b |
| 400 | #ffa333 |
| **500** | **#ff8904** ("fogo/energia") |
| 600 | #e67200 |
| 700 | #bf5c00 |
| 800 | #99490a |
| 900 | #7a3c10 |
| 950 | #431e08 |

### Semânticas (não são "marca", são feedback de sistema)

- **success** → use o **verde padrão do Nuxt/Tailwind** (`green`). Coincidência útil: o `green-400` do
  Nuxt já é `#00DC82`, exatamente o verde de validação do briefing — não precisa redefinir nada.
- **warning** → `amber` (padrão Tailwind).
- **error** → `red` (padrão Tailwind, **não** o `flame` customizado). Propositalmente diferente do
  vermelho de marca: `flame` = ação/identidade, `red` = destrutivo/erro. Sempre acompanhe erro com ícone
  + texto, nunca só cor.
- **info** → `blue` (padrão Tailwind).

## 3. Configuração no Nuxt UI

**`app/assets/css/main.css`**
```css
@import "tailwindcss";
@import "@nuxt/ui";

@theme static {
  --font-sans: 'Geist', system-ui, sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;

  --color-night-50: #f7f4f3;
  --color-night-100: #efe9e7;
  --color-night-200: #ddd2cf;
  --color-night-300: #c2b3af;
  --color-night-400: #9c8884;
  --color-night-500: #786461;
  --color-night-600: #5b4b48;
  --color-night-700: #443736;
  --color-night-800: #2a2627;
  --color-night-900: #1e1a1b;
  --color-night-950: #140807;

  --color-flame-50: #fff1f1;
  --color-flame-100: #ffe1e1;
  --color-flame-200: #ffc7c7;
  --color-flame-300: #ffa0a0;
  --color-flame-400: #ff6f6f;
  --color-flame-500: #ff4d4d;
  --color-flame-600: #f13a3a;
  --color-flame-700: #d92626;
  --color-flame-800: #991b1b;
  --color-flame-900: #7a1616;
  --color-flame-950: #450b0b;

  --color-fire-50: #fff8ed;
  --color-fire-100: #ffefd1;
  --color-fire-200: #ffdba3;
  --color-fire-300: #ffc06b;
  --color-fire-400: #ffa333;
  --color-fire-500: #ff8904;
  --color-fire-600: #e67200;
  --color-fire-700: #bf5c00;
  --color-fire-800: #99490a;
  --color-fire-900: #7a3c10;
  --color-fire-950: #431e08;
}

/* Sobrescreve os tokens de superfície do Nuxt UI para o dark mode (nomes podem
   variar por versão — conferir em node_modules/@nuxt/ui/dist/runtime/**.css) */
.dark {
  --ui-bg: var(--color-night-950);
  --ui-bg-muted: var(--color-night-900);
  --ui-bg-elevated: var(--color-night-800);
  --ui-bg-accented: var(--color-night-700);
  --ui-border: color-mix(in oklab, white 8%, transparent);
  --ui-border-muted: color-mix(in oklab, white 5%, transparent);
  --ui-border-accented: color-mix(in oklab, white 14%, transparent);
  --ui-text-highlighted: var(--color-night-50);
  --ui-text: var(--color-night-100);
  --ui-text-muted: var(--color-night-300);
  --ui-text-dimmed: var(--color-night-500);
}
```

**`app/app.config.ts`**
```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'flame',
      secondary: 'fire',
      success: 'green',
      info: 'blue',
      warning: 'amber',
      error: 'red',
      neutral: 'night'
    },
    button: {
      defaultVariants: {
        color: 'primary',
        variant: 'solid'
      }
    }
  }
})
```

> ⚠️ Confira a sintaxe atual em https://ui.nuxt.com/docs/customization/colors antes de aplicar — o Nuxt UI
> muda essa API entre major versions. O que não muda é a intenção descrita acima: `flame` como primária,
> `fire` como secundária, `night` como neutra, semânticas em cores padrão do Tailwind.

## 4. Acessibilidade (contraste no dark mode)

Cores de marca saturadas (vermelho/laranja) têm contraste **insuficiente para texto normal** quando usadas
puras sobre fundo escuro. Regras obrigatórias:

- **Texto/links diretamente sobre o fundo** (`night-950`/`night-800`): usar `flame-300` ou `flame-400`,
  nunca `flame-500`/`600` cru (contraste abaixo de 4.5:1 para texto de corpo).
- **Botão sólido primário**: fundo `flame-700` (`#d92626`) + texto branco → contraste ≈ 4.9:1 (passa AA).
  Não usar `flame-500`/`600` como fundo com texto branco pequeno — passam em componentes/texto grande
  (≥3:1) mas ficam abaixo de 4.5:1 para texto normal.
- **`flame-500`/`600`** ficam ótimos para: ícones grandes, bordas, focus ring, gradiente, texto grande
  (≥24px ou ≥19px bold), estados de hover, indicadores/dots.
- **Focus visible**: outline de 2px em `flame-500`, com `offset: 2px`, em todos os elementos
  interativos (não remover o focus-visible padrão do Nuxt UI).
- Nunca comunicar erro/sucesso só por cor — sempre ícone + texto (o próprio Nuxt UI já faz isso nos
  componentes `Alert`/`Toast`, não desative os ícones).
- Respeitar `prefers-reduced-motion` em qualquer transição/gradiente animado.
- Testar os dois modos (claro/escuro) — apesar do foco ser dark mode, gere também a escala para light
  mode usando os tons 50–300 da `night` como superfícies claras.

## 5. Mapeamento de componentes

| Elemento | Cor / variante Nuxt UI |
|---|---|
| Botão de ação primária (CTA) | `color="primary" variant="solid"` → bg `flame-700`, hover `flame-600` |
| Botão secundário | `color="secondary" variant="soft"` → fundo `fire-500/10`, texto `fire-300` |
| Botão terciário / cancelar | `color="neutral" variant="ghost"` |
| Botão destrutivo | `color="error" variant="solid"` |
| Links inline | `text-flame-400`, hover `text-flame-300`, sublinhado só no hover |
| Nav ativa / item selecionado | borda ou indicador lateral `flame-600`, fundo `night-800` |
| Badges de status "sucesso/deploy ok" | `color="success"` |
| Badges de status "processando" | `color="secondary"` (fire) com ícone de loading |
| Inputs / selects | fundo `night-800`, borda `night-700`, borda em foco `flame-500` |
| Cards / painéis | fundo `night-800`, borda `night-700`, **sem sombra** (usar borda 1px em vez de shadow) |
| Sidebar | fundo `night-900` (um tom abaixo do card, como no print de referência) |
| Divisores / hairlines | branco a 6–8% de opacidade (`--ui-border`), nunca cinza sólido |
| Indicadores de categoria/etiqueta (dots) | bolinha de 6–8px preenchida com a cor semântica: `flame` = crítico/marca, `fire` = em progresso, `success` = concluído, `info` = agendado/informativo — mesmo padrão do calendário de referência |
| Badge "hoje" / destaque numérico | círculo preenchido `flame-600`, texto branco |
| Editor de código / blocos `<code>` | fundo `night-950` (mais escuro que o card ao redor), fonte `--font-mono` |
| Gradiente de assinatura (hero, avatar ring, barra de progresso, linha de conexão) | `linear-gradient(135deg, var(--color-flame-500), var(--color-flame-800))` — energia → profundidade, conforme o briefing de marca |

## 6. Tipografia e ícones

- Fonte de interface: **Geist** (ou **Inter** como fallback seguro). Evite recorrer só a Inter se quiser
  diferenciação — Geist tem números tabulares melhores para dashboards/código.
- Fonte monoespaçada: **Geist Mono** ou **JetBrains Mono**, para timestamps, código, IDs, badges de versão.
- Escala de peso: títulos em `semibold`/`bold`, corpo em `regular`/`medium`. Não usar ALL CAPS para labels
  nem "eyebrows" decorativos acima de títulos — vá direto ao ponto.
- Ícones: estilo monoline/outline (ex.: **Lucide**, já é o padrão do Nuxt UI via `@iconify-json/lucide`).
  Não misturar com ícones preenchidos/3D.

## 7. Checklist final antes de dar como pronto

- [ ] `flame`, `fire` e `night` definidos em `@theme` e mapeados em `app.config.ts`.
- [ ] Fundo do app usa `night-950`; sidebar/cards/modais usam `night-800` (ou `night-900` para a sidebar,
      se quiser um terceiro nível de profundidade como no template de referência).
- [ ] Nenhum texto de corpo usa `flame-500/600` ou `fire-500/600` diretamente como cor de texto.
- [ ] Botão primário passa no teste de contraste 4.5:1 (WebAIM contrast checker).
- [ ] Focus visible funcionando por teclado em todos os componentes interativos.
- [ ] Verde aparece **apenas** em contexto de sucesso/validação, nunca como decoração de marca.
- [ ] Nenhuma chama literal, partícula, glow ou textura "gamer" na UI.
- [ ] `prefers-reduced-motion` respeitado nas transições e no gradiente animado (se houver).
- [ ] Light mode gerado a partir da mesma escala `night` (tons 50–300), não é obrigatório ser pixel-perfect
      mas não pode quebrar.
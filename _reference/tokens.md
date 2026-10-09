/*
 * Serelius · patch de tokens: FOGO VIVO (branding tutsvoi) + dark grafite
 * Aplicar sobre o tokens.css atual.
 *
 * O QUE MUDOU: só as cores de marca/ação (antes roxo, agora vermelho-fogo).
 * O QUE NÃO MUDOU: fundos, camadas, bordas, textos, estados, escala grafite,
 * sombras, densidade e trilhas de identidade.
 *
 * Paleta do branding:
 *   Fogo   #FE1C02 (principal, vermelho-alaranjado do logo)
 *   Preto  #000000 · Branco #FFFFFF (já cobertos pelo grafite e pelo texto sobre botão)
 *   Brasa  #FF8A00 / #FFC266 (laranja do degradê luminoso das fotos, só marca-texto)
 */

/* ───────────────────────── 1. FOGO PRINCIPAL ───────────────────────── */
@theme static {
  --color-fire-300: #ff4a2e;     /* foco / texto de destaque / marca do checkbox no dark (4,7:1 no raised) */
  --color-fire-500: #fe1c02;     /* PRINCIPAL: botões, ação, seleção (4,8:1 no canvas dark) */
  --color-fire-700: #c91600;     /* hover e texto de destaque no claro (5,8:1 com branco, 5,2:1 no canvas) */

  --color-ember-200: #ffc266;    /* brasa clara */
  --color-ember-400: #ff8a00;    /* marca-texto: laranja do degradê (texto grafite por cima) */

  /* Nomes antigos mantidos como alias para não quebrar classes existentes */
  --color-serelius-400: var(--color-fire-500);   /* era #bcf354 */
  --color-highlight:    var(--color-fire-500);   /* era #bcf354 */
  --color-lime-500:     var(--color-fire-700);   /* hover da ação no dark (era #a9e03f) */
  --color-lime-ink:     var(--color-fire-700);   /* texto/ícone de destaque no claro (era #46620e) */

  /* Escala grafite: inalterada */
  --color-graphite-50:  #f7f8f8;
  --color-graphite-100: #eef0f1;
  --color-graphite-200: #d8dcde;
  --color-graphite-300: #b8bec1;
  --color-graphite-400: #98a0a4;
  --color-graphite-500: #788287;
  --color-graphite-600: #5b6367;
  --color-graphite-700: #43494c;
  --color-graphite-800: #323739;
  --color-graphite-850: #292c2e;
  --color-graphite-900: #222426;
  --color-graphite-910: #1c1e1f;
  --color-graphite-925: #161718;
  --color-graphite-950: #111213;

  --color-graphite-text-100: #f1f3f4;
  --color-graphite-text-200: #cdd2d5;
  --color-graphite-text-300: #a3aaae;
  --color-graphite-text-400: #878e92;
}

/* ───────────────────────── 2. DARK GRAFITE ───────────────────────── */
.dark {
  color-scheme: dark;

  --color-ink-50:  var(--color-graphite-50);
  --color-ink-100: var(--color-graphite-100);
  --color-ink-200: var(--color-graphite-200);
  --color-ink-300: var(--color-graphite-300);
  --color-ink-400: var(--color-graphite-400);
  --color-ink-500: var(--color-graphite-500);
  --color-ink-600: var(--color-graphite-600);
  --color-ink-700: var(--color-graphite-700);
  --color-ink-800: var(--color-graphite-800);
  --color-ink-850: var(--color-graphite-850);
  --color-ink-900: var(--color-graphite-900);
  --color-ink-910: var(--color-graphite-910);
  --color-ink-925: var(--color-graphite-925);
  --color-ink-950: var(--color-graphite-950);

  --color-mist-100: var(--color-graphite-text-100);
  --color-mist-200: var(--color-graphite-text-200);
  --color-mist-300: var(--color-graphite-text-300);
  --color-mist-400: var(--color-graphite-text-400);
  --color-paper:    var(--color-graphite-50);

  /* Camadas (inalteradas) */
  --sr-canvas:  var(--color-graphite-950);
  --sr-sunken:  var(--color-graphite-925);
  --sr-surface: var(--color-graphite-910);
  --sr-raised:  var(--color-graphite-900);
  --sr-overlay: rgba(0, 0, 0, 0.62);

  --sr-border-card:    var(--color-graphite-800);
  --sr-border-control: var(--color-graphite-700);
  --sr-border-strong:  var(--color-graphite-600);

  --sr-text-highlight: var(--color-paper);
  --sr-text:           var(--color-graphite-text-200);
  --sr-text-muted:     var(--color-graphite-text-300);
  --sr-text-dimmed:    var(--color-graphite-text-400);

  /* Fogo: ação, foco, seleção e destaque. Texto sobre fogo é sempre branco. */
  --sr-action:          var(--color-fire-500);
  --sr-action-hover:    var(--color-fire-700);
  --sr-on-action:       #ffffff;   /* usar peso 600+ nos botões: 3,9:1 sobre #fe1c02 */
  --sr-highlight:       var(--color-fire-500);
  --sr-on-highlight:    #ffffff;
  --sr-focus:           var(--color-fire-300);   /* anel de foco mais claro para ler no escuro */
  --sr-selected-bg:     rgba(254, 28, 2, 0.18);
  --sr-selected-border: var(--color-fire-300);
  --sr-mark:            var(--color-ember-400);  /* marca-texto (Brasa) */
  --sr-on-mark:         var(--color-graphite-950);

  /* Estados: inalterados */
  --sr-success: #4fe0a6;  --sr-success-bg: rgba(79, 224, 166, 0.14);
  --sr-warning: #f5b83d;  --sr-warning-bg: rgba(245, 184, 61, 0.14);
  --sr-danger:  #ff7e6b;  --sr-danger-bg:  rgba(255, 126, 107, 0.14);
  --sr-info:    #5ab8ff;  --sr-info-bg:    rgba(90, 184, 255, 0.14);
  --sr-check:   var(--color-fire-300);

  /* Trilhas: inalteradas */
  --sr-track-1: #f89080;
  --sr-track-2: #ca8931;
  --sr-track-3: #e3c24a;
  --sr-track-4: #0cafa8;
  --sr-track-5: #4ccffb;
  --sr-track-6: #6c97e7;
  --sr-track-7: #be9ef6;
  --sr-track-8: #cc77b1;

  --sr-shadow-xs: none;
  --sr-shadow-sm: none;
  --sr-shadow-md: 0 8px 24px -4px rgba(0, 0, 0, 0.55), 0 0 0 1px var(--color-graphite-800);
  --sr-shadow-lg: 0 16px 40px -8px rgba(0, 0, 0, 0.65), 0 0 0 1px var(--color-graphite-700);

  --sr-sidebar-bg: #141617;

  --ui-primary:       var(--color-fire-500);
  --ui-text-inverted: #ffffff;

  --ui-bg:          var(--color-graphite-950);
  --ui-bg-muted:    var(--color-graphite-925);
  --ui-bg-elevated: var(--color-graphite-900);
  --ui-bg-accented: var(--color-graphite-800);

  --ui-border:          var(--color-graphite-700);
  --ui-border-muted:    var(--color-graphite-800);
  --ui-border-accented: var(--color-graphite-600);

  --ui-text-highlighted: var(--color-paper);
  --ui-text:             var(--color-graphite-text-200);
  --ui-text-muted:       var(--color-graphite-text-300);
  --ui-text-dimmed:      var(--color-graphite-text-400);

  --art-ink:    var(--color-paper);
  --art-accent: var(--color-fire-500);
  --art-soft:   var(--color-graphite-800);
}

/* ───────────────────────── 3. DENSIDADE (inalterada) ───────────────────────── */
[data-density="equilibrada"] {
  --sr-density-row-h: 44px; --sr-density-gap: 16px;
  --sr-density-pad-x: 16px; --sr-density-pad-y: 10px;
  --sr-control-h: 32px;     --sr-row-h: 44px;
}
[data-density="compacta"] {
  --sr-density-row-h: 32px; --sr-density-gap: 8px;
  --sr-density-pad-x: 10px; --sr-density-pad-y: 6px;
  --sr-control-h: 28px;     --sr-row-h: 32px;
}

/* Buscar e trocar em todo o código: rgba(188, 243, 84 / 187, 243, 83 → rgba(254, 28, 2 */

/* ───────────────────────── 4. CLARO (fundos areia e textos grafite inalterados) ───────────────────────── */
:root {
  /* Ação em fogo */
  --sr-action:           var(--color-fire-500);
  --sr-action-hover:     var(--color-fire-700);
  --sr-on-action:        #ffffff;
  --sr-focus:            var(--color-fire-500);
  --sr-focus-ring-color: var(--color-fire-500);

  /* Texto: inalterado */
  --sr-text-highlight: var(--color-graphite-950);
  --sr-text:           var(--color-graphite-800);
  --sr-text-muted:     var(--color-graphite-700);
  --sr-text-dimmed:    var(--color-graphite-600);

  --sr-highlight:       var(--color-fire-500);
  --sr-on-highlight:    #ffffff;
  --sr-mark:            var(--color-ember-400);
  --sr-on-mark:         var(--color-graphite-950);
  --sr-selected-bg:     rgba(254, 28, 2, 0.12);
  --sr-selected-border: var(--color-fire-500);
  --sr-accent-text:     var(--color-fire-700);   /* links, ícones e números */

  --ui-primary:          var(--color-fire-500);
  --ui-text-inverted:    #ffffff;
  --ui-text-highlighted: var(--color-graphite-950);
  --ui-text:             var(--color-graphite-800);
  --ui-text-muted:       var(--color-graphite-700);
  --ui-text-dimmed:      var(--color-graphite-600);

  --art-ink:    var(--color-graphite-950);
  --art-accent: var(--color-fire-500);

  /* Estados: inalterados */
  --sr-success: #0a7044;  --sr-success-bg: rgba(10, 112, 68, 0.12);
  --sr-warning: #9f5200;  --sr-warning-bg: rgba(159, 82, 0, 0.12);
  --sr-danger:  #b92d24;  --sr-danger-bg:  rgba(185, 45, 36, 0.12);
  --sr-info:    #135fa8;  --sr-info-bg:    rgba(19, 95, 168, 0.12);
  --sr-check:   var(--color-fire-700);
}
.dark { --sr-accent-text: var(--color-fire-300); }

/* Padrões de componente (iguais nos dois temas) */
/* Botão (todos): fundo --sr-action (fogo), texto --sr-on-action (branco), hover --sr-action-hover.
   Aba/nav ativa: traço de 2px em --color-highlight (fogo).
   Badge de ação: fundo --color-highlight + texto --sr-on-highlight (branco).
   Barra de progresso: preenchimento fogo.
   Checkbox: quadrado só com borda 1.5px (--sr-text-highlight), fundo transparente, marca em --sr-check (fogo).
   Link: cor --sr-accent-text com sublinhado de 2px em fogo.
   Marca-texto (trecho grifado): fundo --sr-mark (Brasa) + texto --sr-on-mark. */
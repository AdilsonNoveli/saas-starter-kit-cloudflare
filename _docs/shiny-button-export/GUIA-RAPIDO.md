# ⚡ GUIA RÁPIDO - Shiny Button

## 🎯 3 PASSOS PARA USAR

### 1️⃣ COPIE O CSS

Cole o conteúdo de `shiny-button.css` no seu arquivo CSS principal (ou importe o arquivo).

### 2️⃣ CONFIGURE A VARIÁVEL

Adicione no início do seu CSS:

```css
:root {
  --background: #ffffff;  /* Branco para light mode */
}

/* Opcional: dark mode */
.dark {
  --background: #1a1a1a;  /* Escuro */
}
```

### 3️⃣ USE O BOTÃO

**SEMPRE envolva o conteúdo com `<span>`:**

```html
<button class="shiny-button" style="padding: 0.875rem 2rem; font-size: 0.875rem; font-weight: 700; text-transform: uppercase; border-radius: 0.75rem;">
  <span>MEU BOTÃO</span>
</button>
```

---

## 📋 COPIAR E COLAR

### HTML Puro

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="shiny-button.css">
  <style>
    :root { --background: #ffffff; }
    body { padding: 50px; background: #f5f5f5; }
  </style>
</head>
<body>
  <button class="shiny-button" style="padding: 0.875rem 2rem; font-size: 0.875rem; font-weight: 700; text-transform: uppercase;">
    <span>CLIQUE AQUI</span>
  </button>
</body>
</html>
```

### React/Next.js

```tsx
// 1. Cole shiny-button.css no globals.css

// 2. Use assim:
export default function Page() {
  return (
    <button className="shiny-button px-8 py-3.5 text-sm font-bold uppercase rounded-xl">
      <span>CLIQUE AQUI</span>
    </button>
  );
}
```

### Com Ícone (React)

```tsx
import { Send } from 'lucide-react';

<button className="shiny-button px-8 py-3.5 text-sm font-bold uppercase rounded-xl">
  <span className="flex items-center gap-2">
    <Send className="w-4 h-4" />
    <span>ENVIAR</span>
  </span>
</button>
```

---

## 🎨 VARIANTES PRONTAS

```html
<!-- Azul (padrão) -->
<button class="shiny-button">
  <span>Azul</span>
</button>

<!-- Verde -->
<button class="shiny-button shiny-green">
  <span>Verde</span>
</button>

<!-- Roxo -->
<button class="shiny-button shiny-purple">
  <span>Roxo</span>
</button>

<!-- Vermelho -->
<button class="shiny-button shiny-red">
  <span>Vermelho</span>
</button>
```

---

## 🔧 TAMANHOS COMUNS

```html
<!-- Pequeno -->
<button class="shiny-button" style="padding: 0.5rem 1rem; font-size: 0.75rem;">
  <span>Pequeno</span>
</button>

<!-- Médio (padrão) -->
<button class="shiny-button" style="padding: 0.875rem 2rem; font-size: 0.875rem;">
  <span>Médio</span>
</button>

<!-- Grande -->
<button class="shiny-button" style="padding: 1.25rem 3rem; font-size: 1rem;">
  <span>Grande</span>
</button>
```

### Com Tailwind CSS

```tsx
{/* Pequeno */}
<button className="shiny-button px-4 py-2 text-xs">
  <span>Pequeno</span>
</button>

{/* Médio */}
<button className="shiny-button px-8 py-3.5 text-sm">
  <span>Médio</span>
</button>

{/* Grande */}
<button className="shiny-button px-12 py-4 text-base">
  <span>Grande</span>
</button>
```

---

## 📐 BORDER RADIUS

```html
<!-- Totalmente redondo (pill) -->
<button class="shiny-button" style="border-radius: 9999px;">
  <span>Pill</span>
</button>

<!-- Médio -->
<button class="shiny-button" style="border-radius: 0.75rem;">
  <span>Rounded</span>
</button>
```

### Com Tailwind

```tsx
<button className="shiny-button rounded-full">  {/* pill */}
<button className="shiny-button rounded-xl">    {/* médio */}
<button className="shiny-button rounded-lg">    {/* pouco */}
```

---

## ⚠️ ERRO COMUM

### ❌ ERRADO (não funciona)
```html
<button class="shiny-button">
  Sem span aqui
</button>
```

### ✅ CORRETO
```html
<button class="shiny-button">
  <span>Com span aqui</span>
</button>
```

---

## 🐛 NÃO FUNCIONA?

### Checklist:

- [ ] Importei o `shiny-button.css`?
- [ ] Defini `--background` no `:root`?
- [ ] Usei `<span>` dentro do botão?
- [ ] Meu navegador é moderno? (Chrome 85+, Safari 15.4+)

### Debug Rápido:

```html
<style>
  :root {
    --background: #ffffff !important;
  }
</style>
```

---

## 📦 ARQUIVOS NECESSÁRIOS

```
✅ shiny-button.css       ← COPIE ESTE
📖 README.md              ← Documentação completa
💡 exemplo-html.html      ← Exemplos HTML
⚛️ exemplo-react.tsx      ← Exemplos React
⚡ GUIA-RAPIDO.md         ← Este arquivo
```

---

## 🚀 PRONTO!

Agora você tem um botão com:
- ✨ Borda azul girante
- 💫 Brilho deslizante
- 🌟 Grade de pontos animada
- 🫧 Efeito de respiração
- 👆 Feedback de clique

**Dica:** Para ver todos os exemplos funcionando, abra `exemplo-html.html` no navegador.

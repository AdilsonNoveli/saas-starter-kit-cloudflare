# 🌟 Shiny Button - Botão com Borda Animada

Efeito de botão com borda azul girante, brilho deslizante e animações suaves.

![Preview](https://img.shields.io/badge/Status-Production%20Ready-success)
![CSS](https://img.shields.io/badge/CSS-Pure%20CSS-blue)
![Framework](https://img.shields.io/badge/Framework-Agnostic-orange)

---

## 📦 O que está incluído

```
shiny-button-export/
├── shiny-button.css      ← CSS completo (COPIE ESTE)
├── exemplo-html.html     ← Exemplo HTML puro
├── exemplo-react.tsx     ← Exemplo React/Next.js
└── README.md            ← Este arquivo
```

---

## 🚀 Instalação Rápida

### Opção 1: HTML Puro

1. **Copie o arquivo CSS**
```bash
# Copie shiny-button.css para seu projeto
```

2. **Importe no seu HTML**
```html
<link rel="stylesheet" href="shiny-button.css">
```

3. **Configure a variável de fundo no CSS**
```css
:root {
  --background: #ffffff; /* Cor de fundo do botão */
}
```

4. **Use o botão**
```html
<button class="shiny-button" style="padding: 0.875rem 2rem;">
  <span>Meu Botão</span>
</button>
```

### Opção 2: React/Next.js/Tailwind

1. **Copie o CSS para `globals.css`**
```css
/* Cole o conteúdo de shiny-button.css aqui */
```

2. **Configure no :root (se ainda não tiver)**
```css
:root {
  --background: #ffffff;
}

.dark {
  --background: #1a1a1a;
}
```

3. **Use com Tailwind**
```tsx
<button className="shiny-button px-8 py-3.5 text-sm font-bold uppercase rounded-xl">
  <span>Meu Botão</span>
</button>
```

---

## ⚠️ REGRAS IMPORTANTES

### ❌ ERRADO (não vai funcionar)
```html
<button class="shiny-button">
  Meu Texto
</button>
```

### ✅ CORRETO (sempre use <span>)
```html
<button class="shiny-button">
  <span>Meu Texto</span>
</button>
```

**POR QUÊ?** As animações usam `> span` para aplicar z-index e efeitos corretamente.

---

## 🎨 Exemplos de Uso

### Básico
```html
<button class="shiny-button" style="padding: 0.875rem 2rem; border-radius: 0.75rem;">
  <span>Clique Aqui</span>
</button>
```

### Com Ícone
```html
<button class="shiny-button" style="padding: 0.875rem 2rem;">
  <span style="display: flex; align-items: center; gap: 0.75rem;">
    <svg width="20" height="20">...</svg>
    <span>Com Ícone</span>
  </span>
</button>
```

### Verde (variante)
```html
<button class="shiny-button shiny-green" style="padding: 0.875rem 2rem;">
  <span>Verde</span>
</button>
```

### React/Next.js com Tailwind
```tsx
import { Send } from 'lucide-react';

<button className="shiny-button px-8 py-3.5 text-sm font-bold uppercase rounded-xl">
  <span className="flex items-center gap-2">
    <Send className="w-4 h-4" />
    <span>Enviar</span>
  </span>
</button>
```

### Link (tag <a>)
```html
<a href="/contato" class="shiny-button" style="padding: 0.875rem 2rem; text-decoration: none; display: inline-block;">
  <span>Ir para Contato</span>
</a>
```

---

## 🎨 Variantes de Cor

O CSS inclui 4 variantes prontas:

| Classe | Cor | Preview |
|--------|-----|---------|
| `shiny-button` | Azul (padrão) | `#1d4ed8` |
| `shiny-button shiny-green` | Verde | `#10b981` |
| `shiny-button shiny-purple` | Roxo | `#8b5cf6` |
| `shiny-button shiny-red` | Vermelho | `#ef4444` |

**Exemplo:**
```html
<button class="shiny-button shiny-purple">
  <span>Roxo</span>
</button>
```

---

## 🔧 Personalizações

### Mudar Cor Customizada

Edite no arquivo CSS ou adicione inline:

```css
.shiny-button.minha-cor {
  --gradient-shine: #ff6b6b; /* Sua cor */
}

.shiny-button.minha-cor::after {
  background: linear-gradient(-50deg, transparent, #ff6b6b, transparent);
}

.shiny-button.minha-cor > span::before {
  box-shadow: inset 0 -1ex 2rem 4px #ff6b6b;
}
```

### Mudar Border Radius

```html
<!-- Totalmente redondo (pill) -->
<button class="shiny-button" style="border-radius: 9999px;">
  <span>Pill</span>
</button>

<!-- Médio -->
<button class="shiny-button" style="border-radius: 0.75rem;">
  <span>Rounded</span>
</button>

<!-- Pouco -->
<button class="shiny-button" style="border-radius: 0.5rem;">
  <span>Soft</span>
</button>
```

### Tamanhos

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

{/* Largura total */}
<button className="shiny-button w-full px-8 py-3.5">
  <span>Full Width</span>
</button>
```

---

## 🧩 Componente React Reutilizável

Veja o arquivo `exemplo-react.tsx` para componentes prontos:

- `ShinyButton` - Componente simples
- `ShinyButtonLink` - Com suporte a links Next.js
- `ExemplosDeUso` - Casos de uso completos

**Uso rápido:**

```tsx
import { ShinyButton } from './ShinyButton';

<ShinyButton variant="green" size="lg" rounded="lg">
  Meu Botão
</ShinyButton>
```

---

## 🌐 Compatibilidade de Navegadores

| Navegador | Versão Mínima | Suporte |
|-----------|---------------|---------|
| Chrome | 85+ | ✅ Total |
| Edge | 85+ | ✅ Total |
| Safari | 15.4+ | ✅ Total |
| Firefox | 115+ | ✅ Total |
| Opera | 71+ | ✅ Total |

**Nota:** O efeito usa `@property` que requer navegadores modernos.

---

## 🐛 Solução de Problemas

### Animação não funciona

✅ **Verifique:**
1. Você definiu `--background` no `:root`?
2. Você envolveu o conteúdo com `<span>`?
3. O arquivo CSS foi importado corretamente?

### Cores não aparecem

✅ **Verifique:**
1. A variável `--background` está definida?
2. Você está usando uma das classes de variante corretamente?

### Border não gira

✅ **Verifique:**
1. Seu navegador suporta `@property`? (Chrome 85+, Safari 15.4+)
2. O CSS foi carregado completamente?

### Exemplo de Debug

```html
<style>
  /* Debug: force background */
  :root {
    --background: #ffffff !important;
  }
  
  /* Debug: highlight span */
  .shiny-button > span {
    background: rgba(255,0,0,0.1); /* Deve aparecer vermelho claro */
  }
</style>
```

---

## 📝 Checklist de Implementação

Antes de usar, verifique:

- [ ] Copiei o arquivo `shiny-button.css`
- [ ] Importei o CSS no projeto
- [ ] Defini `--background` no `:root`
- [ ] Testei em navegador moderno (Chrome 85+)
- [ ] Sempre uso `<span>` dentro do botão
- [ ] Apliquei padding e font-size adequados

---

## 🎯 Casos de Uso Ideais

✅ **Recomendado para:**
- Botões de CTA (Call-to-Action)
- Botões de conversão importantes
- Landing pages
- Destacar ações principais
- Formulários de contato/vendas

❌ **Não recomendado para:**
- Botões pequenos de interface (ícones só)
- Listas com muitos botões (performance)
- Botões secundários (use estilos simples)

---

## 💡 Dicas Avançadas

### Performance
```css
/* O botão já usa essas otimizações: */
.shiny-button {
  isolation: isolate;        /* Cria contexto de empilhamento */
  will-change: transform;    /* Otimiza animações */
}
```

### Acessibilidade
```html
<!-- Sempre adicione labels descritivos -->
<button class="shiny-button" aria-label="Entrar em contato via WhatsApp">
  <span>Fale Conosco</span>
</button>
```

### Estados de Loading
```tsx
function LoadingButton() {
  const [loading, setLoading] = useState(false);
  
  return (
    <button 
      className="shiny-button px-8 py-3.5"
      disabled={loading}
      style={{ opacity: loading ? 0.6 : 1 }}
    >
      <span className="flex items-center gap-2">
        {loading && (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            {/* spinner icon */}
          </svg>
        )}
        <span>{loading ? 'Enviando...' : 'Enviar'}</span>
      </span>
    </button>
  );
}
```

---

## 📄 Licença

Este código é extraído do projeto pedped-website e pode ser usado livremente.

---

## 🤝 Suporte

Dúvidas? Problemas? 

1. Verifique a seção "Solução de Problemas"
2. Confira os exemplos em `exemplo-html.html` e `exemplo-react.tsx`
3. Teste no navegador usando as DevTools

---

## 📚 Estrutura do CSS

```
shiny-button.css
├── @property (variáveis CSS)
├── @keyframes (animações)
│   ├── border-spin (borda girando)
│   ├── shimmer (brilho deslizante)
│   └── breathe (respiração)
├── .shiny-button (classe principal)
├── .shiny-button::before (grade de pontos)
├── .shiny-button::after (brilho)
├── .shiny-button > span (conteúdo)
└── Variantes de cor
    ├── .shiny-green
    ├── .shiny-purple
    └── .shiny-red
```

---

**Feito com ❤️ para desenvolvedores**

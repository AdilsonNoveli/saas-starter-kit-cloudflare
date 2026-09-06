Vou analisar o código do botão animado com bordas para extrair o estilo que você precisa.Agora vou verificar o componente Button para ver a implementação do estilo animado das bordas:Agora preciso ver o CSS do botão "shiny" no arquivo de estilos globais:Perfeito! Aqui está o **código completo do estilo do botão animado com bordas** para você usar em outra aplicação:

## 🎨 Botão Animado com Bordas Girantes

### CSS/Tailwind (globals.css)

```css
/* Propriedades CSS customizadas para animação */
@property --gradient-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@property --gradient-angle-offset {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

/* Animações */
@keyframes border-spin {
  to {
    --gradient-angle: 360deg;
  }
}

@keyframes shimmer {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes breathe {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
  }
}

/* Classe do botão shiny */
.shiny-button {
  --gradient-angle: 0deg;
  --gradient-angle-offset: 0deg;
  --gradient-shine: #1d4ed8; /* Azul primário */
  position: relative;
  overflow: hidden;
  border-radius: 9999px; /* rounded-full */
  background:
    linear-gradient(var(--background), var(--background)) padding-box,
    conic-gradient(
      from calc(var(--gradient-angle) - var(--gradient-angle-offset)),
      transparent 0%,
      #1d4ed8 5%,
      var(--gradient-shine) 15%,
      #1d4ed8 30%,
      transparent 40%,
      transparent 100%
    ) border-box;
  border: 2px solid transparent;
  box-shadow: inset 0 0 0 1px rgba(29, 78, 216, 0.2);
  isolation: isolate;
  animation: border-spin 2.5s linear infinite;
}

/* Efeito de grade de pontos */
.shiny-button::before {
  content: '';
  pointer-events: none;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 0;
  width: calc(100% - 6px);
  height: calc(100% - 6px);
  background: radial-gradient(
    circle at 2px 2px,
    white 0.5px,
    transparent 0
  ) padding-box;
  background-size: 4px 4px;
  background-repeat: space;
  mask-image: conic-gradient(
    from calc(var(--gradient-angle) + 45deg),
    black,
    transparent 10% 90%,
    black
  );
  border-radius: inherit;
  opacity: 0.4;
}

/* Brilho interno animado */
.shiny-button::after {
  content: '';
  pointer-events: none;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(-50deg, transparent, #1d4ed8, transparent);
  mask-image: radial-gradient(circle at bottom, transparent 40%, black);
  opacity: 0.6;
  animation: shimmer 4s linear infinite;
}

/* Conteúdo do botão */
.shiny-button > span {
  position: relative;
  z-index: 2;
  display: inline-block;
}

/* Brilho respirando no hover */
.shiny-button > span::before {
  content: '';
  pointer-events: none;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: -1;
  width: calc(100% + 1rem);
  height: calc(100% + 1rem);
  box-shadow: inset 0 -1ex 2rem 4px #1d4ed8;
  opacity: 0;
  border-radius: inherit;
  animation: breathe 4.5s linear infinite;
}

/* Efeito de clique */
.shiny-button:active {
  transform: translateY(1px);
}
```

### HTML Exemplo

```html
<button class="shiny-button px-8 py-3.5 text-sm font-bold uppercase">
  <span>Seu Texto Aqui</span>
</button>
```

### React/Next.js Exemplo

```tsx
<button className="shiny-button px-8 py-3.5 text-sm font-bold uppercase rounded-xl">
  <span className="flex items-center gap-3">
    <Icon className="w-5 h-5" />
    <span>FALE COM ESPECIALISTA</span>
  </span>
</button>
```

### Personalizações

Para mudar a cor do brilho, ajuste a variável `--gradient-shine` e as cores nos gradientes:

```css
.shiny-button {
  --gradient-shine: #10b981; /* Verde */
}

/* Atualizar também nas animações */
.shiny-button::after {
  background: linear-gradient(-50deg, transparent, #10b981, transparent);
}

.shiny-button > span::before {
  box-shadow: inset 0 -1ex 2rem 4px #10b981;
}
```

### Notas Importantes

1. **Suporte de navegadores**: `@property` funciona em navegadores modernos (Chrome, Edge, Safari 15.4+)
2. **Variável `--background`**: Certifique-se de definir no `:root` para o fundo do botão
3. **Border radius**: Use `rounded-xl` ou `rounded-full` conforme necessário
4. **Performance**: A animação é otimizada com `isolation: isolate` e `pointer-events: none`

O efeito inclui:
- ✨ Borda girante com gradiente cônico
- 🌟 Grade de pontos animada
- 💫 Brilho deslizante (shimmer)
- 🫧 Efeito de respiração no texto
- 👆 Feedback de clique

----

Sim! O componente **Button** já é reutilizável e está localizado em `components/Button.tsx`. Ele aceita a variante `shiny` que aplica essa animação de bordas.

Vou te mostrar como usar esse componente em qualquer lugar da aplicação:

## ✅ Componente Button (já reutilizável)

### Uso Básico

```tsx
import Button from '@/components/Button';

// Botão com animação shiny
<Button variant="shiny" className="rounded-xl">
  <span>Meu Botão Animado</span>
</Button>
```

### Exemplos de Uso

#### 1. Botão Link Externo (como no CTA)
```tsx
import Button from '@/components/Button';
import WhatsAppIcon from '@/components/icons/WhatsAppIcon';

<Button
  as="link"
  href="https://wa.me/5511999999999"
  target="_blank"
  rel="noopener noreferrer"
  variant="shiny"
  className="rounded-xl px-8 py-3.5"
>
  <span className="flex items-center gap-3">
    <WhatsAppIcon size={20} />
    <span>FALE CONOSCO</span>
  </span>
</Button>
```

#### 2. Botão Link Interno (Next.js)
```tsx
import Button from '@/components/Button';

<Button
  as="link"
  href="/contato"
  variant="shiny"
  className="rounded-full"
>
  <span>Ir para Contato</span>
</Button>
```

#### 3. Botão de Formulário
```tsx
import Button from '@/components/Button';

<Button
  as="button"
  type="submit"
  variant="shiny"
  loading={isSubmitting}
  className="rounded-xl"
>
  <span>Enviar Formulário</span>
</Button>
```

#### 4. Outras Variantes do Button

```tsx
// Botão primário (preto)
<Button variant="primary">Primário</Button>

// Botão secundário (cinza claro)
<Button variant="secondary">Secundário</Button>

// Botão sucesso (azul)
<Button variant="success">Sucesso</Button>

// Botão perigo (vermelho)
<Button variant="danger">Perigo</Button>

// Botão sem estilo
<Button variant="no-color">Personalizado</Button>
```

### Props Disponíveis

```typescript
type ButtonProps = {
  as?: 'link' | 'button';           // Tipo do elemento
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 
            'danger' | 'info' | 'light' | 'dark' | 'link' | 
            'shiny' | 'no-color';     // Estilo visual
  loading?: boolean;                  // Estado de carregamento
  icon?: boolean;                     // Modo ícone quadrado
  className?: string;                 // Classes adicionais
  children: ReactNode;                // Conteúdo
  
  // Props de Link (quando as="link")
  href?: string;
  target?: string;
  rel?: string;
  
  // Props de Button (quando as="button")
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e) => void;
  disabled?: boolean;
}
```

### Dicas de Personalização

#### Border Radius Personalizado
```tsx
// Totalmente arredondado (pill)
<Button variant="shiny" className="rounded-full">
  <span>Pill Button</span>
</Button>

// Médio arredondamento
<Button variant="shiny" className="rounded-xl">
  <span>Rounded Button</span>
</Button>

// Pouco arredondamento
<Button variant="shiny" className="rounded-lg">
  <span>Soft Button</span>
</Button>
```

#### Tamanhos
```tsx
// Pequeno
<Button variant="shiny" className="px-4 py-2 text-xs">
  <span>Pequeno</span>
</Button>

// Médio (padrão)
<Button variant="shiny" className="px-8 py-3.5 text-sm">
  <span>Médio</span>
</Button>

// Grande
<Button variant="shiny" className="px-12 py-4 text-base">
  <span>Grande</span>
</Button>
```

#### Full Width
```tsx
<Button variant="shiny" className="w-full">
  <span>Largura Total</span>
</Button>
```

#### Com Ícones
```tsx
import { ArrowRight, Send } from 'lucide-react';

<Button variant="shiny" className="rounded-xl">
  <span className="flex items-center gap-2">
    <Send className="w-4 h-4" />
    <span>Enviar</span>
    <ArrowRight className="w-4 h-4" />
  </span>
</Button>
```

### ⚠️ Importante

Sempre envolva o conteúdo do botão com `<span>` quando usar `variant="shiny"` para que as animações funcionem corretamente:

```tsx
// ✅ CORRETO
<Button variant="shiny">
  <span>Meu Texto</span>
</Button>

// ❌ ERRADO (animações não funcionarão direito)
<Button variant="shiny">
  Meu Texto
</Button>
```

---

**o componente Button DEVE SER totalmente reutilizável e está disponível para uso em qualquer página da aplicação!** 🚀
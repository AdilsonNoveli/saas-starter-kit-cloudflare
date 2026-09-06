/**
 * SHINY BUTTON - EXEMPLO REACT/NEXT.JS
 * 
 * PASSOS PARA USAR:
 * 1. Copie shiny-button.css para seu globals.css ou import no componente
 * 2. Defina --background no :root do seu globals.css
 * 3. Use o componente abaixo ou a classe diretamente
 */

import React from 'react';

// ============================================================================
// EXEMPLO 1: USO DIRETO DA CLASSE
// ============================================================================

export function ExemploClasseDireta() {
  return (
    <button className="shiny-button px-8 py-3.5 text-sm font-bold uppercase rounded-xl">
      <span>Meu Botão</span>
    </button>
  );
}

// ============================================================================
// EXEMPLO 2: COMPONENTE REUTILIZÁVEL SIMPLES
// ============================================================================

interface ShinyButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'blue' | 'green' | 'purple' | 'red';
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'pill' | 'md' | 'lg';
  className?: string;
}

export function ShinyButton({
  children,
  onClick,
  type = 'button',
  variant = 'blue',
  size = 'md',
  rounded = 'pill',
  className = '',
}: ShinyButtonProps) {
  
  // Classes de variante de cor
  const variantClass = {
    blue: '',
    green: 'shiny-green',
    purple: 'shiny-purple',
    red: 'shiny-red',
  }[variant];
  
  // Classes de tamanho
  const sizeClass = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-8 py-3.5 text-sm',
    lg: 'px-12 py-4 text-base',
  }[size];
  
  // Classes de border radius
  const roundedClass = {
    pill: 'rounded-full',
    md: 'rounded-lg',
    lg: 'rounded-xl',
  }[rounded];
  
  return (
    <button
      type={type}
      onClick={onClick}
      className={`shiny-button ${variantClass} ${sizeClass} ${roundedClass} font-bold uppercase tracking-wider ${className}`}
    >
      <span className="flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}

// ============================================================================
// EXEMPLO 3: COMPONENTE COM SUPORTE A LINK (Next.js)
// ============================================================================

import Link from 'next/link';

interface ShinyButtonLinkProps extends Omit<ShinyButtonProps, 'onClick' | 'type'> {
  as?: 'button' | 'link';
  href?: string;
  target?: string;
  rel?: string;
}

export function ShinyButtonLink({
  children,
  as = 'button',
  href,
  target,
  rel,
  variant = 'blue',
  size = 'md',
  rounded = 'pill',
  className = '',
}: ShinyButtonLinkProps) {
  
  const variantClass = {
    blue: '',
    green: 'shiny-green',
    purple: 'shiny-purple',
    red: 'shiny-red',
  }[variant];
  
  const sizeClass = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-8 py-3.5 text-sm',
    lg: 'px-12 py-4 text-base',
  }[size];
  
  const roundedClass = {
    pill: 'rounded-full',
    md: 'rounded-lg',
    lg: 'rounded-xl',
  }[rounded];
  
  const classes = `shiny-button ${variantClass} ${sizeClass} ${roundedClass} font-bold uppercase tracking-wider inline-block ${className}`;
  
  if (as === 'link' && href) {
    if (target === '_blank') {
      return (
        <a href={href} target={target} rel={rel} className={classes}>
          <span className="flex items-center justify-center gap-2">
            {children}
          </span>
        </a>
      );
    }
    
    return (
      <Link href={href} className={classes}>
        <span className="flex items-center justify-center gap-2">
          {children}
        </span>
      </Link>
    );
  }
  
  return (
    <button className={classes}>
      <span className="flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
}

// ============================================================================
// EXEMPLOS DE USO
// ============================================================================

export function ExemplosDeUso() {
  return (
    <div className="flex flex-col gap-4 p-8">
      
      {/* Exemplo 1: Básico */}
      <ShinyButton>
        Botão Básico
      </ShinyButton>
      
      {/* Exemplo 2: Com ícone */}
      <ShinyButton>
        <>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
          <span>Com Ícone</span>
        </>
      </ShinyButton>
      
      {/* Exemplo 3: Verde, pequeno */}
      <ShinyButton variant="green" size="sm">
        Verde Pequeno
      </ShinyButton>
      
      {/* Exemplo 4: Roxo, grande, rounded */}
      <ShinyButton variant="purple" size="lg" rounded="lg">
        Roxo Grande
      </ShinyButton>
      
      {/* Exemplo 5: Vermelho */}
      <ShinyButton variant="red">
        Vermelho
      </ShinyButton>
      
      {/* Exemplo 6: Com onClick */}
      <ShinyButton onClick={() => alert('Clicou!')}>
        Com Ação
      </ShinyButton>
      
      {/* Exemplo 7: Link externo */}
      <ShinyButtonLink
        as="link"
        href="https://google.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        Link Externo
      </ShinyButtonLink>
      
      {/* Exemplo 8: Link interno (Next.js) */}
      <ShinyButtonLink as="link" href="/contato">
        Ir para Contato
      </ShinyButtonLink>
      
      {/* Exemplo 9: Submit de formulário */}
      <form onSubmit={(e) => { e.preventDefault(); alert('Enviado!'); }}>
        <ShinyButton type="submit">
          Enviar Formulário
        </ShinyButton>
      </form>
      
      {/* Exemplo 10: Com className customizado */}
      <ShinyButton className="w-full">
        Largura Total
      </ShinyButton>
      
    </div>
  );
}

// ============================================================================
// EXEMPLO COM LUCIDE REACT (ícones)
// ============================================================================

import { Send, ArrowRight, Check } from 'lucide-react';

export function ExemplosComIcones() {
  return (
    <div className="flex flex-col gap-4 p-8">
      
      <ShinyButton>
        <>
          <Send className="w-4 h-4" />
          <span>Enviar</span>
        </>
      </ShinyButton>
      
      <ShinyButton variant="green">
        <>
          <Check className="w-4 h-4" />
          <span>Confirmar</span>
          <ArrowRight className="w-4 h-4" />
        </>
      </ShinyButton>
      
    </div>
  );
}

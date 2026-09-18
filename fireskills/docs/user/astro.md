# Usar Specsfy com Astro

`$specsfy-specialist-astro` acrescenta ao fluxo do Specsfy as escolhas de
renderização, conteúdo, ilhas e performance próprias de um site Astro. A skill
usa a versão e a configuração do projeto, sem presumir o adapter ou o modo de
saída.

## Confirmar a detecção

O catálogo detecta Astro pela dependência `astro` em `package.json` ou pelos
arquivos `astro.config.mjs` e `astro.config.ts`. Descubra no projeto a versão,
o output mode, o adapter, as integrações e as fontes de conteúdo.

## Instalação

```bash
specsfy skills detect --project .
npx skills add https://github.com/promovaweb/specsfy \
  --skill specsfy-specialist-astro --agent universal --copy --full-depth
```

Quando todas as recomendações exibidas forem aplicáveis, `--detected` instala o
framework e os especialistas em uma única execução. Confira depois se
`specsfy-specialist-astro` aparece no catálogo instalado:

```bash
specsfy install --project . --detected
```

## Aplicar na spec

1. Conduza a ideia até a spec conforme o [primeiro projeto](getting-started.md).
2. Peça ao agente para usar `$specsfy-specialist-astro` na fatia ativa.
3. Classifique cada rota afetada como estática, sob demanda ou endpoint.
4. Mantenha HTML estático por padrão e escolha uma diretiva `client:*` somente
   para a interação que precisa de hidratação.
5. Modele conteúdo com schemas e relações explícitas. Defina cache, headers,
   imagens e metadados quando aplicáveis.
6. Crie testes derivados do Gherkin para rotas, conteúdo inválido e
   comportamento hidratado.
7. Execute `astro check`, a suíte do projeto, o build de produção e o preview no
   runtime do adapter disponível no projeto.

## O que o especialista acrescenta

- escolha explícita entre static, on-demand, island e endpoint.
- proteção contra transporte de dados sensíveis para ilhas.
- validação de slugs, relações e conteúdo.
- semântica, canonical, sitemap e dados estruturados.
- inspeção de payload cliente, Core Web Vitals e compatibilidade do adapter.

## Resultado esperado

A fatia preserva a fonte normativa Specsfy e torna observáveis a estratégia de
renderização, a hidratação necessária, os contratos de conteúdo e a validação
no runtime alvo.

## Limites

- não escolha SSR sem necessidade de sessão, personalização ou frescor.
- não suponha APIs de Node em adapters edge.
- não valide apenas no servidor de desenvolvimento.
- confirme scripts e comandos disponíveis no `package.json`.

Não use esse especialista para prescrever um adapter ou modo de saída sem
evidência. A versão, o adapter, os scripts e as integrações são comprovados
pelos manifests, lockfiles e pela configuração do projeto consumidor.

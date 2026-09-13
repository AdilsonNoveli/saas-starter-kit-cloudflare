import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    // Default 10s não é suficiente pro `setupNuxt()` (beforeAll) de cada spec
    // arquivo quando a suíte inteira roda com cache de transform frio —
    // produz falsos "Hook timed out" sob a suíte cheia, mesmo com o arquivo
    // passando 100% quando rodado isolado.
    hookTimeout: 60000,
    // Mesma causa do hookTimeout acima: sob a suíte cheia (cache de transform
    // frio, workers concorrentes), um teste individual às vezes estoura o
    // default de 5s sem nenhuma mudança de comportamento — roda em ~50ms
    // isolado. Falso "Test timed out", não teste lento de verdade.
    testTimeout: 15000,
    // `_docs/**` é material de referência (inclusive código-fonte de outro
    // projeto, com `tsconfig` próprio que aponta para uma raiz de monorepo que
    // não existe aqui). Coletar os testes dele quebra 13 arquivos na fase de
    // transform, sem nada a dizer sobre esta aplicação — e é o mesmo diretório
    // que o `eslint.config.mjs` já ignora, pela mesma razão.
    exclude: ['**/node_modules/**', '**/*.integration.test.ts', '.claude/worktrees/**', '**/_docs/**'],
  },
})

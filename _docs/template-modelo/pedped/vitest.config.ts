import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
      },
    },
    // `_docs/**` é material de referência (inclusive código-fonte de outro
    // projeto, com `tsconfig` próprio que aponta para uma raiz de monorepo que
    // não existe aqui). Coletar os testes dele quebra 13 arquivos na fase de
    // transform, sem nada a dizer sobre esta aplicação — e é o mesmo diretório
    // que o `eslint.config.mjs` já ignora, pela mesma razão.
    exclude: ['**/node_modules/**', '**/*.integration.test.ts', '.claude/worktrees/**', '**/_docs/**'],
  },
})

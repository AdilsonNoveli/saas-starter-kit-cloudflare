import { defineVitestConfig } from '@nuxt/test-utils/config'

/**
 * Config separada para testes de integração que exigem credenciais reais
 * (Supabase, webhook) e não devem rodar no `vitest run` padrão de CI.
 * Execute com `pnpm test:integration` após configurar `.env`.
 *
 * `environment: 'node'`, e não `'nuxt'`: nenhum dos testes de integração usa o
 * runtime do Nuxt — são `createClient` do Supabase + `dotenv`, e o único import
 * de `~/types/database.types` é `import type`, apagado na compilação. O
 * ambiente `nuxt` custava um `setupNuxt()` no `beforeAll` que **estoura o
 * `hookTimeout` padrão de 10 s com o build frio**: o portão falhava sem que
 * nenhuma asserção tivesse rodado, e a mensagem ("Hook timed out") não diz nada
 * sobre banco — parece falha de teste e é falha de boot.
 *
 * Teste novo que precise do runtime do Nuxt declara `// @vitest-environment nuxt`
 * no próprio arquivo, sem penalizar os outros.
 */
export default defineVitestConfig({
  test: {
    environment: 'node',
    include: ['**/*.integration.test.ts'],
  },
})

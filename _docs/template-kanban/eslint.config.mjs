// @ts-check
/**
 * @descricao: Configuração ESLint flat (plataforma Nuxt 4)
 * @objetivo: Encadeia o flat config gerado pelo `@nuxt/eslint` com os ignores
 *   específicos deste workspace. As regras vêm do módulo oficial do Nuxt e
 *   podem ser sobrescritas via `.override(...)` quando necessário.
 *
 *   Comandos:
 *     pnpm lint        → checa todo o projeto
 *     pnpm lint:fix    → aplica autofixes
 */
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Configs adicionais entram aqui (depois das do Nuxt).
  // Exemplo: ajustar regras para arquivos de teste.
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      // Testes usam expressões assertivas que podem confundir o linter.
      'no-unused-expressions': 'off',
    },
  },
  {
    // service role bypassa RLS — só `requireRole.ts` pode importar o client
    // direto; toda rota admin pega o client via `requireServiceRole`, que
    // força o guard de papel antes de devolvê-lo (ver server/utils/auth/requireRole.ts).
    files: ['server/api/admin/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: '#supabase/server',
          importNames: ['serverSupabaseServiceRole'],
          message: 'Use requireServiceRole() de server/utils/auth/requireRole.ts — ele força o guard de papel antes de devolver o client de service role.',
        }],
      }],
    },
  },
).prepend(
  // Ignores aplicados antes de qualquer regra — diretórios gerados,
  // dependências e artefatos não devem ser linted.
  {
    ignores: [
      '**/node_modules/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/dist/**',
      '**/.git/**',
      '**/.kiro/**',
      '**/.agent/**',
      '**/.turbo/**',
      '**/_docs/**',
      '**/docs/**',
      '**/_evo/**',
      '**/_evo-output/**',
      // Ferramental local não versionado (skills/scaffolding), fora do escopo
      // de qualidade da aplicação.
      '**/.claude/**',
      '**/_bmad/**',
      // Snapshots SQL não são código TS/JS
      'server/supabase/**',
    ],
  },
)

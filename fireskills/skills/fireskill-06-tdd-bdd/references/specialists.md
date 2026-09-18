# Especialistas para TDD orientado pelo BDD

Use o especialista da tecnologia para escolher seam, fixture e comandos
compatíveis (`fireskill-specialist-nuxt`, `-trpc`, `-drizzle`,
`-nuxt-authorization`, `-pinia`). Acrescente conforme o risco:

- acessibilidade: `fireskill-specialist-web-accessibility`;
- segurança: `fireskill-specialist-application-security`;
- performance/carga: `fireskill-specialist-performance-engineering`;
- dados/concorrência: `fireskill-specialist-postgres` e `-drizzle`;
- deploy/falhas: `-sst`, `-cloudflare-workers` ou `-delivery-engineering`.

Nenhum especialista pode substituir RED observado ou inventar comportamento.

Os especialistas ficam em `specialists/` deste repositório. Se o necessário não
estiver disponível para o agente, informe nome, finalidade e dependências e peça
autorização específica antes de instalar ou copiar; nunca carregue especialista
sem relação com a tarefa. Se já estiver disponível, anuncie a transição
automática e carregue-o na mesma conversa.

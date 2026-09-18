# Guia do catálogo Fireskills Specialists

Este módulo publica skills técnicas. Nenhuma delas integra o método base, cria
specs ou avança gates.

## Contrato

- Toda pasta usa `fireskill-specialist-<responsabilidade>`.
- `SKILL.md` (frontmatter `name`), pasta e `agents/openai.yaml` usam o mesmo
  nome; `name` do frontmatter é idêntico ao nome da pasta.
- Todo `SKILL.md` segue as seções `Quando usar`, `Fluxo`, `Padrões` (ou
  `Regras principais`), `Antipadrões`, `Validação` e `Skills relacionadas`,
  todas verificáveis e específicas do domínio.
- Detalhes extensos ficam em `references/`, a um nível da skill. Especialistas da
  stack Nuxfire trazem um `references/nuxfire-*.md` com **o que existe de fato no
  código**, cada afirmação com arquivo de evidência, e uma seção "o que NÃO
  existe".
- Fontes técnicas externas são oficiais ou padrões primários.
- Versões são descobertas em manifests e lockfiles do projeto, não assumidas.
- Skills relacionadas apontam umas para as outras sem duplicar normas; toda
  referência `$fireskill-specialist-<nome>` deve apontar para uma pasta que
  existe.
- `catalog.json` é a fonte de descoberta; toda pasta tem entrada e vice-versa.

## Limites

- Não criar `specs/`, `plan.md`, `tasks.md` ou fonte normativa paralela.
- Não instalar pacotes, alterar infraestrutura ou executar deploy sem autorização.
- Não copiar conteúdo, identidade ou configuração de outros catálogos sem
  registrar a origem e a licença.
- Não usar uma recomendação genérica contra o estado observado do projeto: o
  código do Nuxfire vence a documentação, inclusive esta.
- Não afirmar o que não foi verificado no código; quando o código contradiz um
  comentário ou documento, registrar a discrepância.

## Ao adicionar ou alterar um especialista

1. Leia o código real da área e registre a evidência (arquivo) no
   `references/nuxfire-*.md`.
2. Escreva o `SKILL.md` no formato acima e o `agents/openai.yaml`.
3. Atualize `catalog.json` e `README.md`.
4. Confira: `name` == pasta, nenhuma referência `$fireskill-*` quebrada, nenhum
   termo de stack que não existe no Nuxfire.

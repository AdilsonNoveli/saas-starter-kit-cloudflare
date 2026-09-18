# Guia do catálogo Specsfy Specialists

Este módulo publica skills opcionais. Nenhuma delas integra o método base,
cria specs, avança gates ou é instalada automaticamente na raiz do monorepo.

## Contrato

- Toda pasta usa `fireskill-specialist-<responsabilidade>`.
- `SKILL.md`, frontmatter, pasta e `agents/openai.yaml` usam o mesmo nome.
- Todo `SKILL.md` segue [templates/SKILL.template.md](templates/SKILL.template.md)
  e o padrão de qualidade descrito em [templates/GUIDE.md](templates/GUIDE.md):
  `Quando usar`, `Fluxo`, `Padrões`, `Antipadrões`, `Validação` e
  `Skills relacionadas`, todas verificáveis e específicas do domínio.
- Detalhes extensos ficam em `references/`, a um nível da skill;
  `references/standards.md` é o mínimo e cresce em arquivos adicionais quando
  o domínio exigir catálogo, checklist ou matriz de decisão próprios.
- Fontes técnicas externas são oficiais ou padrões primários.
- Versões são descobertas em manifests e lockfiles do projeto consumidor.
- Skills relacionadas apontam umas para as outras sem duplicar normas.
- `catalog.json` é a fonte executável de descoberta e instalação.

## Limites

- Não criar `specs/`, `plan.md`, `tasks.md` ou fonte normativa paralela.
- Não instalar pacotes, alterar infraestrutura ou executar deploy sem autorização.
- Não copiar conteúdo, identidade, configuração ou referências de outros catálogos.
- Não usar uma recomendação genérica contra o estado observado do projeto.

## Desenvolvimento

Inicialize novas skills com `init_skill.py`, escreva o contrato em
`tests/`, observe RED, implemente e valide:

```bash
python3 -B -m unittest discover -s tests -p 'test_*.py'
uv run --quiet --with behave behave tests/features --no-capture
uv run --quiet --with pyyaml python \
  /home/luizeof/.codex/skills/.system/skill-creator/scripts/quick_validate.py \
  fireskill-specialist-<nome>
```

Use `python3 -B` para não criar caches. Revise o diff do módulo a partir da raiz Git única.

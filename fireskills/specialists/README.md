# Fireskills Specialists

<!-- markdownlint-disable MD033 -->
<p align="center">
  <picture>
    <source srcset="../brand/logo/icon.svg" type="image/svg+xml">
    <img src="../brand/logo/icon.png" alt="Logo do Specsfy" width="128">
  </picture>
</p>
<!-- markdownlint-enable MD033 -->

Catálogo oficial de skills técnicas opcionais do Specsfy. O prefixo
`fireskill-specialist-` distingue contexto especializado das skills
skills base que executam a metodologia.

Os especialistas são instalados sob demanda no projeto consumidor:

```bash
specsfy skills list
specsfy skills detect
specsfy skills install fireskill-specialist-laravel
```

Para implementar interfaces React a partir de referências copiáveis, instale e
use `fireskill-specialist-react-ui-components` em conjunto com
`fireskill-specialist-design-system` e `fireskill-specialist-ui-design`. O CLI
resolve e instala essas dependências declaradas no catálogo automaticamente.

Para criar ou alterar uma interface de sistema, use primeiro
`fireskill-specialist-interface-experience`. Ela carrega o
`fireskill-specialist-design-system`, examina o sistema e a stack já existentes,
conduz as perguntas sobre telas e encaminha UX, UI e a tecnologia correta para
a entrega.

`fireskill-specialist-design-system` mantém `DESIGNSYSTEM.MD` no projeto
consumidor. O `$fireskill-setup` cria o arquivo a partir do template quando ele
está ausente. Quando a pessoa não informa direção visual, a skill aplica
defaults para SaaS: `DataGrid` em listas com detalhe clicável por linha,
`DetailLists` em detalhes, `PageHeader` nas superfícies e seções de formulário
em duas colunas responsivas em criar e editar, com `Breadcrumb` em todas as
telas e o nome da equipe ativa visível. Primitives shadcn/ui e
blocos gratuitos ReUI podem acelerar a composição; o registro local de
componentes e telas continua em `INTERFACE.md`.

O catálogo cobre a stack Promovaweb, design de interfaces, qualidade,
arquitetura, operação e disciplinas de engenharia. A referência completa de
instalação e uso pertence à
[`documentação do Specsfy`](../docs/).

Para release, deploy ou inclusão de servidor, use somente
`fireskill-specialist-deploy`. A orquestradora prepara o `SEMVER`, inspeciona a
aplicação, mantém o inventário Ansible, testa conexões, sincroniza chaves
públicas para a conta `deploy` e chama Docker Swarm, Ansible e os demais
especialistas necessários. O projeto consumidor recebe o wrapper `./deploy`
com as ações `check-hosts`, `secrets`, `sync-keys` e `run`.

O comando `./deploy run` mantém a senha manual no terminal. Para execução pela
IA, prepare uma fonte externa com `./deploy configure-vault` e use
`./deploy run --non-interactive`. Arquivos, scripts de cofre e configurações
nativas do Ansible também são aceitos. O guia de
[operações de deploy](../docs/user/deploy-vault.md) explica cadastro,
permissões, troca, remoção e migração dos scripts existentes.

Nenhuma skill deste módulo é instalada ou executada pela raiz do
[`promovaweb/specsfy`](https://github.com/promovaweb/specsfy).

## Validar

```bash
python3 -B -m unittest discover -s tests -p 'test_*.py'
uv run --quiet --with behave behave tests/features --no-capture
```

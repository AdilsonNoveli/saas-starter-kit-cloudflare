# Privacidade e retenção

## Classificação

| Campo | Valor |
| --- | --- |
| Natureza | normativo |
| Escopo | classificação, retenção e exposição de dados |
| Autoridade | política mínima de privacidade do repositório |

## Papel

Definir como classificar, reter, excluir e observar dados sem expor conteúdo
sensível em documentos, logs ou evidências.

## Como usar

Leia ao coletar research, registrar comandos, introduzir dados de usuário ou
adicionar integração externa.

## Atualize quando

- uma classe de dados for introduzida.
- retenção, exclusão ou acesso mudar.
- logs ou research passarem a carregar informação sensível.

## Não use para

- armazenar segredo, token ou dado pessoal.
- substituir política jurídica da organização.
- declarar dado seguro sem verificação.

## Fonte da verdade e precedência

A spec da fatia define requisitos de privacidade aplicáveis. Configuração,
código e testes demonstram enforcement. Este documento registra a política
transversal mínima do repositório.

## Classificação dos dados

<!-- markdownlint-disable MD013 -->
| Classe | Exemplos | Regra |
| --- | --- | --- |
| Público | método e documentação publicada | pode ser versionado |
| Interno | decisões e evidências de desenvolvimento | versionar somente quando necessário |
| Sensível | credenciais, dados pessoais, segredos | não incluir em specs, research, logs ou fixtures reais |
| Operacional local | preferência e cache de atualização do CLI | restringir ao usuário e não incluir conteúdo de projeto |
<!-- markdownlint-enable MD013 -->

Capturas em `specs/inbox/` são conteúdo interno versionado e preservam o input
integral. A skill faz triagem silenciosa de segredos evidentes antes da escrita.
ao detectar credencial, token, chave privada ou dado pessoal sensível, não
persiste o arquivo e não copia o valor para logs ou mensagens.

## Retenção e exclusão

- O Git preserva histórico. Não versione material que exija expurgo comum.
- Research externo deve registrar origem, licença, data e propósito.
- Dados sensíveis acidentais exigem interrupção, contenção e procedimento
  seguro de remoção.
- Retenção específica de produto pertence à spec que introduz o dado.

## Logs e exposição

- Comandos e evidências omitem segredos e dados pessoais.
- Fixtures usam dados sintéticos.
- Mensagens de erro expõem regra e caminho, não conteúdo sensível.
- Saída JSON obedece às mesmas restrições da saída humana.
- `~/.specsfy/cli.json` guarda somente configurações e metadados de tags, usa
  permissão `0600` e não recebe credenciais, telemetria ou fontes do projeto.
- A autenticação da API vem de `GH_TOKEN`, `GITHUB_TOKEN` ou da sessão do
  GitHub CLI e permanece fora dos arquivos administrados pelo Specsfy.

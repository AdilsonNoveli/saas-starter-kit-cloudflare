# Contexto de engenharia

<!-- markdownlint-disable MD033 -->
<p align="center">
  <picture>
    <source srcset="../../../../brand/logo/icon.svg" type="image/svg+xml">
    <img src="../../../../brand/logo/icon.png" alt="Logo do Specsfy" width="128">
  </picture>
</p>
<!-- markdownlint-enable MD033 -->

## Classificação

| Campo | Valor |
| --- | --- |
| Natureza | índice |
| Escopo | práticas e ferramentas de engenharia |
| Autoridade | roteamento para escolhas e políticas de implementação |

## Papel

Direcionar pessoas e agentes para o contexto exato de stack, dependências,
convenções ou testes sem exigir a leitura de todo o diretório.

## Como usar

Escolha uma folha pela mudança observável. Leia mais de uma somente quando a
decisão atravessar seus escopos.

## Atualize quando

- uma folha de engenharia for criada, consolidada ou removida.
- o gatilho de leitura ou atualização de uma folha mudar.
- um assunto adquirir responsabilidade independente.

## Não use para

- repetir regras das folhas.
- listar todos os arquivos ou pacotes.
- registrar comportamento de feature.

## Fonte da verdade e precedência

Este índice governa apenas o roteamento. As folhas governam decisões
transversais. Manifests, lockfiles, testes e configurações mostram o estado
executável.

## Roteamento de engenharia

| Assunto | Leia quando | Atualize quando |
| --- | --- | --- |
| Tecnologias estruturais | [stack.md](stack.md) | uma escolha ou responsabilidade de stack mudar |
| Dependências | [packages.md](packages.md) | política ou pacote estrutural mudar |
| Padrões de implementação | [conventions.md](conventions.md) | convenção transversal mudar |
| Estratégia de verificação | [testing.md](testing.md) | runner, nível de teste ou gate mudar |

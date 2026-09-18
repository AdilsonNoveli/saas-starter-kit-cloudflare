# Contexto de dados

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
| Escopo | persistência, evolução e privacidade |
| Autoridade | roteamento para políticas transversais de dados |

## Papel

Direcionar mudanças de armazenamento, ownership, migrations e privacidade para
o menor contexto aplicável.

## Como usar

Selecione uma folha existente. Mantenha migrations neste índice enquanto o
projeto não possuir mecanismo ou política independente de evolução de schema.

## Atualize quando

- uma folha de dados for criada, consolidada ou removida.
- um armazenamento ou classe de dados nova surgir.
- migrations adquirirem implementação ou política independente.

## Não use para

- reproduzir schemas, tabelas ou campos.
- armazenar SQL de uma feature.
- declarar retenção específica sem spec.

## Fonte da verdade e precedência

Este índice governa o roteamento. As folhas governam políticas transversais.
schemas e migrations são fontes executáveis, e cada mudança pertence à spec da
fatia.

## Roteamento de dados

| Assunto | Leia quando | Atualize quando |
| --- | --- | --- |
| Armazenamento, ownership e invariantes | [persistence.md](persistence.md) | fonte de verdade ou isolamento mudar |
| Classificação, retenção e exposição | [privacy.md](privacy.md) | política de dados ou logs mudar |
| Migrations | esta seção | ainda não existe mecanismo independente |

## Migrations

O Specsfy não possui banco ou migrations de runtime. Quando uma fatia introduzir
persistência evolutiva, ela deve definir formato anterior e posterior,
compatibilidade, validação e rollback em sua spec. Uma folha própria será criada
somente quando houver política transversal sustentada por arquivos executáveis.

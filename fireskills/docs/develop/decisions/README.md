# Decisões arquiteturais

<!-- markdownlint-disable MD033 -->
<p align="center">
  <picture>
    <source srcset="../../../brand/logo/icon.svg" type="image/svg+xml">
    <img src="../../../brand/logo/icon.png" alt="Logo do Specsfy" width="128">
  </picture>
</p>
<!-- markdownlint-enable MD033 -->

## Classificação

| Campo | Valor |
| --- | --- |
| Natureza | índice |
| Escopo | histórico de decisões arquiteturais |
| Autoridade | ciclo de vida e índice de ADRs |

## Papel

Indexar ADRs que preservam contexto, alternativas e consequências de decisões
arquiteturais materiais sem poluir a descrição da arquitetura vigente.

## Como usar

Consulte quando precisar entender por que uma decisão transversal foi tomada.
Para o estado atual, comece pela
[arquitetura vigente](../context/architecture/README.md).

## Atualize quando

- uma decisão arquitetural material for aceita.
- uma decisão existente for substituída.
- o estado ou link de um ADR mudar.

## Não use para

- registrar toda escolha reversível.
- alterar arquitetura apenas editando o histórico.
- substituir requisitos, tarefas ou evidências da spec.

## Fonte da verdade e precedência

ADRs são históricos e imutáveis após aceitos, salvo correções editoriais. O
contexto em `docs/develop/context/` descreve o estado vigente. A spec autoriza
a mudança. Código e testes demonstram a implementação.

## Índice de decisões

Nenhum ADR separado foi publicado. As decisões normativas das fatias atuais
permanecem em suas respectivas specs. O primeiro ADR será criado quando uma
decisão transversal precisar preservar alternativas e consequências além da
fatia que a introduziu.

## Ciclo de vida de um ADR

```text
Proposto → Aceito → Substituído
             ↘ Rejeitado
```

- `Proposto` não autoriza implementação.
- `Aceito` registra decisão já aprovada na spec correspondente.
- `Substituído` aponta para o ADR sucessor.
- `Rejeitado` preserva a alternativa avaliada sem torná-la vigente.

## Formato de um ADR

Um ADR usa nome `ADR-NNN-titulo-kebab-case.md` e contém:

1. estado.
2. contexto e forças.
3. decisão.
4. alternativas consideradas.
5. consequências e riscos.
6. estratégia de adoção ou reversão.
7. links para spec, contexto e evidência.

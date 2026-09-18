# Consultar o estado com `specsfy-progress`

Esta skill lê todas as specs e apresenta uma visão geral de gates, tarefas,
checklists, falhas que impedem avanço e próximo trabalho. Ela não altera
nenhum estado.

## Quando usar

Use para saber quanto falta, qual falha impede uma entrega, qual tarefa está
pronta ou quais specs foram concluídas.

## Como descrever a tarefa

Para receber uma síntese na conversa, descreva o projeto que deseja consultar:

```text
Use $specsfy-progress para mostrar o progresso do projeto.
```

No terminal, use o CLI para obter a mesma leitura das fontes canônicas:

```text
specsfy progress --project .
```

## Exemplo passo a passo

1. A skill lê `specs/<estado>/*/spec.md`.
2. Calcula o estado a partir de gates e checkboxes.
3. Não consulta um relatório paralelo.
4. Apresenta:

```text
Specs: 2
Complete: 1
Implementing: 1
Tarefas: 7 de 10 concluídas
Próximo trabalho: T004 da spec 0004-recuperar-senha
Pendências impeditivas: nenhuma
```

Se os metadados estiverem incoerentes, o relatório mostra a pendência em vez de
inventar um percentual confiável.

## O que esperar

- leitura somente das fontes canônicas.
- totais de specs e tarefas.
- gates pendentes.
- falhas impeditivas e próximo trabalho.
- saída humana ou JSON pelo CLI.

## Erros comuns

- alterar checkboxes durante a consulta.
- manter um segundo arquivo de progresso.
- calcular conclusão só pelo número de arquivos.
- esconder spec inválida do relatório.
- confundir progresso com autorização para implementar.

## Próximo passo

Abra a página da skill indicada pelo próximo trabalho. Para acompanhar
continuamente no terminal, use:

```text
specsfy progress --project . --watch
```

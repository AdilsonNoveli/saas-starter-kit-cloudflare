# Descobrir o que o sistema precisa guardar com `specsfy-data-discovery`

Use `$specsfy-data-discovery` (`specsfy-data-discovery`) quando uma jornada
depender de informações que o sistema precisa lembrar, mostrar para alguém,
alterar ou apagar. A conversa usa palavras do seu produto e salva apenas o que
você confirmar em `.specsfy/DATABASE.md`.

## Quando usar

Use durante o backlog, depois de uma Inbox, durante a descoberta de `MVP.md` ou antes de
consolidar uma spec. A skill é útil quando ainda não está claro o que cada
pedido, pessoa, atendimento ou outro item do produto precisa guardar.

## Como descrever a tarefa

```text
Use $specsfy-data-discovery para entender o que nosso sistema precisa lembrar
sobre cada reserva, quem consulta essas informações e quando elas deixam de
ser necessárias.
```

## Exemplo passo a passo

```text
Inbox sobre reservas → conversa sobre informações a guardar → DATABASE.md
→ backlog refinado
```

O agente pode perguntar o que você precisa lembrar sobre uma reserva, quem
pode consultar ou corrigir as informações e quando uma reserva deixa de valer.
Você responde com a situação real do seu trabalho, sem precisar nomear partes
internas do sistema.

Depois, ele sugere a forma mais adequada para registrar cada informação, como
texto curto, data, valor em dinheiro ou escolha entre opções. A sugestão só é
salva depois que você confirmar que ela atende ao uso real.

## O que esperar

Cada resposta confirmada aparece na seção `Informações a guardar confirmadas`
de `.specsfy/DATABASE.md`. Ela informa para que a informação serve, o que deve
ser lembrado, o formato sugerido, o que fica ligado, quem usa e quando muda ou
sai do sistema.

## Erros comuns

- tentar escolher a tecnologia antes de explicar a necessidade do produto;
- tratar uma hipótese como informação confirmada;
- copiar dados reais de clientes, senhas ou chaves para a conversa;
- pular a conversa quando a jornada depende de informações guardadas.

## Próximo passo

Volte ao `$specsfy-02-backlog` para concluir o refinamento ou ao
`$specsfy-03-specify` para consolidar a fonte normativa da entrega.

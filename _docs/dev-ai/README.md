# _docs/dev-ai — guia obrigatório para LLMs e devs

Esta pasta é o **caminho a seguir** para quem for trabalhar nesta base. Leia
antes de mexer em `infra/`, em versão de dependência, ou em qualquer coisa
relacionada a build/deploy.

| Arquivo | Para quê |
|---|---|
| [`lessons-learned.md`](./lessons-learned.md) | Armadilhas reais já enfrentadas neste projeto — cada uma custou pelo menos um deploy quebrado. **Comece por aqui.** |

## Como manter

Toda vez que um erro custar um ciclo de deploy, registre em
`lessons-learned.md` no mesmo formato: **sintoma (mensagem de erro literal) →
causa → correção → como verificar**. A mensagem de erro literal é o que permite
a um LLM futuro reconhecer o problema por busca.

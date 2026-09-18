# Documentação do Specsfy

<!-- markdownlint-disable MD033 -->
<p align="center">
  <picture>
    <source srcset="../brand/logo/icon.svg" type="image/svg+xml">
    <img src="../brand/logo/icon.png" alt="Logo do Specsfy" width="128">
  </picture>
</p>
<!-- markdownlint-enable MD033 -->

A documentação oficial possui dois percursos. Escolha de acordo com o que você
quer fazer:

| Percurso | Público | Comece aqui |
| --- | --- | --- |
| **Usuário** | pessoas que querem instalar e usar o Specsfy em um projeto | [Guia do usuário](user/README.md) |
| **Desenvolvimento** | agentes e pessoas que contribuem, implementam ou modificam o framework | [Guia de desenvolvimento](develop/README.md) |

Se esta é sua primeira vez, siga o [guia do usuário](user/README.md). Ele usa
linguagem simples, mostra uma jornada completa e possui uma página com exemplos
para cada skill base.

Se você precisa entender decisões, arquitetura, testes, código do CLI ou como
alterar uma skill, siga o [guia de desenvolvimento](develop/README.md).

## Fonte da verdade

Os guias explicam o estado atual, mas não substituem as fontes executáveis:

- `skills/` implementa a metodologia.
- `cli/` implementa instalação, comandos e TUI.
- `specialists/` mantém o catálogo técnico opcional.
- `docs/develop/context/` registra decisões transversais.
- testes e manifests comprovam o comportamento implementado.

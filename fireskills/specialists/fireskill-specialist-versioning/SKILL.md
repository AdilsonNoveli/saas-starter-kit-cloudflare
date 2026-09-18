---
name: fireskill-specialist-versioning
description: Preparar e conferir a versão do Nuxfire pelo arquivo VERSION da raiz e, com autorização, a tag Git v<versão>. Use ao preparar uma release, junto de `$fireskill-specialist-delivery-engineering` e `$fireskill-specialist-sst`.
---

# Versionamento

## O que existe

- `VERSION` na raiz: uma linha `MAJOR.MINOR.PATCH` (hoje `0.1.0`). `fireskills/VERSION` é a versão do próprio Fireskills.
- Deploy: `bun run deploy -- --stage <stage>` (`$fireskill-specialist-sst`).

## O que NÃO existe

Arquivo `SEMVER`, imagem Docker/OCI, registry, changelog e tags Git no repositório. Não crie nada disso sem pedido.

## Regras

- `patch`: correção compatível; `minor`: capacidade compatível; `major`: mudança incompatível.
- Classifique a mudança, proponha a próxima versão e só então grave.
- Preparar a versão localmente é livre. Tag Git, GitHub Release e deploy exigem autorização explícita.
- Nunca reutilize uma versão já publicada; incremente.

## Comandos

```bash
node fireskills/specialists/fireskill-specialist-versioning/scripts/semver.mjs current
node fireskills/specialists/fireskill-specialist-versioning/scripts/semver.mjs bump patch
node fireskills/specialists/fireskill-specialist-versioning/scripts/semver.mjs verify 0.1.1
```

## Validação

- `current` e `verify` confirmam o conteúdo de `VERSION`.
- Rode `bun run test` antes de propor a tag.
- A tag, se autorizada, é `v<VERSION>` e aponta para o commit testado.

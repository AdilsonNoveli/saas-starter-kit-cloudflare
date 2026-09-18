# Playbook de Lições Aprendidas (Fireskills)

> **Arquivo gerado automaticamente pelo motor de lições do Fireskills.**
> Regras preventivas extraídas de regressões, mutações e falhas de teste passadas.
> Não edite este arquivo manualmente. Use `bun run fireskill lesson add`.

## Resumo

- **Confirmadas (ativas)**: 1
- **Candidatas (em observação)**: 0
- **Em Quarentena**: 0

---

## 🛡️ Lições Confirmadas (Obrigatórias no Planejamento e Código)

### L-001: Uso de AWS S3 em vez de Cloudflare R2

- **Regra Preventiva**: Imagens e arquivos no Nuxfire usam Cloudflare R2 (hubBlob do NuxtHub), nunca AWS S3.
- **Sinal de Origem**: `gate_fail` (Falha de typecheck, linter ou teste unitário em gate)
- **Ocorrências**: 2 (fontes: audit-2026-09-18, pr-104)
- **Última Atualização**: 2026-09-18

---

## 🧪 Lições Candidatas (Aguardando Reincidência)

_Nenhuma candidata pendente._

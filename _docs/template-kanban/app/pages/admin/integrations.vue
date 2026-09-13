<script setup lang="ts">
import { navigateTo } from 'nuxt/app'

// Rota antiga (item do dropdown do menu, antes de virar aba de Configurações).
// Mantida como redirect — não como 404 — para não quebrar favoritos e links
// já salvos por quem usava o sistema antes desta tela migrar para
// `/admin/settings/integrations` (mesmo padrão de `admin/users/index.vue`).
await navigateTo('/admin/settings/integrations', { replace: true })
</script>

<template><div /></template>

<script setup lang="ts">
import { navigateTo } from 'nuxt/app'

// A aba de usuários virou rota própria no split de `/admin/settings` (§8.19).
await navigateTo('/admin/settings/usuarios', { replace: true })
</script>

<template><div /></template>

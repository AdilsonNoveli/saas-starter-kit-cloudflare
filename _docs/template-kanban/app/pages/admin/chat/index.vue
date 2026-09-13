<!--
  @descricao: Página principal do Atendimento por Chat do Painel Administrativo.
  @rota: /admin/chat
  @layout: admin
-->

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import ChatContainer from '~/components/chat/ChatContainer.vue'
import { useWhatsappStatus } from '~/composables/useWhatsappStatus'

definePageMeta({
  layout: 'admin',
})

// Sem WhatsApp conectado não existe conversa nenhuma — a página não deve
// funcionar mesmo se acessada direto pela URL (o menu já esconde o ícone,
// isso cobre quem digita/tem a URL salva). `null` (ainda carregando) não
// redireciona precipitadamente.
const { whatsappConfigurado, fetch: fetchWhatsappStatus } = useWhatsappStatus()
onMounted(() => {
  void fetchWhatsappStatus()
})
watch(whatsappConfigurado, (value) => {
  if (value === false) navigateTo('/admin/dashboard')
})
</script>

<template>
  <div class="w-full h-full flex flex-col bg-surface overflow-hidden">
    <ChatContainer v-if="whatsappConfigurado" />
  </div>
</template>

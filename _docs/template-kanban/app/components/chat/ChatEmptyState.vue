<!--
  @descricao: Estado vazio / tela de boas-vindas estilo WhatsApp Web.
  @responsabilidade: Exibido quando nenhuma conversa foi selecionada na inbox.
-->

<script setup lang="ts">
import { MessageCircle, ShieldCheck, Zap, Bot } from '@lucide/vue'
</script>

<template>
  <div class="h-full flex-1 flex flex-col items-center justify-center p-8 bg-surface-raised/40 text-center select-none">
    <div class="max-w-md flex flex-col items-center">
      <!-- Ícone principal com gradiente suave -->
      <div class="w-20 h-20 rounded-2xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center shadow-sm mb-6">
        <MessageCircle class="w-10 h-10" />
      </div>

      <!-- Título e Descrição -->
      <h2 class="text-xl font-bold text-text-primary mb-2">
        Central de Atendimento Unificada
      </h2>
      <p class="text-sm text-text-muted leading-relaxed mb-8">
        Selecione uma conversa ao lado para acompanhar o atendimento em tempo real, enviar mensagens ou assumir o controle do Agente IA.
      </p>

      <!-- Destaques das Funcionalidades -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full text-left">
        <div class="p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs">
          <div class="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
            <Bot class="w-4 h-4" />
          </div>
          <h3 class="text-xs font-semibold text-text-primary mb-1">
            Agente IA Ativo
          </h3>
          <p class="text-[11px] text-text-muted leading-tight">
            Responde 24/7 com catálogo, estoques e pedidos.
          </p>
        </div>

        <div class="p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs">
          <div class="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
            <Zap class="w-4 h-4" />
          </div>
          <h3 class="text-xs font-semibold text-text-primary mb-1">
            Transbordo Direto
          </h3>
          <p class="text-[11px] text-text-muted leading-tight">
            Assuma conversas em 1 clique sem perder o contexto.
          </p>
        </div>

        <div class="p-3.5 rounded-xl bg-surface border border-border/80 shadow-xs">
          <div class="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
            <ShieldCheck class="w-4 h-4" />
          </div>
          <h3 class="text-xs font-semibold text-text-primary mb-1">
            Canal Agnóstico
          </h3>
          <p class="text-[11px] text-text-muted leading-tight">
            Pronto para WhatsApp, Web, Instagram e outros.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

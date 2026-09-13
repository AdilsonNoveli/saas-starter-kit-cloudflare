/**
 * @descricao: Plugin client-side que inicializa o sistema de tema
 * @objetivo: Garantir que `useTheme()` seja chamado UMA vez no escopo
 *   persistente do app (não em um layout que possa desmontar). Assim, o
 *   watcher interno que sincroniza `<html class="dark">` permanece vivo
 *   durante toda a sessão, independentemente de troca de layout/rota.
 *
 *   O script inline em `nuxt.config.ts` continua responsável pelo primeiro
 *   paint (anti-FOUC); este plugin assume o controle a partir da
 *   hidratação para refletir mudanças do toggle de tema.
 */

import { defineNuxtPlugin } from 'nuxt/app'
import { useTheme } from '~/composables/useTheme'

export default defineNuxtPlugin(() => {
  // Apenas chamar useTheme() basta — ele registra (uma única vez)
  // o watcher de classList em escopo de módulo.
  useTheme()
})

<script setup lang="ts">
/**
 * @descricao: Background animado com grid pattern drift, gradientes e textura de grão.
 * @objetivo: Prover um efeito de profundidade premium e dinâmico, ajustável via props.
 *   Totalmente compatível com dark mode e customizável sem valores hardcoded.
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    gridSize?: string
    lightGridColor?: string
    darkGridColor?: string
    lightGridOpacity?: number
    darkGridOpacity?: number
    showGrid?: boolean
    showGrain?: boolean
    showBlobs?: boolean
    grainOpacity?: number
    blob1Color?: string
    blob2Color?: string
    blob3Color?: string
  }>(),
  {
    gridSize: '40px 40px',
    lightGridColor: 'rgba(0, 0, 0, 0.08)',
    darkGridColor: 'rgba(255, 255, 255, 0.05)',
    lightGridOpacity: 1.0,
    darkGridOpacity: 1.0,
    showGrid: true,
    showGrain: true,
    showBlobs: true,
    grainOpacity: 0.03,
    blob1Color: 'rgba(14, 70, 226, 0.1)', // #0e46e2 with 10% opacity
    blob2Color: 'rgba(68, 172, 238, 0.1)', // #44acee with 10% opacity
    blob3Color: 'rgba(34, 181, 115, 0.08)', // #22b573 with 8% opacity
  }
)

const lightGridStyle = computed(() => ({
  backgroundSize: props.gridSize,
  backgroundImage: `linear-gradient(to right, ${props.lightGridColor} 1px, transparent 1px), linear-gradient(to bottom, ${props.lightGridColor} 1px, transparent 1px)`,
}))

const darkGridStyle = computed(() => ({
  backgroundSize: props.gridSize,
  backgroundImage: `linear-gradient(to right, ${props.darkGridColor} 1px, transparent 1px), linear-gradient(to bottom, ${props.darkGridColor} 1px, transparent 1px)`,
}))

const grainStyle = computed(() => ({
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
}))
</script>

<template>
  <div class="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
    <!-- Grid Pattern with Drift Animation (Light Mode) -->
    <div
      v-if="showGrid"
      class="absolute inset-0 dark:hidden animate-grid-drift"
      :style="[lightGridStyle, { opacity: lightGridOpacity }]"
    />

    <!-- Grid Pattern with Drift Animation (Dark Mode) -->
    <div
      v-if="showGrid"
      class="absolute inset-0 hidden dark:block animate-grid-drift"
      :style="[darkGridStyle, { opacity: darkGridOpacity }]"
    />

    <template v-if="showBlobs">
      <!-- Ambient Color Blobs -->
      <div 
        class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[100px] animate-float opacity-40 mix-blend-screen"
        :style="{ backgroundColor: blob1Color }"
      />
      <div
        class="absolute bottom-[0%] right-[-10%] w-[40%] h-[60%] rounded-full blur-[120px] animate-float opacity-30 mix-blend-screen"
        :style="{ backgroundColor: blob2Color, animationDelay: '-5s' }"
      />
      <div 
        class="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full blur-[90px] animate-pulse-glow opacity-30 mix-blend-screen"
        :style="{ backgroundColor: blob3Color }"
      />
    </template>

    <!-- Grain Texture Overlay -->
    <div
      v-if="showGrain"
      class="absolute inset-0"
      :style="[grainStyle, { opacity: grainOpacity }]"
    />
  </div>
</template>

<style scoped>
@keyframes grid-drift {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 40px 40px;
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.05);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.2;
    transform: scale(0.95);
  }
  50% {
    opacity: 0.4;
    transform: scale(1.05);
  }
}

.animate-grid-drift {
  animation: grid-drift 30s linear infinite;
}

.animate-float {
  animation: float 20s ease-in-out infinite;
}

.animate-pulse-glow {
  animation: pulse-glow 15s ease-in-out infinite;
}
</style>

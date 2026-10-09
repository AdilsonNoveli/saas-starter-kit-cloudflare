<template>
  <div>
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileChange"
    />

    <!--
      Empty: dashed square with a centered plus, click-to-upload — same
      affordance as the dashed "create team" card, applied here to mean
      "add an image" instead of "add an entity". Square, not round — team
      logos (TeamSwitcherDropdown, TeamSwitcher) are never circular, and an
      avatar is the same kind of identity image.
      Filled: the image, with a dark hover overlay carrying two small
      buttons — plus to replace, trash to remove — instead of a dropdown
      menu hidden behind a pencil icon.
    -->
    <button
      type="button"
      class="group relative flex items-center justify-center rounded-md overflow-hidden transition-colors"
      :class="[
        sizeClass,
        !src && !disabled && 'border-2 border-dashed border-default hover:border-accented text-dimmed hover:text-default cursor-pointer',
        !src && disabled && 'border-2 border-dashed border-default text-dimmed',
        disabled ? 'cursor-default' : 'cursor-pointer',
      ]"
      :disabled="uploading || disabled"
      @click="!disabled && !src && triggerUpload()"
    >
      <UAvatar v-if="src" :src="src" :alt="alt" :ui="{ root: sizeClass + ' text-3xl rounded-md' }" />
      <UIcon v-else name="i-lucide-plus" class="size-8" />

      <div
        v-if="src && !disabled"
        class="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <UButton
          icon="i-lucide-plus"
          size="xs"
          color="neutral"
          variant="solid"
          :ui="{ base: 'rounded-full' }"
          :aria-label="`Change ${alt}`"
          @click.stop="triggerUpload"
        />
        <UButton
          icon="i-lucide-trash-2"
          size="xs"
          color="error"
          variant="solid"
          :ui="{ base: 'rounded-full' }"
          :aria-label="`Remove ${alt}`"
          @click.stop="emit('remove')"
        />
      </div>

      <div
        v-if="uploading"
        class="absolute inset-0 flex items-center justify-center bg-black/50"
      >
        <UIcon name="i-lucide-loader-circle" class="size-6 animate-spin text-white" />
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string | null;
    alt: string;
    uploading?: boolean;
    disabled?: boolean;
    size?: "md" | "lg" | "xl";
    maxSizeMb?: number;
  }>(),
  { size: "lg", maxSizeMb: 2 },
);

const emit = defineEmits<{
  upload: [file: File];
  remove: [];
}>();

const notification = useNotification();
const fileInputRef = ref<HTMLInputElement | null>(null);

const sizeClass = computed(
  () => ({ md: "h-20 w-20", lg: "h-32 w-32", xl: "h-40 w-40" })[props.size],
);

function triggerUpload() {
  fileInputRef.value?.click();
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  if (file.size > props.maxSizeMb * 1024 * 1024) {
    notification.error("File too large", `Image must be less than ${props.maxSizeMb}MB`);
    return;
  }

  emit("upload", file);
}

defineExpose({ triggerUpload });
</script>

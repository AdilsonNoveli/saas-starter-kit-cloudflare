<template>
  <div class="flex flex-col gap-4">
    <p class="text-sm text-muted">
      Each code works once. Store them somewhere safe, like a password manager.
      They won't be shown again, and anyone holding one can get into your
      account.
    </p>

    <ul
      aria-label="Recovery codes"
      class="grid grid-cols-1 gap-2 rounded-lg border border-default bg-elevated p-4 font-mono text-sm sm:grid-cols-2"
    >
      <li v-for="code in codes" :key="code">{{ code }}</li>
    </ul>

    <div class="flex flex-wrap gap-2">
      <UButton
        :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
        label="Copy"
        color="neutral"
        variant="outline"
        @click="copy(codes.join('\n'))"
      />
      <UButton
        icon="i-lucide-download"
        label="Download"
        color="neutral"
        variant="outline"
        @click="download"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Read-only display of a freshly issued recovery-code set. Shared by the
 * enrolment modal and the regenerate flow, so both offer the same copy and
 * download options. The codes live only in the caller's memory: nothing here
 * persists them.
 */
const props = defineProps<{ codes: string[] }>();

const { copy, copied } = useClipboard();

function download() {
  const body = [
    "Recovery codes",
    `Generated ${new Date().toISOString().slice(0, 10)}`,
    "Each code works once.",
    "",
    ...props.codes,
    "",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "recovery-codes.txt";
  link.click();
  URL.revokeObjectURL(url);
}
</script>

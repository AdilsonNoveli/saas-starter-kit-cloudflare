<!--
  @descricao: Componente Search enterprise-grade para busca com modal
  @objetivo: Busca reutilizável seguindo governança de tokens
-->

<script setup lang="ts">
interface SearchItem {
  id: string | number
  name: string
  url?: string
  [key: string]: unknown
}

interface SearchProps {
  modelValue: boolean
  items: SearchItem[]
  placeholder?: string
  emptyMessage?: string
}

const props = withDefaults(defineProps<SearchProps>(), {
  placeholder: 'Search...',
  emptyMessage: 'No results found.',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [item: SearchItem]
}>()

const query = ref('')

const filteredItems = computed(() => {
  if (query.value === '') {
    return []
  }
  return props.items.filter((item) => item.name.toLowerCase().includes(query.value.toLowerCase()))
})

function onSelect(item: SearchItem) {
  if (item) {
    emit('select', item)
    emit('update:modelValue', false)
    query.value = ''
  }
}

function close() {
  emit('update:modelValue', false)
  query.value = ''
}
</script>

<template>
  <Teleport to="body">
    <transition
      enter-active-class="ease-out duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-ink-900/25 transition-opacity z-40"
        @click="close"
      />
    </transition>

    <div v-if="modelValue" class="fixed inset-0 z-50 w-screen overflow-y-auto p-4 sm:p-6 md:p-20">
      <transition
        enter-active-class="ease-out duration-300"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="ease-in duration-200"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="modelValue"
          class="mx-auto max-w-xl transform divide-y divide-border overflow-hidden rounded-xl bg-surface border border-border shadow-md transition-all"
          @click.stop
        >
          <div class="grid grid-cols-1">
            <input
              v-model="query"
              type="text"
              class="col-start-1 row-start-1 h-12 w-full pr-4 pl-11 text-base text-text-primary bg-surface outline-none placeholder:text-text-muted sm:text-sm"
              :placeholder="placeholder"
              @keydown.esc="close"
            >
            <svg
              class="pointer-events-none col-start-1 row-start-1 ml-4 size-5 self-center text-text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>

          <ul
            v-if="filteredItems.length > 0"
            class="max-h-72 scroll-py-2 overflow-y-auto py-2 text-sm text-text-primary"
          >
            <li
              v-for="item in filteredItems"
              :key="item.id"
              class="cursor-pointer px-4 py-2 select-none hover:bg-brand hover:text-text-inverse transition-colors"
              @click="onSelect(item)"
            >
              {{ item.name }}
            </li>
          </ul>

          <p
            v-if="query !== '' && filteredItems.length === 0"
            class="p-4 text-sm text-text-secondary"
          >
            {{ emptyMessage }}
          </p>
        </div>
      </transition>
    </div>
  </Teleport>
</template>

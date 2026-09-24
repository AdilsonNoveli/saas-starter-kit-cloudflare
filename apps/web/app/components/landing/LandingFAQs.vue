<template>
  <LayoutSection>
    <div class="w-full text-center pb-8">
      <span class="text-3xl font-semibold text-highlighted">{{ heading }}</span>
      <p v-if="subheading" class="mt-2 text-muted">
        {{ subheading }}
      </p>
    </div>
    <UAccordion
      :items="faqItems"
      class="max-w-3xl mx-auto"
      :ui="{ root: 'divide-y divide-default' }"
    >
      <template #default="{ item, open }">
        <UButton
          color="neutral"
          variant="ghost"
          :ui="{
            base: 'rounded-none py-4 px-0 hover:bg-transparent text-left w-full justify-between items-center',
          }"
        >
          <span class="text-left text-base sm:text-lg font-medium text-highlighted flex-1 pr-4 leading-snug">
            {{ item.label }}
          </span>
          <template #trailing>
            <UIcon
              v-if="open"
              name="i-lucide-minus"
              class="w-5 h-5 ms-auto transform transition-transform duration-200 shrink-0 text-muted"
            />
            <UIcon
              v-else
              name="i-lucide-plus"
              class="w-5 h-5 ms-auto transform transition-transform duration-200 shrink-0 text-muted"
            />
          </template>
        </UButton>
      </template>
      <template #body="{ item }">
        <div class="pb-6 text-muted text-sm sm:text-base leading-relaxed whitespace-pre-line">
          <template v-for="(token, index) in parseContent(item.content)" :key="index">
            <NuxtLink
              v-if="token.type === 'link' && token.href"
              :to="token.href.startsWith('http') ? token.href : localePath(token.href)"
              class="text-primary hover:underline font-medium inline-flex items-center gap-1 transition-colors"
              :target="token.href.startsWith('http') ? '_blank' : undefined"
              :rel="token.href.startsWith('http') ? 'noopener noreferrer' : undefined"
            >
              <span>{{ token.text }}</span>
              <UIcon
                v-if="token.href.startsWith('http')"
                name="i-lucide-external-link"
                class="w-3.5 h-3.5 inline shrink-0"
              />
            </NuxtLink>
            <template v-else>{{ token.text }}</template>
          </template>
        </div>
      </template>
    </UAccordion>
  </LayoutSection>
</template>

<script setup lang="ts">
interface ContentToken {
  type: "text" | "link";
  text: string;
  href?: string;
}

const props = defineProps<{
  title?: string;
  subtitle?: string;
}>();

const { t } = useI18n();
const localePath = useLocalePath();
const heading = computed(() => props.title ?? t("landing.faqs.title"));
const subheading = computed(() => props.subtitle ?? t("landing.faqs.subtitle"));

function parseContent(content: string): ContentToken[] {
  const tokens: ContentToken[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        text: content.slice(lastIndex, match.index),
      });
    }
    const linkText = match[1];
    const linkHref = match[2];
    if (linkText && linkHref) {
      tokens.push({
        type: "link",
        text: linkText,
        href: linkHref,
      });
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    tokens.push({
      type: "text",
      text: content.slice(lastIndex),
    });
  }

  return tokens;
}

const faqItems = computed(() => [
  {
    label: t("landing.faqs.items.item1.question"),
    content: t("landing.faqs.items.item1.answer"),
  },
  {
    label: t("landing.faqs.items.item2.question"),
    content: t("landing.faqs.items.item2.answer"),
  },
  {
    label: t("landing.faqs.items.item3.question"),
    content: t("landing.faqs.items.item3.answer"),
  },
  {
    label: t("landing.faqs.items.item4.question"),
    content: t("landing.faqs.items.item4.answer"),
  },
  {
    label: t("landing.faqs.items.item5.question"),
    content: t("landing.faqs.items.item5.answer"),
  },
  {
    label: t("landing.faqs.items.item6.question"),
    content: t("landing.faqs.items.item6.answer"),
  },
  {
    label: t("landing.faqs.items.item7.question"),
    content: t("landing.faqs.items.item7.answer"),
  },
]);
</script>

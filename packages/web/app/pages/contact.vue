<template>
  <div class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
    <div class="text-center space-y-4">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary ring-1 ring-primary/20">
        <UIcon name="i-lucide-sparkles" class="w-3.5 h-3.5" />
        <span>Contact & Support</span>
      </div>
      <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-highlighted">
        Get in touch with <span class="text-brand-gradient">NuxFire</span>
      </h1>
      <p class="text-lg text-muted max-w-2xl mx-auto">
        Have questions about deploying on Cloudflare, architecture decisions, or need enterprise support? We're here to help.
      </p>
    </div>

    <div class="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="p-6 rounded-2xl bg-elevated/70 ring-1 ring-default/50 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <UIcon name="i-lucide-mail" class="w-5 h-5" />
        </div>
        <h3 class="text-lg font-bold text-highlighted">Direct Email</h3>
        <p class="text-sm text-muted">Reach out directly to our engineering & product team.</p>
        <a href="mailto:support@nuxfire.com" class="inline-block text-sm font-semibold text-primary hover:text-primary/75 underline underline-offset-4">
          support@nuxfire.com
        </a>
      </div>

      <div class="p-6 rounded-2xl bg-elevated/70 ring-1 ring-default/50 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <UIcon name="i-lucide-book-open" class="w-5 h-5" />
        </div>
        <h3 class="text-lg font-bold text-highlighted">Documentation</h3>
        <p class="text-sm text-muted">Browse complete guides, architecture and tutorials.</p>
        <NuxtLink to="/docs" class="inline-block text-sm font-semibold text-primary hover:text-primary/75 underline underline-offset-4">
          Explore NuxFire Docs →
        </NuxtLink>
      </div>

      <div class="p-6 rounded-2xl bg-elevated/70 ring-1 ring-default/50 space-y-3">
        <div class="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <UIcon name="i-lucide-layout-dashboard" class="w-5 h-5" />
        </div>
        <h3 class="text-lg font-bold text-highlighted">Live Dashboard</h3>
        <p class="text-sm text-muted">Test our production-ready dashboard and features.</p>
        <NuxtLink to="/" class="inline-block text-sm font-semibold text-primary hover:text-primary/75 underline underline-offset-4">
          Open Dashboard →
        </NuxtLink>
      </div>
    </div>

    <!-- Contact Form -->
    <div class="mt-12 p-8 rounded-3xl bg-elevated/80 ring-1 ring-default/50 backdrop-blur-xl">
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label class="text-sm font-semibold text-highlighted">Your Name</label>
            <UInput v-model="form.name" placeholder="Jane Doe" class="w-full" required />
          </div>
          <div class="space-y-2">
            <label class="text-sm font-semibold text-highlighted">Your Email</label>
            <UInput v-model="form.email" type="email" placeholder="jane@example.com" class="w-full" required />
          </div>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-semibold text-highlighted">Subject</label>
          <UInput v-model="form.subject" placeholder="How can we help?" class="w-full" required />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-semibold text-highlighted">Message</label>
          <UTextarea v-model="form.message" placeholder="Write your message here..." :rows="5" class="w-full" required />
        </div>
        <div class="flex items-center justify-between pt-2">
          <p v-if="submitted" class="text-sm text-success font-medium">
            ✓ Thank you! Your message has been received.
          </p>
          <span v-else></span>
          <button
            type="submit"
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-inverted shadow-md hover:shadow-fire-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all bg-brand-gradient cursor-pointer"
          >
            <UIcon name="i-lucide-send" class="w-4 h-4" />
            <span>Send Message</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'page',
});

useSeoMeta({
  title: 'Contact - NuxFire',
  description: 'Get in touch with the NuxFire team for support, questions, or enterprise requests.',
});

const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: '',
});

const submitted = ref(false);

function handleSubmit() {
  submitted.value = true;
  form.name = '';
  form.email = '';
  form.subject = '';
  form.message = '';
}
</script>

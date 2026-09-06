<template>
  <LoaderSpin height="h-screen" />
</template>

<script setup>
// Was `definePageMeta({ redirect: "/dashboard" })` — that declarative page
// redirect runs in the same navigation-resolution phase as our own global
// middleware's own `navigateTo(..., { external: true })` for a logged-out
// visitor (see middleware/0.auth.global.ts). For "/" specifically (matched
// by this catch-all, since there's no real index page) the two redirects
// raced and hung the SSR navigation indefinitely instead of ever resolving
// — reproducible 100% of the time. Named pages like dashboard.vue have no
// competing page-level redirect, which is why only "/" was affected.
// Deferring to a plain imperative redirect removes the race: by the time
// this component's setup runs, the global middleware has already had its
// chance to redirect externally, so this only ever fires for an
// authenticated visitor who has nothing else to land on.
definePageMeta({
  middleware: [() => navigateTo("/dashboard")],
});
</script>

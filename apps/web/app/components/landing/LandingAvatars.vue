<template>
  <div class="flex flex-wrap justify-center items-center gap-3 pt-3">
    <UAvatarGroup size="sm">
      <UAvatar src="/static/N4aA96n.jpg" alt="David Kim" />
      <UAvatar src="/static/AVQ0V28X.jpeg" alt="Lisa Thompson" />
      <UAvatar src="/static/VUMBKh1U.jpg" alt="James Wilson" />
      <UAvatar src="/static/xZ4wg2Xj.jpeg" alt="Sarah Johnson" />
      <UAvatar src="/static/FJkauyEa.jpeg" alt="Michael Chen" />
    </UAvatarGroup>
    <div class="flex flex-col items-start justify-center">
      <div class="flex items-center gap-1 text-amber-400">
        <svg
          v-for="i in 5"
          :key="i"
          class="w-4 h-4 fill-amber-400 text-amber-400 shrink-0"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      </div>
      <span class="text-xs sm:text-sm font-medium text-muted">{{ $t("landing.avatars.validated") }}</span>
    </div>
  </div>
</template>

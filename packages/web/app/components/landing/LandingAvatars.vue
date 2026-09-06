<template>
  <div class="flex justify-center items-center gap-2 pt-5">
    <UAvatarGroup size="sm">
      <UAvatar src="/static/N4aA96n.jpg" alt="David Kim" />
      <UAvatar src="/static/AVQ0V28X.jpg" alt="Lisa Thompson" />
      <UAvatar src="/static/VUMBKh1U.jpg" alt="James Wilson" />
      <UAvatar src="/static/xZ4wg2Xj.jpg" alt="Sarah Johnson" />
      <UAvatar src="/static/FJkauyEa.jpg" alt="Michael Chen" />
    </UAvatarGroup>
    <div class="flex flex-col justify-center">
      <div class="flex justify-center items-center text-yellow-500">
        <UIcon
          v-for="i in [1, 2, 3, 4, 5]"
          :key="i"
          name="i-lucide-star"
          class="w-6 h-6"
        />
      </div>
      <span class="text-muted">trusted by 5 devs</span>
    </div>
  </div>
</template>

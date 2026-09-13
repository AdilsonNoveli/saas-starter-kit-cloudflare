<script setup lang="ts">
// Redirect /admin → /admin/orders (default admin landing page)
await navigateTo('/admin/orders', { replace: true })
</script>

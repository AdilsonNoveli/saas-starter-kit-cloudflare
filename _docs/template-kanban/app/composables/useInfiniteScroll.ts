import { type Ref, onMounted, onUnmounted, watch } from 'vue'

interface UseInfiniteScrollOptions {
  /** Distance from sentinel to trigger load (default 300px) */
  rootMargin?: string
  threshold?: number
}

/**
 * Observes a sentinel element and calls `onLoadMore` whenever it
 * becomes visible — providing a clean, dependency-free infinite scroll.
 * Automatically disconnects on unmount.
 */
export function useInfiniteScroll(
  sentinel: Ref<HTMLElement | null>,
  onLoadMore: () => void | Promise<void>,
  options: UseInfiniteScrollOptions = {},
) {
  const { rootMargin = '300px', threshold = 0 } = options
  let observer: IntersectionObserver | null = null

  const connect = () => {
    if (!sentinel.value) return
    observer?.disconnect()
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore()
      },
      { root: null, rootMargin, threshold },
    )
    observer.observe(sentinel.value)
  }

  const disconnect = () => {
    observer?.disconnect()
    observer = null
  }

  onMounted(connect)
  onUnmounted(disconnect)
  watch(sentinel, connect)

  return { disconnect }
}

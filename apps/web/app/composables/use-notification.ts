/**
 * The one way this app shows a toast: callers pick a severity and never restate the
 * colour/icon pairing that goes with it. Mirrors the toast half of the composable of the
 * same name in `apps/app` and `apps/login`; only what this app uses is here.
 */
export function useNotification() {
  const toast = useToast();

  return {
    success(title: string, description?: string) {
      toast.add({
        title,
        description,
        color: "success",
        icon: "i-lucide-circle-check",
      });
    },
  };
}

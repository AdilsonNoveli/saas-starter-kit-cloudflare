/**
 * Standard toast surface for this app. Mirrors the composable of the same name
 * in `apps/login` so a notification looks and reads identically on
 * both sides of the sign-in boundary — callers pick a severity and never
 * restate the colour/icon pairing that goes with it.
 */
export function useNotification() {
  const toast = useToast();

  return {
    error(title: string, description?: string) {
      toast.add({
        title,
        description,
        color: "error",
        icon: "i-lucide-circle-alert",
      });
    },
    success(title: string, description?: string) {
      toast.add({
        title,
        description,
        color: "success",
        icon: "i-lucide-circle-check",
      });
    },
    info(title: string, description?: string) {
      toast.add({
        title,
        description,
        color: "info",
        icon: "i-lucide-info",
      });
    },
  };
}

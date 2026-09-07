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

export function useNotification() {
  const toast = useToast();

  return {
    error(title: string, description?: string) {
      toast.add({
        title,
        description,
        color: "error",
        icon: "i-ph-warning-circle-duotone",
      });
    },
    success(title: string, description?: string) {
      toast.add({
        title,
        description,
        color: "success",
        icon: "i-ph-check-circle-duotone",
      });
    },
    info(title: string, description?: string) {
      toast.add({
        title,
        description,
        color: "info",
        icon: "i-ph-info-duotone",
      });
    },
  };
}

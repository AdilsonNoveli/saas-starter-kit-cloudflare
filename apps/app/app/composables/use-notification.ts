/** Options a caller passes to `useNotification().confirm()`. */
export interface ConfirmDialogOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Drives the header icon/text colour and the confirm button colour. */
  color?: "error" | "warning" | "primary";
}

/** A pending confirmation: the options to render plus the promise it must settle. */
export interface ConfirmDialogRequest {
  options: ConfirmDialogOptions;
  resolve: (confirmed: boolean) => void;
}

/**
 * The one confirmation request currently on screen, if any. `useState`
 * (not a module-level ref) so every caller — and the singleton
 * `<ConfirmDialog>` mounted in `app.vue` — shares the exact same instance
 * without risking cross-request leakage during SSR.
 */
function useConfirmDialogState() {
  return useState<ConfirmDialogRequest | null>("confirm-dialog", () => null);
}

/**
 * Standard toast + confirmation surface for this app. Mirrors the toast half
 * of the composable of the same name in `apps/login` so a notification looks
 * and reads identically on both sides of the sign-in boundary — callers pick
 * a severity and never restate the colour/icon pairing that goes with it.
 *
 * `confirm()` is the one way to ask the user to approve a destructive or
 * risky action: it opens the singleton `<ConfirmDialog>` and resolves once
 * they choose, so no call site ever falls back to the browser's own
 * `window.confirm` — unstyled, blocking, and blind to dark mode.
 */
export function useNotification() {
  const toast = useToast();
  const dialog = useConfirmDialogState();

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
    warning(title: string, description?: string) {
      toast.add({
        title,
        description,
        color: "warning",
        icon: "i-ph-warning-duotone",
      });
    },
    /** A toast that is not a severity — e.g. a real-time push from the server. */
    message(title: string, description?: string, duration?: number) {
      toast.add({
        title,
        description,
        duration,
        color: "primary",
        icon: "i-ph-bell-duotone",
      });
    },
    confirm(options: ConfirmDialogOptions) {
      return new Promise<boolean>((resolve) => {
        dialog.value = { options, resolve };
      });
    },
  };
}

export { useConfirmDialogState };

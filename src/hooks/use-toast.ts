// Backwards-compatible toast wrapper around sonner
import { toast as sonnerToast } from "sonner";

type ToastInput =
  | string
  | { title?: string; description?: string; variant?: string };

function toast(input: ToastInput) {
  if (typeof input === "string") {
    sonnerToast(input);
    return;
  }

  const { title, description, variant } = input;
  const message = title || "Notificação";

  if (variant === "destructive") {
    sonnerToast.error(message, { description });
  } else {
    sonnerToast.success(message, { description });
  }
}

// Also expose sonner's direct methods
toast.success = sonnerToast.success;
toast.error = sonnerToast.error;
toast.info = sonnerToast.info;
toast.warning = sonnerToast.warning;
toast.dismiss = sonnerToast.dismiss;
toast.message = sonnerToast.message;

function useToast() {
  return {
    toast,
    dismiss: (id?: string | number) => {
      if (id) {
        sonnerToast.dismiss(id);
      } else {
        sonnerToast.dismiss();
      }
    },
    toasts: [] as any[],
  };
}

export { useToast, toast };

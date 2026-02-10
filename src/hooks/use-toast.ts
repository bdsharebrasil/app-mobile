// Re-export from sonner for backwards compatibility
import { toast } from "sonner";

// Wrapper hook for components that use useToast pattern
function useToast() {
  return {
    toast,
    dismiss: (id?: string | number) => {
      if (id) {
        toast.dismiss(id);
      } else {
        toast.dismiss();
      }
    },
    toasts: [] as any[], // Legacy compat - not used with sonner
  };
}

export { useToast, toast };

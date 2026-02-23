import { toast } from "sonner";

interface ToastUndoLabels {
  undo: string;
  restored: string;
  failedRestore: string;
}

const DEFAULT_LABELS: ToastUndoLabels = {
  undo: "Undo",
  restored: "Restored",
  failedRestore: "Failed to restore",
};

/**
 * Shows a toast with an "Undo" button that restores a soft-deleted entity.
 */
export function toastWithUndo(
  message: string,
  entityType: string,
  entityId: string,
  onUndoSuccess?: () => void,
  labels?: ToastUndoLabels
) {
  const l = labels || DEFAULT_LABELS;
  toast.success(message, {
    action: {
      label: l.undo,
      onClick: async () => {
        try {
          const res = await fetch("/api/crm/trash/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entity_type: entityType, id: entityId }),
          });
          const json = await res.json();
          if (json.success) {
            toast.success(l.restored);
            onUndoSuccess?.();
          } else {
            toast.error(l.failedRestore);
          }
        } catch {
          toast.error(l.failedRestore);
        }
      },
    },
    duration: 6000,
  });
}

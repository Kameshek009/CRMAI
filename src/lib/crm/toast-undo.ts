import { toast } from "sonner";

/**
 * Shows a toast with an "Undo" button that restores a soft-deleted entity.
 */
export function toastWithUndo(
  message: string,
  entityType: string,
  entityId: string,
  onUndoSuccess?: () => void
) {
  toast.success(message, {
    action: {
      label: "Undo",
      onClick: async () => {
        try {
          const res = await fetch("/api/crm/trash/restore", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entity_type: entityType, id: entityId }),
          });
          const json = await res.json();
          if (json.success) {
            toast.success("Restored");
            onUndoSuccess?.();
          } else {
            toast.error("Failed to restore");
          }
        } catch {
          toast.error("Failed to restore");
        }
      },
    },
    duration: 6000,
  });
}

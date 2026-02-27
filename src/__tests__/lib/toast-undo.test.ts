import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toastWithUndo } from "@/lib/crm/toast-undo";
import { toast } from "sonner";

// Helper to extract the action onClick handler from the toast.success call
function getActionOnClick(): (() => Promise<void>) {
  const call = (toast.success as ReturnType<typeof vi.fn>).mock.calls[0]!;
  return call[1].action.onClick;
}

describe("toastWithUndo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("calls toast.success with the message", () => {
    toastWithUndo("Contact deleted", "contact", "id-1");

    expect(toast.success).toHaveBeenCalledTimes(1);
    expect((toast.success as ReturnType<typeof vi.fn>).mock.calls[0]![0]).toBe(
      "Contact deleted"
    );
  });

  it("passes an action with label 'Undo' by default", () => {
    toastWithUndo("Deleted", "contact", "id-1");

    const options = (toast.success as ReturnType<typeof vi.fn>).mock.calls[0]![1];
    expect(options.action.label).toBe("Undo");
  });

  it("uses custom labels when provided", () => {
    const customLabels = {
      undo: "Отменить",
      restored: "Восстановлено",
      failedRestore: "Не удалось восстановить",
    };

    toastWithUndo("Удалено", "contact", "id-1", undefined, customLabels);

    const options = (toast.success as ReturnType<typeof vi.fn>).mock.calls[0]![1];
    expect(options.action.label).toBe("Отменить");
  });

  it("sets duration to 6000", () => {
    toastWithUndo("Deleted", "contact", "id-1");

    const options = (toast.success as ReturnType<typeof vi.fn>).mock.calls[0]![1];
    expect(options.duration).toBe(6000);
  });

  it("clicking action calls fetch with correct URL and body", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });

    toastWithUndo("Deleted", "deal", "deal-42");

    const onClick = getActionOnClick();
    await onClick();

    expect(global.fetch).toHaveBeenCalledWith("/api/crm/trash/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: "deal", id: "deal-42" }),
    });
  });

  it("on successful restore: calls toast.success with 'Restored' and onUndoSuccess", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    const onUndoSuccess = vi.fn();

    toastWithUndo("Deleted", "contact", "id-1", onUndoSuccess);

    const onClick = getActionOnClick();
    await onClick();

    expect(toast.success).toHaveBeenCalledWith("Restored");
    expect(onUndoSuccess).toHaveBeenCalledTimes(1);
  });

  it("on successful restore with custom labels: uses custom restored label", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });
    const customLabels = {
      undo: "Отменить",
      restored: "Восстановлено",
      failedRestore: "Не удалось восстановить",
    };

    toastWithUndo("Удалено", "contact", "id-1", undefined, customLabels);

    const onClick = getActionOnClick();
    await onClick();

    expect(toast.success).toHaveBeenCalledWith("Восстановлено");
  });

  it("on failed restore (json.success=false): calls toast.error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    });

    toastWithUndo("Deleted", "contact", "id-1");

    const onClick = getActionOnClick();
    await onClick();

    expect(toast.error).toHaveBeenCalledWith("Failed to restore");
  });

  it("on fetch error: calls toast.error", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    toastWithUndo("Deleted", "contact", "id-1");

    const onClick = getActionOnClick();
    await onClick();

    expect(toast.error).toHaveBeenCalledWith("Failed to restore");
  });

  it("on fetch error with custom labels: uses custom failedRestore label", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );
    const customLabels = {
      undo: "Отменить",
      restored: "Восстановлено",
      failedRestore: "Не удалось восстановить",
    };

    toastWithUndo("Удалено", "contact", "id-1", undefined, customLabels);

    const onClick = getActionOnClick();
    await onClick();

    expect(toast.error).toHaveBeenCalledWith("Не удалось восстановить");
  });

  it("does not call onUndoSuccess when restore fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: false }),
    });
    const onUndoSuccess = vi.fn();

    toastWithUndo("Deleted", "contact", "id-1", onUndoSuccess);

    const onClick = getActionOnClick();
    await onClick();

    expect(onUndoSuccess).not.toHaveBeenCalled();
  });

  it("works without onUndoSuccess callback on successful restore", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ success: true }),
    });

    toastWithUndo("Deleted", "contact", "id-1");

    const onClick = getActionOnClick();
    // Should not throw even without onUndoSuccess
    await expect(onClick()).resolves.toBeUndefined();
    expect(toast.success).toHaveBeenCalledWith("Restored");
  });
});

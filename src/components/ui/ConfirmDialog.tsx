"use client";

import { ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/* Generic confirmation dialog — reusable anywhere a "are you sure?"
   step is needed (delete, suspend, revoke, etc). Styling matches the
   existing .card / .btn classes so it fits both admin and app pages. */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onCancel]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={() => !busy && onCancel()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(4,8,16,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onClick={(e) => e.stopPropagation()}
        className="card pad-lg"
        style={{ width: "100%", maxWidth: 420 }}
      >
        <h3
          id="confirm-dialog-title"
          style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, margin: "0 0 10px", color: "var(--text)" }}
        >
          {title}
        </h3>
        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 22 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-sm" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            className="btn btn-sm"
            style={
              danger
                ? { background: "var(--crit)", borderColor: "var(--crit)", color: "#fff" }
                : undefined
            }
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { useEffect } from "react";

export default function ConfirmDialog({
  open,
  title = "Confirm action",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isDanger = false,
}) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="confirm-dialog__overlay"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="confirm-dialog__panel card"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="stack">
          <h2 id="confirm-dialog-title" className="section-title" style={{ margin: 0 }}>
            {title}
          </h2>

          <p>{message}</p>

          <div className="row">
            <button
              type="button"
              className={isDanger ? "button button--danger" : "button"}
              onClick={onConfirm}
            >
              {confirmText}
            </button>

            <button
              type="button"
              className="button button--secondary"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
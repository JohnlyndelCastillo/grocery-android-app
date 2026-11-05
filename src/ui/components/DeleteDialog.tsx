import { useEffect, useRef } from "react";

interface DeleteDialogProps {
  open: boolean;
  message: string;
  /** Defaults match the item-delete wording. */
  title?: string;
  confirmLabel?: string;
  /** Keeps element ids unique when a second dialog is on the page. */
  idPrefix?: string;
  onCancel(): void;
  onConfirm(): void;
}

// A flat confirmation: Surface card, no shadow or blur (the scrim is flat too). Cancel comes first in the
// DOM, so it gets the initial focus. The destructive action is never focused for you.
export function DeleteDialog({ open, message, title = "Delete selected items?", confirmLabel = "Delete items", idPrefix = "", onCancel, onConfirm }: DeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // `open` is the single source of truth; this keeps the native <dialog> in step with it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      id={`${idPrefix}confirm-delete-dialog`}
      className="m-auto w-[min(calc(100%-32px),400px)] rounded-2xl border-0 bg-[var(--color-surface)] p-0 text-ink"
      aria-labelledby={`${idPrefix}delete-dialog-title`}
      aria-describedby={`${idPrefix}delete-confirm-message`}
      onCancel={(event) => {
        // Esc: let state close the dialog instead of the browser, so the two can't disagree.
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="p-6">
        <h2 id={`${idPrefix}delete-dialog-title`} className="m-0 text-sheet font-semibold">{title}</h2>
        <p id={`${idPrefix}delete-confirm-message`} className="mb-6 mt-2 text-body text-muted">{message}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button id={`${idPrefix}cancel-delete`} className="tap rounded-xl bg-[var(--color-dialog-button)] px-4 text-body font-semibold text-ink" type="button" onClick={onCancel}>Cancel</button>
          <button id={`${idPrefix}confirm-delete`} className="tap rounded-xl bg-[var(--color-danger-fill)] px-4 text-body font-semibold text-on-danger" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}

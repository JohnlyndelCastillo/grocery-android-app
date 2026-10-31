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
      className="m-auto w-[min(calc(100%-36px),400px)] rounded-[18px] border-0 p-0 text-ink shadow-[0_18px_60px_var(--color-dialog-shadow)]"
      aria-labelledby={`${idPrefix}delete-dialog-title`}
      aria-describedby={`${idPrefix}delete-confirm-message`}
      onCancel={(event) => {
        // Esc: let state close the dialog instead of the browser, so the two can't disagree.
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="w-[min(100%,360px)] p-[23px]">
        <h2 id={`${idPrefix}delete-dialog-title`} className="mb-2 mt-0 text-[1.15rem] font-bold">{title}</h2>
        <p id={`${idPrefix}delete-confirm-message`} className="m-0 text-[.9rem] leading-[1.5] text-muted">{message}</p>
        <div className="mt-[22px] flex justify-end gap-[9px]">
          <button id={`${idPrefix}cancel-delete`} className="min-h-[2.625rem] rounded-xl bg-[var(--color-dialog-button)] px-[14px] text-[.85rem] font-bold text-[var(--color-selection-ink)]" type="button" onClick={onCancel}>Cancel</button>
          <button id={`${idPrefix}confirm-delete`} className="min-h-[2.625rem] rounded-xl bg-[var(--color-danger-fill)] px-[14px] text-[.85rem] font-bold text-white" type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}

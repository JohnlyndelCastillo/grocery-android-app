import { useEffect, useRef } from "react";
import type { ShoppingList } from "../../domain/types";

interface ListActionsDialogProps {
  open: boolean;
  list: ShoppingList | null;
  onClose(): void;
  onRename(): void;
  onDuplicate(): void;
  onArchive(): void;
  onRestore(): void;
  onDelete(): void;
}

export function ListActionsDialog({ open, list, onClose, onRename, onDuplicate, onArchive, onRestore, onDelete }: ListActionsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  const archived = list?.archivedAt !== null && list?.archivedAt !== undefined;
  const row = "settings-row tap flex w-full items-center justify-between gap-3 border-b border-[var(--color-line-soft)] bg-transparent px-4 py-3 text-left text-body text-ink last:border-b-0";

  return (
    <dialog
      ref={dialogRef}
      id="list-actions-dialog"
      className="sheet-dialog"
      aria-labelledby="list-actions-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-2">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-sheet-handle)]" aria-hidden="true" />
        <h2 id="list-actions-title" className="m-0 px-1 pb-3 text-sheet font-medium">{list?.name ?? "List options"}</h2>
        <div className="overflow-hidden rounded-2xl bg-[var(--color-track)]">
          <button id="list-action-rename" className={row} type="button" onClick={onRename}>Rename list</button>
          <button id="list-action-duplicate" className={row} type="button" onClick={onDuplicate}>Duplicate list</button>
          {archived ? (
            <button id="list-action-restore" className={row} type="button" onClick={onRestore}>Restore list</button>
          ) : (
            <button id="list-action-archive" className={row} type="button" onClick={onArchive}>Archive list</button>
          )}
          <button id="list-action-delete" className={`${row} text-[var(--color-danger)]`} type="button" onClick={onDelete}>Delete list</button>
        </div>
        <button id="list-actions-close" className="tap mt-2 block w-full rounded-xl bg-transparent px-4 text-label font-medium text-muted" type="button" onClick={onClose}>Cancel</button>
      </div>
    </dialog>
  );
}

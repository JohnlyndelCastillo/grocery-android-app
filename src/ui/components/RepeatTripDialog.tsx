import { useEffect, useRef } from "react";
import type { Receipt } from "../../domain/types";
import { formatShortDate, itemCountLabel, makeMoney } from "../format";

interface RepeatTripDialogProps {
  open: boolean;
  receipts: Receipt[];
  onClose(): void;
  onPick(receiptId: string): void;
}

export function RepeatTripDialog({ open, receipts, onClose, onPick }: RepeatTripDialogProps) {
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

  return (
    <dialog
      ref={dialogRef}
      id="repeat-trip-dialog"
      className="sheet-dialog max-h-[85dvh] overflow-y-auto"
      aria-labelledby="repeat-trip-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-2">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-sheet-handle)]" aria-hidden="true" />
        <h2 id="repeat-trip-title" className="m-0 px-1 pb-1 text-sheet font-medium">Repeat a trip</h2>
        <p className="mb-3 mt-0 px-1 text-label text-muted">Pick a receipt. Its items become a new, unchecked list.</p>
        {receipts.length === 0 ? (
          <p className="empty-state">No receipts yet.</p>
        ) : (
          <ul id="repeat-trip-list" className="m-0 list-none overflow-hidden rounded-2xl bg-[var(--color-track)] p-0">
            {receipts.map((receipt) => (
              <li key={receipt.id}>
                <button id={`repeat-receipt-${receipt.id}`} className="settings-row tap flex w-full items-center justify-between gap-3 border-b border-[var(--color-line-soft)] bg-transparent px-4 py-3 text-left text-body text-ink last:border-b-0" type="button" onClick={() => onPick(receipt.id)}>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{receipt.storeName ?? receipt.listName ?? "Shopping trip"}</span>
                    <span className="block text-label text-muted">{formatShortDate(receipt.finishedAt)} · {itemCountLabel(receipt.lines.length)}</span>
                  </span>
                  <strong className="num shrink-0 text-label font-medium text-green">{makeMoney(receipt.currency).format(receipt.total)}</strong>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button id="repeat-trip-close" className="tap mt-2 block w-full rounded-xl bg-transparent px-4 text-label font-medium text-muted" type="button" onClick={onClose}>Cancel</button>
      </div>
    </dialog>
  );
}

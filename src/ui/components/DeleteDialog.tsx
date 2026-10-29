import type { RefObject } from "react";

interface DeleteDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  message: string;
  onCancel(): void;
  onConfirm(): void;
}

export function DeleteDialog({ dialogRef, message, onCancel, onConfirm }: DeleteDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      id="confirm-delete-dialog"
      className="w-[min(calc(100%-36px),400px)] rounded-[18px] border-0 p-0 text-ink shadow-[0_18px_60px_#10271940]"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-confirm-message"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <div className="w-[min(100%,360px)] p-[23px]">
        <h2 id="delete-dialog-title" className="mb-2 mt-0 text-[1.15rem] font-bold">Delete selected items?</h2>
        <p id="delete-confirm-message" className="m-0 text-[.9rem] leading-[1.5] text-muted">{message}</p>
        <div className="mt-[22px] flex justify-end gap-[9px]">
          <button id="cancel-delete" className="min-h-[42px] rounded-xl bg-[#edf2eb] px-[14px] text-[.85rem] font-bold text-[#385541]" type="button" onClick={onCancel}>Cancel</button>
          <button id="confirm-delete" className="min-h-[42px] rounded-xl bg-[#ad5147] px-[14px] text-[.85rem] font-bold text-white" type="button" onClick={onConfirm}>Delete items</button>
        </div>
      </div>
    </dialog>
  );
}

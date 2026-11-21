import { useEffect, useRef, useState } from "react";
import type { Store } from "../../domain/types";

interface ListDialogProps {
  open: boolean;
  title: string;
  initialName?: string;
  stores: Store[];
  initialStoreId?: string | null;
  submitLabel: string;
  showStore?: boolean;
  onCancel(): void;
  onSubmit(name: string, storeId: string | null): void;
}

export function ListDialog({ open, title, initialName = "", stores, initialStoreId = null, submitLabel, showStore = true, onCancel, onSubmit }: ListDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(initialName);
  const [storeId, setStoreId] = useState<string | null>(initialStoreId);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setName(initialName);
      setStoreId(initialStoreId);
      setInvalid(false);
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open, initialName, initialStoreId]);

  function submit() {
    if (!name.trim()) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    onSubmit(name, showStore ? storeId : null);
  }

  return (
    <dialog
      ref={dialogRef}
      id="list-dialog"
      className="form-dialog"
      aria-labelledby="list-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <form
        className="p-5"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <h2 id="list-dialog-title" className="m-0 text-sheet font-medium">{title}</h2>
        <label className="mt-4 block text-label font-medium text-muted" htmlFor="list-name">List name</label>
        <input
          id="list-name"
          ref={inputRef}
          className={`mt-1.5 w-full ${invalid ? "invalid" : ""}`}
          value={name}
          placeholder="e.g. Monthly groceries"
          autoComplete="off"
          aria-invalid={invalid || undefined}
          onChange={(event) => {
            setName(event.currentTarget.value);
            if (event.currentTarget.value.trim()) setInvalid(false);
          }}
        />
        {showStore && (
          <>
            <label className="mt-4 block text-label font-medium text-muted" htmlFor="list-store">Store</label>
            <select id="list-store" className="select-field mt-1.5 w-full" value={storeId ?? ""} onChange={(event) => setStoreId(event.currentTarget.value || null)}>
              <option value="">No store</option>
              {stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}
            </select>
          </>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button id="list-cancel" className="tap rounded-xl bg-[var(--color-dialog-button)] px-4 text-label font-medium text-ink" type="button" onClick={onCancel}>Cancel</button>
          <button id="list-save" className="tap rounded-xl bg-green-fill px-4 text-label font-medium text-on-action" type="submit">{submitLabel}</button>
        </div>
      </form>
    </dialog>
  );
}

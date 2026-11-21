import { useEffect, useRef, useState } from "react";
import { STORE_COLORS } from "../../domain/lists";
import type { Store } from "../../domain/types";

interface StoreManagerDialogProps {
  open: boolean;
  stores: Store[];
  onClose(): void;
  onAdd(name: string, color: string): void;
  onRename(storeId: string, name: string): void;
  onRecolor(storeId: string, color: string): void;
  onDelete(storeId: string): void;
}

export function StoreManagerDialog({ open, stores, onClose, onAdd, onRename, onRecolor, onDelete }: StoreManagerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(STORE_COLORS[0]);

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
      id="store-manager"
      className="sheet-dialog max-h-[90dvh] overflow-y-auto"
      aria-labelledby="store-manager-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-2">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-sheet-handle)]" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3 px-1">
          <h2 id="store-manager-title" className="m-0 text-sheet font-medium">Stores</h2>
          <button id="store-manager-close" className="tap grid place-items-center rounded-xl bg-transparent text-ink" type="button" aria-label="Close stores" onClick={onClose}>
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <p className="mb-4 mt-1 px-1 text-label text-muted">Group lists by store. Removing a store keeps its lists and receipts.</p>

        <form
          className="add-store-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            onAdd(name, color);
            setName("");
          }}
        >
          <input id="new-store-name" className="min-w-0 flex-1" placeholder="New store name" value={name} onChange={(event) => setName(event.currentTarget.value)} />
          <button id="new-store-add" className="tap rounded-xl bg-green-fill px-3 text-label font-medium text-on-action" type="submit">Add</button>
        </form>
        <div className="mb-4 mt-2 flex flex-wrap gap-2 px-1" aria-label="Store color">
          {STORE_COLORS.map((option) => (
            <button
              key={option}
              className={`color-swatch${option === color ? " selected" : ""}`}
              style={{ backgroundColor: option }}
              type="button"
              aria-label={`Use store color ${option}`}
              aria-pressed={option === color}
              onClick={() => setColor(option)}
            />
          ))}
        </div>

        {stores.length === 0 ? (
          <p className="empty-state">No stores yet.</p>
        ) : (
          <ul id="store-list" className="m-0 list-none overflow-hidden rounded-2xl bg-[var(--color-track)] p-0">
            {stores.map((store) => (
              <li key={store.id} className="border-b border-[var(--color-line-soft)] px-3 py-3 last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="store-dot shrink-0" style={{ backgroundColor: store.color }} aria-hidden="true" />
                  <input
                    id={`store-name-${store.id}`}
                    className="min-w-0 flex-1 bg-transparent"
                    defaultValue={store.name}
                    aria-label={`Store name for ${store.name}`}
                    onBlur={(event) => onRename(store.id, event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  <button id={`store-delete-${store.id}`} className="tap grid place-items-center rounded-xl bg-transparent text-[var(--color-danger)]" type="button" aria-label={`Delete ${store.name}`} onClick={() => onDelete(store.id)}>
                    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 pl-5">
                  {STORE_COLORS.map((option) => (
                    <button
                      key={option}
                      id={`store-color-${store.id}-${option.slice(1)}`}
                      className={`color-swatch${option === store.color ? " selected" : ""}`}
                      style={{ backgroundColor: option }}
                      type="button"
                      aria-label={`Recolor ${store.name}`}
                      aria-pressed={option === store.color}
                      onClick={() => onRecolor(store.id, option)}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}

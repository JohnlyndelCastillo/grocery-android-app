import { useEffect, useRef, useState } from "react";
import { budgetStatus, parseBudget } from "../../domain/budget";
import { budgetMessage } from "../format";

interface BudgetSheetProps {
  open: boolean;
  budget: number | null;
  symbol: string;
  money: Intl.NumberFormat;
  cartAmount: number;
  onSave(raw: string): void; // "" clears the budget
  onClose(): void;
}

// Bottom sheet for editing today's budget. `open` is the single source of truth, like DeleteDialog.
export function BudgetSheet({ open, budget, symbol, money, cartAmount, onSave, onClose }: BudgetSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initial = budget === null ? "" : String(budget);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      // Start from the saved budget every time the sheet opens.
      setDraft(initial);
      setError(false);
      if (inputRef.current) inputRef.current.value = initial;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open, initial]);

  const parsed = parseBudget(draft);
  const invalid = error || !parsed.ok;
  const preview = !invalid && parsed.ok ? budgetMessage(budgetStatus(cartAmount, parsed.value), money) : "Enter a valid amount.";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = inputRef.current?.value ?? "";
    if (!parseBudget(raw).ok) return setError(true);
    onSave(raw);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      id="budget-sheet"
      className="mx-auto mb-0 mt-auto w-full max-w-[620px] rounded-b-none rounded-t-3xl border-0 bg-app p-0 text-ink shadow-[0_-8px_40px_var(--color-dialog-shadow)]"
      aria-labelledby="budget-sheet-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(); // tap on the dimmed backdrop
      }}
    >
      <form id="budget-form" className="px-5 pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-[10px]" onSubmit={handleSubmit}>
        <div className="mx-auto mb-[14px] h-[5px] w-10 rounded-[3px] bg-[var(--color-sheet-handle)]" aria-hidden="true" />
        <h2 id="budget-sheet-title" className="m-0 text-[1.25rem] font-bold">Today’s budget</h2>
        <p className="mb-4 mt-1 text-[.88rem] text-muted">Resets each day. Leave empty for no limit.</p>
        <label className="mb-[6px] block text-[.8rem] font-bold text-[var(--color-sheet-label)]" htmlFor="budget-input">Spending limit</label>
        <div className="relative">
          <span className="absolute left-[14px] top-[14px] text-[.95rem] text-muted" aria-hidden="true">{symbol}</span>
          <input
            id="budget-input"
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="Set a spending limit"
            defaultValue={initial}
            aria-invalid={invalid}
            onInput={(event) => {
              setDraft(event.currentTarget.value);
              setError(false);
            }}
            className="!h-[3.125rem] w-full !pl-[30px]"
          />
        </div>
        <p id="budget-preview" className={`mb-[18px] mt-2 min-h-[1.2em] text-[.82rem] font-semibold ${invalid ? "text-[var(--color-budget-warning)]" : "text-green"}`} aria-live="polite">{preview}</p>
        <button className="block min-h-[3.125rem] w-full rounded-xl bg-green font-bold text-white" type="submit">Save</button>
        {budget !== null && (
          <button
            id="clear-budget"
            className="mt-[6px] block min-h-12 w-full bg-transparent font-bold text-[var(--color-budget-warning)]"
            type="button"
            onClick={() => {
              onSave("");
              onClose();
            }}
          >
            Clear budget
          </button>
        )}
      </form>
    </dialog>
  );
}

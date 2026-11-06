import { useEffect, useRef, useState } from "react";
import { budgetStatus, parseBudget } from "../../domain/budget";
import type { Money } from "../format";

interface BudgetSheetProps {
  open: boolean;
  budget: number | null;
  /** The currency code shown inside the field, e.g. "PHP". */
  symbol: string;
  money: Money;
  cartAmount: number;
  onSave(raw: string): void; // "" clears the budget
  onClose(): void;
}

// How long to wait after focusing the field before scrolling it into view, so the Android keyboard has
// finished opening and the sheet has finished resizing.
const KEYBOARD_SETTLE_MS = 250;

// Bottom sheet for today's budget. `open` is the single source of truth, like DeleteDialog.
// The sheet scrolls (max height is the visible viewport, which shrinks with the keyboard), so Save and Clear
// stay reachable above the keyboard and at large text sizes instead of being clipped.
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
  const status = parsed.ok && parsed.value !== null ? budgetStatus(cartAmount, parsed.value) : null;
  const over = status?.state === "over";

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
      className="mx-auto mb-0 mt-auto max-h-[100dvh] w-full max-w-[600px] overflow-y-auto rounded-b-none rounded-t-3xl border-0 bg-[var(--color-surface)] p-0 text-ink [overscroll-behavior:contain] [scrollbar-width:none]"
      aria-labelledby="budget-sheet-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose(); // tap on the dimmed backdrop
      }}
    >
      <form id="budget-form" className="px-4 pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-2" onSubmit={handleSubmit}>
        <div className="mx-auto h-1 w-10 rounded-full bg-[var(--color-sheet-handle)]" aria-hidden="true" />

        <div className="flex items-center justify-between gap-2">
          <h2 id="budget-sheet-title" className="m-0 text-sheet font-semibold">Today’s budget</h2>
          <button id="close-budget" className="tap -mr-3 grid shrink-0 place-items-center rounded-xl bg-transparent p-0 text-ink" type="button" aria-label="Close" onClick={onClose}>
            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p className="mb-4 mt-1 text-body text-muted">Resets every day. Leave empty for no limit.</p>

        <label className="mb-1.5 block text-label font-semibold" htmlFor="budget-input">Spending limit</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-body text-muted" aria-hidden="true">{symbol}</span>
          <input
            id="budget-input"
            ref={inputRef}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="No limit"
            defaultValue={initial}
            aria-invalid={invalid}
            aria-describedby="budget-preview"
            onFocus={(event) => {
              // With the keyboard open there is little room, so bring the field to the middle of what is left.
              const field = event.currentTarget;
              window.setTimeout(() => field.scrollIntoView?.({ block: "center" }), KEYBOARD_SETTLE_MS);
            }}
            onInput={(event) => {
              setDraft(event.currentTarget.value);
              setError(false);
            }}
            className="num min-h-[56px] w-full pl-[calc(3ch+2rem)] text-right text-item font-semibold"
          />
        </div>

        {/* Live preview of what Save would leave. */}
        <div
          id="budget-preview"
          className={`mb-4 mt-3 flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-body ${invalid ? "bg-[var(--color-danger-soft)] text-[var(--color-danger)]" : "bg-[var(--color-budget-surface)] text-[var(--color-budget-text)]"}`}
          aria-live="polite"
        >
          {invalid ? (
            <span>Enter a valid amount.</span>
          ) : status === null ? (
            <>
              <span>Remaining</span>
              <span className="font-semibold">No limit</span>
            </>
          ) : (
            <>
              <span>{over ? "Over by" : "Remaining"}</span>
              <span className={`num font-semibold ${over ? "text-[var(--color-danger)]" : "text-green"}`}>{money.format(status.amount)}</span>
            </>
          )}
        </div>

        <button className="tap block w-full rounded-xl bg-green-fill px-4 text-body font-semibold text-on-action" type="submit">Save</button>
        {budget !== null && (
          <button
            id="clear-budget"
            className="tap mt-1 block w-full rounded-xl bg-transparent px-4 text-body font-semibold text-muted"
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

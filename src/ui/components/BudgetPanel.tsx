import { useRef, type FormEvent } from "react";
import type { CurrencyCode } from "../../domain/types";

interface BudgetPanelProps {
  currency: CurrencyCode;
  symbol: string;
  budget: number | null;
  status: string;
  onCurrencyChange(currency: CurrencyCode): void;
  onSaveBudget(raw: string): void;
}

export function BudgetPanel({ currency, symbol, budget, status, onCurrencyChange, onSaveBudget }: BudgetPanelProps) {
  const budgetRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSaveBudget(budgetRef.current?.value ?? "");
  }

  return (
    <form id="budget-form" className="mb-4 rounded-[14px] border border-[#e2e9df] bg-white px-[14px] py-3" onSubmit={handleSubmit}>
      <div className="group mb-2">
        <div className="flex items-center gap-[7px]">
          <label className="flex items-center gap-[6px] text-[.72rem] font-bold text-[#3e5745]" htmlFor="currency-select">
            Currency
            <select
              id="currency-select"
              className="max-w-[165px] rounded-lg border border-[#dfe6dc] bg-white px-[7px] py-[5px] font-sans text-[.72rem] font-medium text-ink"
              value={currency}
              onChange={(event) => onCurrencyChange(event.currentTarget.value as CurrencyCode)}
            >
              <option value="PHP">Philippine peso (PHP)</option>
              <option value="VND">Vietnamese đồng (VND)</option>
              <option value="USD">US dollar (USD)</option>
            </select>
          </label>
          <button className="size-[18px] shrink-0 rounded-full border border-[#b8c5b8] bg-white p-0 text-[.7rem] font-bold text-[#657568]" type="button" aria-label="About currency selection" aria-describedby="currency-tooltip">i</button>
        </div>
        <span id="currency-tooltip" className="pointer-events-none mx-auto mt-2 hidden w-full max-w-[280px] rounded-lg bg-ink px-[10px] py-2 text-center text-[.72rem] font-medium leading-[1.35] text-white shadow-[0_4px_14px_#0002] group-hover:block group-focus-within:block" role="tooltip">
          Changing currency updates formatting only; it doesn’t convert your amounts.
        </span>
      </div>
      <div className="mb-[7px] flex items-center justify-between gap-3">
        <label className="text-[.82rem] font-bold text-[#3e5745]" htmlFor="budget-input">Today’s budget</label>
      </div>
      <div className="relative flex items-center gap-2">
        <span id="budget-currency" className="absolute left-3 text-[.9rem] text-[#718073]" aria-hidden="true">{symbol}</span>
        <input
          id="budget-input"
          ref={budgetRef}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          placeholder="Set a spending limit"
          defaultValue={budget === null ? "" : String(budget)}
          className="!h-10 min-w-0 flex-1 !py-0 !pl-[27px] text-[.88rem]"
        />
        <button className="min-h-10 rounded-xl bg-green px-[14px] text-[.83rem] font-bold text-white" type="submit">Save</button>
      </div>
      <p id="budget-status" className="mb-0 mt-[6px] min-h-[1em] text-[.73rem] text-[#78857a]" aria-live="polite">{status}</p>
    </form>
  );
}

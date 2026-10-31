interface BudgetRowProps {
  budgetText: string | null; // e.g. "₱500.00"; null when no budget is set today
  status: string; // short, e.g. "₱400.00 left"
  over: boolean;
  onOpen(): void;
}

const chevron = (
  <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

// One tappable line that replaces the always-open budget card.
export function BudgetRow({ budgetText, status, over, onOpen }: BudgetRowProps) {
  return (
    <button
      id="budget-row"
      className={`mb-3 flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[14px] border px-4 text-left ${over ? "border-[#f4c2ab] bg-[#fff0e8] text-[#923d27]" : "border-[#e2e9df] bg-white text-ink"}`}
      type="button"
      onClick={onOpen}
    >
      <span className="min-w-0 text-[.95rem] font-semibold">
        {budgetText === null ? "Set a daily budget" : <>Today’s budget <span className={`font-normal ${over ? "" : "text-muted"}`}>{budgetText}</span></>}
      </span>
      <span className={`flex shrink-0 items-center gap-1 text-[.88rem] font-bold ${over ? "" : "text-green"}`}>
        <span id="budget-status">{status}</span>
        {chevron}
      </span>
    </button>
  );
}

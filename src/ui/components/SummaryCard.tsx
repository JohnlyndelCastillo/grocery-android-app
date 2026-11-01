import type { ReactNode, RefObject } from "react";
import type { BudgetStatus } from "../../domain/budget";
import type { Money } from "../format";
import { useCompactHeader } from "../hooks/useCompactHeader";

interface SummaryCardProps {
  cartTotal: string;
  plannedTotal: string;
  /** Today's budget, or null when none is set. */
  budget: number | null;
  status: BudgetStatus;
  money: Money;
  /** The page scroller, so the totals can hide from screen readers once the bar shows them instead. */
  scrollerRef: RefObject<HTMLElement | null>;
  onOpenBudget(): void;
}

const chevron = (
  <svg className="size-5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

// One card: what is in the cart and planned, then today's budget as a single tappable row that opens the
// budget sheet. States: remaining ("Remaining"), over ("Over by", destructive color), exactly on budget
// ("Remaining PHP 0") and no budget ("Not set" with a "Set budget" prompt).
export function SummaryCard({ cartTotal, plannedTotal, budget, status, money, scrollerRef, onOpenBudget }: SummaryCardProps) {
  const compact = useCompactHeader(scrollerRef);
  const over = status.state === "over";

  const remaining: ReactNode =
    budget === null ? (
      <span className="text-body font-semibold text-green">Set budget</span>
    ) : (
      <>
        <span className="block text-label text-muted">{over ? "Over by" : "Remaining"}</span>
        <span className={`num block text-body font-semibold ${over ? "text-[var(--color-danger)]" : "text-green"}`}>{money.format(status.amount)}</span>
      </>
    );

  return (
    <section className="mb-4 overflow-hidden rounded-2xl bg-[var(--color-surface)]" aria-label="Spending summary">
      <div className="totals flex flex-wrap items-start justify-between gap-x-4 gap-y-3 p-4" aria-hidden={compact}>
        <div id="cart-card" className="total-card min-w-0" aria-label={`In your cart ${cartTotal}${over ? ", over today's budget" : ""}`}>
          <span className="block text-label text-muted">In your cart</span>
          <strong className="num block text-total font-bold text-green">{cartTotal}</strong>
        </div>
        <div className="total-card ml-auto min-w-0 text-right">
          <span className="block text-label text-muted">Planned total</span>
          <strong className="num block text-[1.25rem]/[1.3] font-bold text-ink">{plannedTotal}</strong>
        </div>
      </div>

      <button
        id="budget-row"
        className="tap flex w-full items-center justify-between gap-3 rounded-none border-t border-[var(--color-line)] bg-transparent px-4 py-3 text-left text-ink"
        type="button"
        onClick={onOpenBudget}
      >
        <span className="min-w-0">
          <span className="block text-label text-muted">Today’s budget</span>
          <span className="num block text-body font-semibold">{budget === null ? "Not set" : money.format(budget)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-right">
          <span id="budget-status">{remaining}</span>
          {chevron}
        </span>
      </button>
    </section>
  );
}

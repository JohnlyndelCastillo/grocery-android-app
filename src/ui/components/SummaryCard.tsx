import type { BudgetStatus } from "../../domain/budget";
import type { Money } from "../format";

interface SummaryCardProps {
  cartTotal: string;
  plannedTotal: string;
  /** Today's budget, or null when none is set. */
  budget: number | null;
  status: BudgetStatus;
  money: Money;
  onOpenBudget(): void;
}

// The list's outlined totals card, followed by quiet budget chips. The whole budget row opens the sheet.
export function SummaryCard({ cartTotal, plannedTotal, budget, status, money, onOpenBudget }: SummaryCardProps) {
  const over = status.state === "over";
  const remaining =
    budget === null ? "Set budget" : over ? `${money.format(status.amount)} over` : `${money.format(status.amount)} left`;

  return (
    <section id="list-summary" className="summary-card" aria-label="List totals">
      <div className="totals flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div id="cart-card" className="total-card min-w-0" aria-label={`In your cart ${cartTotal}${over ? ", over today's budget" : ""}`}>
          <span className="summary-label">In your cart</span>
          <strong className="num block text-total font-medium text-green">{cartTotal}</strong>
        </div>
        <div className="total-card ml-auto min-w-0 text-right">
          <span className="summary-label">Planned total</span>
          <strong className="num block text-[1.125rem]/[1.3] font-medium text-ink">{plannedTotal}</strong>
        </div>
      </div>

      <button
        id="budget-row"
        className="budget-inline flex flex-wrap"
        type="button"
        onClick={onOpenBudget}
        aria-label="Edit today's budget"
      >
        <span id="budget-chip" className="budget-chip">Today’s budget · <strong className="num font-medium">{budget === null ? "Not set" : money.format(budget)}</strong></span>
        <span id="budget-status" className={`remaining-chip ml-auto ${budget === null ? "is-quiet" : over ? "is-over" : ""}`}>{remaining}</span>
      </button>
    </section>
  );
}

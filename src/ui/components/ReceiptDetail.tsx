import { budgetStatus } from "../../domain/budget";
import { lineTotal } from "../../domain/totals";
import type { Receipt } from "../../domain/types";
import { formatReceiptDate, makeMoney } from "../format";

interface ReceiptDetailProps {
  receipt: Receipt | null;
  onDelete(): void;
}

// A saved trip, top to bottom: when, the total, each line, how it compared with that day's budget, and Delete.
// It is a snapshot, so it uses the currency the trip was made in, not the one selected now.
export function ReceiptDetail({ receipt, onDelete }: ReceiptDetailProps) {
  if (!receipt) return null;
  const money = makeMoney(receipt.currency);
  const status = budgetStatus(receipt.total, receipt.budget);
  const over = status.state === "over";

  return (
    <div id="receipt-detail" className="pt-1">
      <p id="receipt-date" className="m-0 text-body text-muted">{formatReceiptDate(receipt.finishedAt)}</p>

      <section className="mt-4 rounded-2xl bg-[var(--color-surface)] p-4" aria-label="Receipt total">
        <span className="block text-label text-muted">Total</span>
        <strong id="receipt-total" className="num block text-total font-bold text-green">{money.format(receipt.total)}</strong>
      </section>

      <div className="mb-2 mt-6 flex items-baseline justify-between gap-3 px-1 text-label font-semibold text-muted" aria-hidden="true">
        <span>Items</span>
        <span>Line total</span>
      </div>
      <ul className="m-0 list-none overflow-hidden rounded-2xl bg-[var(--color-surface)] p-0" aria-label="Items">
        {receipt.lines.map((line, index) => (
          <li key={index} className="receipt-line flex items-start justify-between gap-3 border-b border-[var(--color-settings-border)] px-4 py-3 last:border-b-0">
            <span className="min-w-0">
              <span className="block text-item font-semibold [overflow-wrap:anywhere]">{line.name}</span>
              <span className="num block text-label text-muted">{line.qty} × {money.format(line.price)}</span>
            </span>
            <span className="num shrink-0 whitespace-nowrap pt-0.5 text-body font-semibold">{money.format(lineTotal({ ...line, id: "", checked: true }))}</span>
          </li>
        ))}
      </ul>

      {receipt.budget !== null && (
        <section id="receipt-budget" className="mt-4 rounded-2xl bg-[var(--color-budget-surface)] px-4 py-3 text-[var(--color-budget-text)]" aria-label="Budget that day">
          <div className="flex items-baseline justify-between gap-3 py-1 text-body">
            <span>Today’s budget</span>
            <span className="num font-semibold text-ink">{money.format(receipt.budget)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-1 text-body">
            <span>{over ? "Over by" : "Left for today"}</span>
            <span className={`num font-bold ${over ? "text-[var(--color-danger)]" : "text-green"}`}>{money.format(status.state === "none" ? 0 : status.amount)}</span>
          </div>
        </section>
      )}

      <button
        id="delete-receipt"
        className="tap mt-6 block w-full rounded-xl bg-[var(--color-danger-soft)] px-4 text-body font-semibold text-[var(--color-danger)]"
        type="button"
        onClick={onDelete}
      >
        Delete receipt
      </button>
    </div>
  );
}

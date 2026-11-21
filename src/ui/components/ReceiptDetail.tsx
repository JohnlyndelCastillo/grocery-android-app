import { budgetStatus } from "../../domain/budget";
import { lineTotal, round2 } from "../../domain/totals";
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
  const savedRemaining = receipt.remainingBudgetAtTime;
  const hasSavedRemaining = typeof savedRemaining === "number";
  const remainingAmount = hasSavedRemaining ? Math.abs(round2(savedRemaining)) : status.state === "none" ? 0 : status.amount;
  const remainingOver = hasSavedRemaining ? savedRemaining < 0 : over;

  return (
    <div id="receipt-detail" className="pt-1">
      <p id="receipt-date" className="m-0 text-label text-muted">{formatReceiptDate(receipt.finishedAt)}</p>
      <p id="receipt-context" className="m-0 mt-0.5 text-[0.8125rem] font-medium text-ink">{receipt.storeName ?? receipt.listName ?? "Shopping trip"}</p>

      <section className="receipt-total-card mt-4" aria-label="Receipt total">
        <span className="summary-label">Total</span>
        <strong id="receipt-total" className="num block text-total font-medium text-green">{money.format(receipt.total)}</strong>
      </section>

      <div className="mb-2 mt-6 flex items-baseline justify-between gap-3 px-1 text-label font-medium text-muted" aria-hidden="true">
        <span>Items</span>
        <span>Line total</span>
      </div>
      <ul className="receipt-lines" aria-label="Items">
        {receipt.lines.map((line, index) => (
          <li key={index} className="receipt-line">
            <span className="min-w-0">
              <span className="block text-[0.9375rem] font-medium [overflow-wrap:anywhere]">{line.name}</span>
              <span className="num block text-label text-muted">{line.qty} × {money.format(line.price)}</span>
            </span>
            <span className="num shrink-0 whitespace-nowrap pt-0.5 text-body font-medium">{money.format(lineTotal({ ...line, id: "", checked: true }))}</span>
          </li>
        ))}
      </ul>

      {receipt.budget !== null && (
        <section id="receipt-budget" className="receipt-budget" aria-label="Budget that day">
          <div className="flex items-baseline justify-between gap-3 py-1 text-body">
            <span>Today’s budget</span>
            <span className="num font-medium text-ink">{money.format(receipt.budget)}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-1 text-body">
            <span>{remainingOver ? "Over by" : hasSavedRemaining ? "Left after this trip" : "Left for today"}</span>
            <span className={`num font-medium ${remainingOver ? "text-[var(--color-danger)]" : "text-green"}`}>{money.format(remainingAmount)}</span>
          </div>
        </section>
      )}

      <button id="delete-receipt" className="delete-receipt tap" type="button" onClick={onDelete}>Delete receipt</button>
    </div>
  );
}

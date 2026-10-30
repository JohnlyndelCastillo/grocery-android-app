import { budgetStatus } from "../../domain/budget";
import { lineTotal } from "../../domain/totals";
import type { Receipt } from "../../domain/types";
import { budgetMessage, currencyFormatter, formatReceiptDate } from "../format";

interface ReceiptDetailProps {
  receipt: Receipt | null;
  onDelete(): void;
}

export function ReceiptDetail({ receipt, onDelete }: ReceiptDetailProps) {
  if (!receipt) return null;
  const money = currencyFormatter(receipt.currency);
  const status = budgetStatus(receipt.total, receipt.budget);

  return (
    <div id="receipt-detail" className="pt-5">
      <p id="receipt-date" className="m-0 text-[.85rem] text-muted">{formatReceiptDate(receipt.finishedAt)}</p>
      <ul className="m-0 mt-3 list-none border-t border-[#e1e8df] p-0">
        {receipt.lines.map((line, index) => (
          <li key={index} className="receipt-line flex items-start justify-between gap-3 border-b border-[#e1e8df] py-3">
            <span className="min-w-0">
              <span className="block break-words text-[.95rem] text-[#344a39]">{line.name}</span>
              <span className="block text-[.78rem] text-muted">{line.qty} × {money.format(line.price)}</span>
            </span>
            <span className="whitespace-nowrap text-[.92rem] text-[#344a39]">{money.format(lineTotal({ ...line, id: "", checked: true }))}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between py-4">
        <span className="font-bold text-[#344a39]">Total</span>
        <strong id="receipt-total" className="text-[1.15rem] text-green-dark">{money.format(receipt.total)}</strong>
      </div>
      {receipt.budget !== null && (
        <p id="receipt-budget" className="m-0 text-[.8rem] text-[#78857a]">
          Budget {money.format(receipt.budget)} · {budgetMessage(status, money)}
        </p>
      )}
      <button
        id="delete-receipt"
        className="mt-6 min-h-[46px] w-full rounded-xl border border-[#e3c5c1] bg-white font-bold text-[#ad5147] hover:bg-[#fff0ed]"
        type="button"
        onClick={onDelete}
      >
        Delete receipt
      </button>
    </div>
  );
}

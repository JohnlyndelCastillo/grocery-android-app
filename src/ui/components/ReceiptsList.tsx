import type { Receipt } from "../../domain/types";
import { currencyFormatter, formatReceiptDate } from "../format";

interface ReceiptsListProps {
  receipts: Receipt[];
  onOpen(id: string): void;
}

export function ReceiptsList({ receipts, onOpen }: ReceiptsListProps) {
  if (receipts.length === 0) {
    return (
      <p id="receipts-empty" className="mt-6 rounded-[15px] border border-dashed border-[#cbd8c9] px-4 py-6 text-center text-[.88rem] text-[#718073]">
        No receipts yet. Tap “Finish trip” in your cart to save one.
      </p>
    );
  }
  return (
    <ul id="receipts-list" className="m-0 list-none p-0">
      {receipts.map((receipt) => {
        const count = receipt.lines.length;
        return (
          <li key={receipt.id}>
            <button
              className="receipt-row flex min-h-[64px] w-full items-center justify-between gap-3 rounded-none border-b border-[#e1e8df] bg-transparent px-1 text-left hover:bg-[#edf3ea]"
              type="button"
              onClick={() => onOpen(receipt.id)}
            >
              <span className="min-w-0">
                <span className="block text-[.95rem] text-[#344a39]">{formatReceiptDate(receipt.finishedAt)}</span>
                <span className="block text-[.78rem] text-muted">{count} {count === 1 ? "item" : "items"}</span>
              </span>
              <strong className="whitespace-nowrap text-[.95rem] text-green-dark">{currencyFormatter(receipt.currency).format(receipt.total)}</strong>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

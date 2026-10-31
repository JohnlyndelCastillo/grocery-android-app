import type { Receipt } from "../../domain/types";
import { currencyFormatter, formatReceiptDate } from "../format";
import { SettingsGroup, SettingsRow } from "./SettingsGroup";

interface ReceiptsListProps {
  receipts: Receipt[];
  onOpen(id: string): void;
}

export function ReceiptsList({ receipts, onOpen }: ReceiptsListProps) {
  if (receipts.length === 0) {
    return (
      <p id="receipts-empty" className="mt-6 rounded-[15px] border border-dashed border-[var(--color-empty-border)] px-4 py-6 text-center text-[.88rem] text-[var(--color-empty-muted)]">
        No receipts yet. Tap “Finish trip” in your cart to save one.
      </p>
    );
  }
  return (
    <SettingsGroup className="mt-5">
      <ul id="receipts-list" className="m-0 list-none p-0">
        {receipts.map((receipt) => {
          const count = receipt.lines.length;
          return (
            <li key={receipt.id}>
              <SettingsRow
                className="receipt-row min-h-[4rem] gap-3"
                onClick={() => onOpen(receipt.id)}
              >
                <span className="min-w-0">
                  <span className="block text-[.95rem] text-[var(--color-settings-ink)]">{formatReceiptDate(receipt.finishedAt)}</span>
                  <span className="block text-[.78rem] text-muted">{count} {count === 1 ? "item" : "items"}</span>
                </span>
                <strong className="whitespace-nowrap text-[.95rem] text-green-dark">{currencyFormatter(receipt.currency).format(receipt.total)}</strong>
              </SettingsRow>
            </li>
          );
        })}
      </ul>
    </SettingsGroup>

  );
}

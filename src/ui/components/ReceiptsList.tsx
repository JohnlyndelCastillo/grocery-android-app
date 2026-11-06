import type { Receipt } from "../../domain/types";
import { formatReceiptDate, makeMoney } from "../format";
import { ChevronIcon, SettingsGroup, SettingsRow } from "./SettingsGroup";

interface ReceiptsListProps {
  receipts: Receipt[];
  onOpen(id: string): void;
}

export function ReceiptsList({ receipts, onOpen }: ReceiptsListProps) {
  if (receipts.length === 0) {
    return (
      <p id="receipts-empty" className="mt-2 rounded-2xl border border-dashed border-[var(--color-empty-border)] px-4 py-6 text-center text-body text-[var(--color-empty-muted)]">
        No receipts yet.
      </p>
    );
  }
  return (
    <SettingsGroup className="mt-2">
      <ul id="receipts-list" className="m-0 list-none p-0">
        {receipts.map((receipt) => {
          const count = receipt.lines.length;
          return (
            <li key={receipt.id}>
              <SettingsRow className="receipt-row" onClick={() => onOpen(receipt.id)}>
                <span className="min-w-0">
                  <span className="block text-body font-medium">{formatReceiptDate(receipt.finishedAt)}</span>
                  <span className="block text-label text-muted">{count} {count === 1 ? "item" : "items"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <strong className="num whitespace-nowrap text-body font-semibold text-green">{makeMoney(receipt.currency).format(receipt.total)}</strong>
                  <ChevronIcon />
                </span>
              </SettingsRow>
            </li>
          );
        })}
      </ul>
    </SettingsGroup>
  );
}

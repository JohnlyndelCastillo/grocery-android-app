import { localMonthKey } from "../../domain/dates";
import { receiptsByMonth } from "../../domain/selectors";
import type { GroceryList } from "../hooks/useGroceryList";
import { formatMonthLabel, formatShortDate, itemCountLabel, makeMoney, tripCountLabel } from "../format";
import { SearchFilters } from "./SearchFilters";

interface HistoryPageProps {
  app: GroceryList;
  onOpenReceipt(receiptId: string): void;
  onStartList(): void;
}

export function HistoryPage({ app, onOpenReceipt, onStartList }: HistoryPageProps) {
  const months = receiptsByMonth(app.receipts);
  const currentMonth = localMonthKey();
  const thisMonth = app.receipts.filter((receipt) => localMonthKey(new Date(receipt.finishedAt)) === currentMonth);
  const sameCurrency = thisMonth.filter((receipt) => receipt.currency === app.currency);
  const total = sameCurrency.reduce((sum, receipt) => sum + receipt.total, 0);
  const otherCurrency = thisMonth.length - sameCurrency.length;
  const stores = [...new Set(sameCurrency.map((receipt) => receipt.storeName).filter((name): name is string => Boolean(name)))];
  const money = makeMoney(app.currency);

  return (
    <div id="history-page" className="page">
      <main id="screen-scroll" className="page-scroll">
        <h1 className="page-heading">History</h1>

        <SearchFilters id="history-search-controls" label="Search history" placeholder="Search receipts" filters={["All trips", "This month", "By store"]} />

        {app.receipts.length === 0 ? (
          <section className="card empty-history mt-5" aria-label="No receipts">
            <p id="receipts-empty" className="m-0 text-[0.875rem] font-medium text-ink">No receipts yet.</p>
            <p className="mb-3 mt-1 text-[0.75rem] text-muted">Finish a trip and its receipt will appear here.</p>
            <button className="new-list" type="button" onClick={onStartList}>Go to your lists</button>
          </section>
        ) : (
          <>
            <section className="card history-summary" aria-label={`${formatMonthLabel(currentMonth)} spending`}>
              <div className="eyebrow">{formatMonthLabel(currentMonth)} spending</div>
              <div className="history-number num">{money.format(total)}</div>
              <div className="history-foot">
                {tripCountLabel(sameCurrency.length)}{stores.length > 0 ? ` · ${stores.slice(0, 2).join(", ")}` : ""}
                {otherCurrency > 0 ? ` · ${otherCurrency} in another currency not counted` : ""}
              </div>
            </section>

            <div id="receipts-list">
              {months.map((month) => (
                <section key={month.key} className="history-month" aria-label={`${formatMonthLabel(month.key)} receipts`}>
                  <div className="month-heading">
                    <h2>{formatMonthLabel(month.key)}</h2>
                    <span>{tripCountLabel(month.receipts.length)}</span>
                  </div>
                  <div className="card history-card">
                    {month.receipts.map((receipt) => (
                      <button key={receipt.id} className="history-entry tap" type="button" onClick={() => onOpenReceipt(receipt.id)}>
                        <span className="receipt-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></svg>
                        </span>
                        <span className="history-info">
                          <span className="history-store block truncate">{receipt.storeName ?? receipt.listName ?? "Shopping trip"}</span>
                          <span className="history-meta block">{formatShortDate(receipt.finishedAt)} · {itemCountLabel(receipt.lines.length)}</span>
                        </span>
                        <span className="history-amount num">{makeMoney(receipt.currency).format(receipt.total)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

import { continueList, listSummary, recentReceipts } from "../../domain/selectors";
import type { GroceryList } from "../hooks/useGroceryList";
import { formatShortDate, formatToday, itemCountLabel, makeMoney } from "../format";

interface HomePageProps {
  app: GroceryList;
  onOpenBudget(): void;
  onOpenList(listId: string): void;
  onOpenHistory(): void;
  onOpenReceipt(receiptId: string): void;
  onNewList(): void;
  onRepeatTrip(): void;
}

export function HomePage({ app, onOpenBudget, onOpenList, onOpenHistory, onOpenReceipt, onNewList, onRepeatTrip }: HomePageProps) {
  const budget = app.dailyBudget;
  const status = app.budgetStatus;
  const spent = app.spentToday;
  const over = status.state === "over";
  const percent = budget === null || budget <= 0 ? 0 : Math.min(100, Math.round((spent.amount / budget) * 100));
  const list = continueList(app.state);
  const summary = list ? listSummary(list) : null;
  const recent = recentReceipts(app.state, 3);
  const hasLists = app.lists.length > 0;

  const budgetAmount = budget === null ? "No limit" : over ? app.money.format(status.amount) : app.money.format(status.amount);
  const budgetCaption = budget === null ? "Set a budget to track today" : over ? `over of ${app.money.format(budget)}` : `left of ${app.money.format(budget)}`;

  return (
    <div id="home-page" className="page home-page">
      <main id="screen-scroll" className="page-scroll">
        <p className="eyebrow">{formatToday()}</p>
        <h1 className="page-heading">Today</h1>

        <button id="home-budget-card" className="budget-card mt-4 block w-full text-left" type="button" onClick={onOpenBudget} aria-label="Edit today's budget">
          <span className="flex items-center justify-between gap-3">
            <span className="eyebrow budget-eyebrow">Today’s budget</span>
            <span className="budget-edit">Edit ›</span>
          </span>
          <span id="home-budget-amount" className={`budget-amount num block ${over ? "is-over" : ""}`}>{budgetAmount}</span>
          <span className="budget-caption block">{budgetCaption}</span>
          <span className="budget-track block" role="progressbar" aria-label="Budget spent today" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
            <span className="budget-fill block" style={{ width: `${percent}%` }} />
          </span>
          <span className="budget-foot flex items-center justify-between gap-3">
            <span>Spent {app.money.format(spent.amount)}</span>
            <span>{budget === null ? "No limit" : `${percent}% used`}</span>
          </span>
        </button>
        {spent.otherCurrencyReceipts > 0 && (
          <p className="mt-2 px-1 text-[0.6875rem] text-muted" role="note">
            {spent.otherCurrencyReceipts} {spent.otherCurrencyReceipts === 1 ? "receipt is" : "receipts are"} in another currency and not counted.
          </p>
        )}

        {!hasLists ? (
          <section className="card empty-home mt-4" aria-label="Get started">
            <p className="m-0 text-[0.875rem] font-medium text-ink">No lists yet</p>
            <p className="mb-3 mt-1 text-[0.75rem] text-muted">Create a list to start planning your next trip.</p>
            <button id="home-create-first-list" className="new-list" type="button" onClick={onNewList}>+ Create your first list</button>
          </section>
        ) : list && summary ? (
          <section className="card active-list mt-4" aria-label="Current shopping list">
            <div className="flex items-center justify-between gap-3">
              <button className="min-w-0 flex-1 text-left" type="button" onClick={() => onOpenList(list.id)}>
                <span className="block truncate text-[0.875rem] font-medium text-ink">{list.name}</span>
                <span className="mt-0.5 block truncate text-[0.6875rem] text-muted">
                  {app.stores.find((store) => store.id === list.storeId)?.name ?? "No store"} · {summary.doneCount} of {summary.itemCount} in cart
                </span>
              </button>
              <button className="pill-action" type="button" onClick={() => onOpenList(list.id)}>{summary.doneCount > 0 ? "Continue" : "Open"}</button>
            </div>
            <span className="progress mt-3 block" role="progressbar" aria-label="Current list progress" aria-valuenow={Math.round(summary.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <i className="block" style={{ width: `${summary.progress * 100}%` }} />
            </span>
          </section>
        ) : null}

        <div className={`quick-actions ${hasLists ? "" : "mt-3"}`}>
          {hasLists && <button id="home-new-list" className="quick-action primary" type="button" onClick={onNewList}>+ New list</button>}
          {recent.length > 0 && <button id="home-repeat-trip" className="quick-action" type="button" onClick={onRepeatTrip}>Repeat a trip</button>}
        </div>

        {recent.length > 0 && (
          <>
            <div className="section-head">
              <h2>Recent receipts</h2>
              <button id="home-see-all-receipts" className="text-link" type="button" onClick={onOpenHistory}>See all</button>
            </div>
            <div id="home-recent-receipts" className="card receipt-list">
              {recent.map((receipt) => (
                <button key={receipt.id} className="receipt-row" type="button" onClick={() => onOpenReceipt(receipt.id)}>
                  <span className="min-w-0 text-left">
                    <span className="receipt-store block truncate">{receipt.storeName ?? receipt.listName ?? "Shopping trip"}</span>
                    <span className="receipt-date block">{formatShortDate(receipt.finishedAt)} · {itemCountLabel(receipt.lines.length)}</span>
                  </span>
                  <span className="receipt-price num">{makeMoney(receipt.currency).format(receipt.total)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

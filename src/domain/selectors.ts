import { localDateKey } from "./dates";
import { activeListOf, liveLists, mostRecentList } from "./lists";
import { cartTotal, checkedCount, plannedTotal } from "./totals";
import type { AppStateV2, CurrencyCode, Receipt, ShoppingList } from "./types";

export interface TodaySpending {
  /** Receipts in the selected currency plus the active list's in-cart total. */
  amount: number;
  receiptTotal: number;
  cartTotal: number;
  /** Number of receipts from today excluded because they were saved in another currency. */
  otherCurrencyReceipts: number;
}

export function spentToday(state: AppStateV2, currency: CurrencyCode, now: Date = new Date()): TodaySpending {
  const today = localDateKey(now);
  const active = activeListOf(state);
  const cart = active ? cartTotal(active.items) : 0;
  let receiptTotal = 0;
  let otherCurrencyReceipts = 0;
  for (const receipt of state.receipts) {
    if (localDateKey(new Date(receipt.finishedAt)) !== today) continue;
    if (receipt.currency !== currency) {
      otherCurrencyReceipts += 1;
      continue;
    }
    receiptTotal += receipt.total;
  }
  return {
    amount: Math.round((receiptTotal + cart) * 100) / 100,
    receiptTotal: Math.round(receiptTotal * 100) / 100,
    cartTotal: cart,
    otherCurrencyReceipts,
  };
}

/** The list Home offers to continue: in-cart work first, then the most recently used list. */
export function continueList(state: AppStateV2): ShoppingList | null {
  const live = liveLists(state.lists);
  const withCart = live
    .filter((list) => list.items.some((item) => item.checked))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (withCart.length > 0) return withCart[0];
  const lastUsed = live
    .filter((list) => list.lastShoppedAt !== null)
    .sort((a, b) => (b.lastShoppedAt ?? "").localeCompare(a.lastShoppedAt ?? ""));
  const active = activeListOf(state);
  return lastUsed[0] ?? mostRecentList(live) ?? (active && active.archivedAt === null ? active : null);
}

export interface ListSummary {
  itemCount: number;
  doneCount: number;
  planned: number;
  inCart: number;
  progress: number; // 0..1
}

export function listSummary(list: ShoppingList): ListSummary {
  const itemCount = list.items.length;
  const doneCount = checkedCount(list.items);
  return {
    itemCount,
    doneCount,
    planned: plannedTotal(list.items),
    inCart: cartTotal(list.items),
    progress: itemCount === 0 ? 0 : doneCount / itemCount,
  };
}

export function recentReceipts(state: AppStateV2, limit = 3): Receipt[] {
  return [...state.receipts].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt)).slice(0, limit);
}

export interface ReceiptMonth {
  key: string; // "2026-11"
  receipts: Receipt[];
}

/** Newest month first, newest receipt first inside each month. */
export function receiptsByMonth(receipts: Receipt[]): ReceiptMonth[] {
  const sorted = [...receipts].sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  const months: ReceiptMonth[] = [];
  for (const receipt of sorted) {
    const date = new Date(receipt.finishedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const month = months.find((entry) => entry.key === key);
    if (month) month.receipts.push(receipt);
    else months.push({ key, receipts: [receipt] });
  }
  return months;
}

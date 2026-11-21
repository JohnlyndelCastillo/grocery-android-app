import type { CurrencyCode, Item, Receipt } from "./types";
import { cartTotal } from "./totals";

export interface ReceiptContext {
  currency: CurrencyCode;
  budget: number | null;
  now?: Date;
  id?: string;
  listId?: string | null;
  listName?: string | null;
  storeName?: string | null;
  remainingBudgetAtTime?: number | null;
}

// Only checked (in-cart) items are bought, so only those go on the receipt.
// Returns null when the cart is empty: there is nothing to save.
export function buildReceipt(
  items: Item[],
  {
    currency,
    budget,
    now = new Date(),
    id = crypto.randomUUID(),
    listId = null,
    listName = null,
    storeName = null,
    remainingBudgetAtTime = null,
  }: ReceiptContext,
): Receipt | null {
  const bought = items.filter((i) => i.checked);
  if (bought.length === 0) return null;
  return {
    id,
    finishedAt: now.toISOString(),
    currency,
    lines: bought.map(({ name, qty, price }) => ({ name, qty, price })),
    total: cartTotal(items),
    budget,
    listId,
    listName,
    storeName,
    remainingBudgetAtTime,
  };
}

// Newest receipt first.
export const addReceipt = (receipts: Receipt[], receipt: Receipt): Receipt[] => [receipt, ...receipts];

export const removeReceipt = (receipts: Receipt[], id: string): Receipt[] =>
  receipts.filter((r) => r.id !== id);

/** Purchased lines become a fresh, fully unchecked list. The receipt is never changed. */
export function itemsFromReceipt(receipt: Receipt, id: () => string = () => crypto.randomUUID()): Item[] {
  return receipt.lines.map((line) => ({ id: id(), name: line.name, qty: line.qty, price: line.price, checked: false }));
}

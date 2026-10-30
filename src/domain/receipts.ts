import type { CurrencyCode, Item, Receipt } from "./types";
import { cartTotal } from "./totals";

export interface ReceiptContext {
  currency: CurrencyCode;
  budget: number | null;
  now?: Date;
  id?: string;
}

// Only checked (in-cart) items are bought, so only those go on the receipt.
// Returns null when the cart is empty: there is nothing to save.
export function buildReceipt(
  items: Item[],
  { currency, budget, now = new Date(), id = crypto.randomUUID() }: ReceiptContext,
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
  };
}

// Newest receipt first.
export const addReceipt = (receipts: Receipt[], receipt: Receipt): Receipt[] => [receipt, ...receipts];

export const removeReceipt = (receipts: Receipt[], id: string): Receipt[] =>
  receipts.filter((r) => r.id !== id);

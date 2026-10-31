// The shape of one grocery item. TypeScript checks every use of it.
export interface Item {
  id: string;
  name: string;
  qty: number;
  price: number; // price per unit
  checked: boolean; // true = already in the cart
}

export type CurrencyCode = "PHP" | "VND" | "USD";

// One purchased line, frozen at the moment the trip was finished.
export interface ReceiptLine {
  name: string;
  qty: number;
  price: number; // price per unit
}

// A saved snapshot of a finished trip. It copies the data instead of pointing at
// items, so later edits or deletes on the list never change an old receipt.
export interface Receipt {
  id: string;
  finishedAt: string; // ISO timestamp
  currency: CurrencyCode; // the currency in use then, so old receipts keep their formatting
  lines: ReceiptLine[];
  total: number;
  budget: number | null; // that day's budget, if one was set
}

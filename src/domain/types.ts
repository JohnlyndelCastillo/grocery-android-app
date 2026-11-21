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
  // Context snapshots. Optional so receipts saved before v3 keep loading.
  listId?: string | null;
  listName?: string | null;
  storeName?: string | null;
  // What was left of that day's budget when the trip was finished.
  remainingBudgetAtTime?: number | null;
}

// A named shopping list. Items stay in the existing shape so the grocery row
// components and their tests keep working unchanged.
export interface ShoppingList {
  id: string;
  name: string;
  storeId: string | null;
  items: Item[];
  createdAt: string;
  updatedAt: string;
  lastShoppedAt: string | null;
  archivedAt: string | null;
}

// A store is only a grouping label for lists. Deleting one never deletes a list
// or a receipt; it just clears the association.
export interface Store {
  id: string;
  name: string;
  color: string;
}

// The single versioned record written to local storage from v3 onward.
export interface AppStateV2 {
  schemaVersion: 2;
  lists: ShoppingList[];
  stores: Store[];
  receipts: Receipt[];
  activeListId: string | null;
}

import type { Item, Receipt } from "../domain/types";
import { isCurrency } from "./currency";

// The rest of the app only knows this interface, so swapping localStorage
// for IndexedDB or Capacitor Preferences later only touches this file.
export interface GroceryStorage {
  loadItems(): Item[];
  saveItems(items: Item[]): void;
  loadDailyBudget(): number | null;
  saveDailyBudget(amount: number | null): void;
  loadReceipts(): Receipt[];
  saveReceipts(receipts: Receipt[]): void;
}

// Same keys as before, so existing data on your phone keeps working.
const KEY = "grocery-items-v1";
const BUDGET_KEY = "grocery-daily-budget-v1";
const RECEIPTS_KEY = "grocery-receipts-v1";

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// Stored data can be old or hand-edited, so check the shape before the UI trusts it.
function isReceipt(value: unknown): value is Receipt {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Partial<Receipt>;
  return (
    typeof r.id === "string" &&
    typeof r.finishedAt === "string" &&
    isCurrency(r.currency) &&
    typeof r.total === "number" &&
    (r.budget === null || typeof r.budget === "number") &&
    Array.isArray(r.lines) &&
    r.lines.every((l) => l && typeof l.name === "string" && typeof l.qty === "number" && typeof l.price === "number")
  );
}

export function localDateKey(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function createLocalStorageAdapter(
  store: KeyValueStore = localStorage,
  today: () => string = localDateKey,
): GroceryStorage {
  return {
    loadItems() {
      try {
        const raw = store.getItem(KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? (parsed as Item[]) : [];
      } catch {
        return [];
      }
    },
    saveItems(items) {
      try {
        store.setItem(KEY, JSON.stringify(items));
      } catch {
        // storage full or blocked; keep the app usable for this session
      }
    },
    loadDailyBudget() {
      try {
        const raw = store.getItem(BUDGET_KEY);
        if (!raw) return null;
        const saved = JSON.parse(raw) as { date?: string; amount?: number };
        return saved.date === today() && typeof saved.amount === "number" ? saved.amount : null;
      } catch {
        return null;
      }
    },
    saveDailyBudget(amount) {
      try {
        if (amount === null) store.removeItem(BUDGET_KEY);
        else store.setItem(BUDGET_KEY, JSON.stringify({ date: today(), amount }));
      } catch {
        // ignore, same reason as above
      }
    },
    loadReceipts() {
      try {
        const raw = store.getItem(RECEIPTS_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed.filter(isReceipt) : [];
      } catch {
        return [];
      }
    },
    saveReceipts(receipts) {
      try {
        store.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
      } catch {
        // storage full or blocked; receipts stay visible for this session only
      }
    },
  };
}

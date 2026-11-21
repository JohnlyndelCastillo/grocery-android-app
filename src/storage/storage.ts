import { localDateKey } from "../domain/dates";
import { createList } from "../domain/lists";
import type { AppStateV2, Item, Receipt, ShoppingList, Store } from "../domain/types";
import { isCurrency } from "./currency";

// The rest of the app only knows this interface, so swapping localStorage
// for IndexedDB or Capacitor Preferences later only touches this file.
export interface GroceryStorage {
  loadState(): AppStateV2;
  saveState(state: AppStateV2): void;
  loadDailyBudget(): number | null;
  saveDailyBudget(amount: number | null): void;
}

// The one versioned record from v3 onward.
export const APP_STATE_KEY = "grocery-app-state-v2";
// Legacy keys. They are kept untouched as a recovery copy for this release.
export const LEGACY_ITEMS_KEY = "grocery-items-v1";
export const LEGACY_RECEIPTS_KEY = "grocery-receipts-v1";
const BUDGET_KEY = "grocery-daily-budget-v1";

type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export const emptyState = (): AppStateV2 => ({ schemaVersion: 2, lists: [], stores: [], receipts: [], activeListId: null });

// Stored data can be old or hand-edited, so check the shape before the UI trusts it.
function isItem(value: unknown): value is Item {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Partial<Item>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.qty === "number" &&
    typeof item.price === "number" &&
    typeof item.checked === "boolean"
  );
}

function isReceipt(value: unknown): value is Receipt {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Partial<Receipt>;
  const optionalString = (field: unknown) => field === undefined || field === null || typeof field === "string";
  const optionalNumber = (field: unknown) => field === undefined || field === null || typeof field === "number";
  return (
    typeof r.id === "string" &&
    typeof r.finishedAt === "string" &&
    isCurrency(r.currency) &&
    typeof r.total === "number" &&
    (r.budget === null || typeof r.budget === "number") &&
    Array.isArray(r.lines) &&
    r.lines.every((l) => l && typeof l.name === "string" && typeof l.qty === "number" && typeof l.price === "number") &&
    optionalString(r.listId) &&
    optionalString(r.listName) &&
    optionalString(r.storeName) &&
    optionalNumber(r.remainingBudgetAtTime)
  );
}

function isShoppingList(value: unknown): value is ShoppingList {
  if (typeof value !== "object" || value === null) return false;
  const list = value as Partial<ShoppingList>;
  return (
    typeof list.id === "string" &&
    typeof list.name === "string" &&
    (list.storeId === null || typeof list.storeId === "string") &&
    Array.isArray(list.items) &&
    list.items.every(isItem) &&
    typeof list.createdAt === "string" &&
    typeof list.updatedAt === "string" &&
    (list.lastShoppedAt === null || typeof list.lastShoppedAt === "string") &&
    (list.archivedAt === null || typeof list.archivedAt === "string")
  );
}

function isStore(value: unknown): value is Store {
  if (typeof value !== "object" || value === null) return false;
  const store = value as Partial<Store>;
  return typeof store.id === "string" && typeof store.name === "string" && typeof store.color === "string";
}

export function isAppStateV2(value: unknown): value is AppStateV2 {
  if (typeof value !== "object" || value === null) return false;
  const state = value as Partial<AppStateV2>;
  return (
    state.schemaVersion === 2 &&
    Array.isArray(state.lists) &&
    state.lists.every(isShoppingList) &&
    Array.isArray(state.stores) &&
    state.stores.every(isStore) &&
    Array.isArray(state.receipts) &&
    state.receipts.every(isReceipt) &&
    (state.activeListId === null || typeof state.activeListId === "string")
  );
}

function normalizeState(state: AppStateV2): AppStateV2 {
  const activeListId = state.lists.some((list) => list.id === state.activeListId) ? state.activeListId : state.lists[0]?.id ?? null;
  return { ...state, activeListId };
}

/** Reads a legacy array key. `missing` means the key was never written; `invalid` means it cannot be trusted. */
function readLegacyArray(store: KeyValueStore, key: string): { status: "missing" } | { status: "invalid" } | { status: "ok"; value: unknown[] } {
  let raw: string | null;
  try {
    raw = store.getItem(key);
  } catch {
    return { status: "invalid" };
  }
  if (raw === null) return { status: "missing" };
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? { status: "ok", value: parsed } : { status: "invalid" };
  } catch {
    return { status: "invalid" };
  }
}

/**
 * Builds a v2 record from the old single-list keys. Returns null when the legacy
 * data is malformed; in that case nothing is written and the old keys stay intact.
 */
export function migrateLegacyState(store: KeyValueStore, now: Date = new Date()): AppStateV2 | null {
  const legacyItems = readLegacyArray(store, LEGACY_ITEMS_KEY);
  const legacyReceipts = readLegacyArray(store, LEGACY_RECEIPTS_KEY);
  if (legacyItems.status === "invalid" || legacyReceipts.status === "invalid") return null;

  // A genuinely fresh install starts without an empty list, so Home can offer a clear create action.
  if (legacyItems.status === "missing" && legacyReceipts.status === "missing") return emptyState();

  const items = legacyItems.status === "ok" ? legacyItems.value.filter(isItem) : [];
  const receipts: Receipt[] = (legacyReceipts.status === "ok" ? legacyReceipts.value.filter(isReceipt) : []).map((receipt) => ({
    ...receipt,
    listId: null,
    listName: "My list",
    storeName: null,
  }));
  const list = createList("My list", { items, now });
  return {
    schemaVersion: 2,
    lists: [list],
    stores: [],
    receipts,
    activeListId: list.id,
  };
}

export function createLocalStorageAdapter(
  store: KeyValueStore = localStorage,
  today: () => string = localDateKey,
  now: () => Date = () => new Date(),
): GroceryStorage {
  function writeState(state: AppStateV2): boolean {
    try {
      store.setItem(APP_STATE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  return {
    loadState() {
      try {
        const raw = store.getItem(APP_STATE_KEY);
        if (raw) {
          try {
            const parsed: unknown = JSON.parse(raw);
            if (isAppStateV2(parsed)) return normalizeState(parsed);
          } catch {
            // Invalid JSON: fall through to a fresh migration from the untouched legacy keys.
          }
        }
      } catch {
        // Storage is unavailable. Fall through; migration below will also fail safely.
      }

      const migrated = migrateLegacyState(store, now());
      if (!migrated) return emptyState();
      // Only a successful write means migration is complete. The legacy keys stay as a recovery copy.
      writeState(migrated);
      return migrated;
    },
    saveState(state) {
      // A failed write keeps the app usable for this session; the previous state stays on disk.
      writeState(state);
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
  };
}

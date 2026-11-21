import { localDateKey } from "../domain/dates";
import { createList } from "../domain/lists";
import type { AppStateV2, Item, Receipt, ShoppingList, Store } from "../domain/types";
import { isCurrency } from "./currency";

// The rest of the app only knows this interface, so swapping localStorage
// for IndexedDB or Capacitor Preferences later only touches this file.
export interface GroceryStorage {
  loadState(): AppStateV2;
  saveState(state: AppStateV2): void;
  /** A persistent warning produced while loading or recovering saved state. */
  getLoadNotice?(): string | null;
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
  const live = state.lists.filter((list) => list.archivedAt === null);
  const activeListId = live.some((list) => list.id === state.activeListId)
    ? state.activeListId
    : [...live].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id ?? null;
  return { ...state, activeListId, receipts: addMissingReceiptBudgetSnapshots(state.receipts) };
}

/**
 * Older receipt records did not save the remaining daily budget. If several trips
 * share a day and currency, reconstruct each snapshot from the receipts up to that trip.
 * A single receipt can keep using the UI's existing, exact budget-minus-total fallback.
 */
function addMissingReceiptBudgetSnapshots(receipts: Receipt[]): Receipt[] {
  const groups = new Map<string, Receipt[]>();
  for (const receipt of receipts) {
    const date = new Date(receipt.finishedAt);
    if (Number.isNaN(date.getTime())) continue;
    const key = `${localDateKey(date)}:${receipt.currency}`;
    const group = groups.get(key) ?? [];
    group.push(receipt);
    groups.set(key, group);
  }

  const updated = new Map<string, Receipt>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    let cumulative = 0;
    for (const receipt of [...group].sort((a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime())) {
      cumulative = Math.round((cumulative + receipt.total) * 100) / 100;
      if (receipt.remainingBudgetAtTime !== undefined && !(receipt.remainingBudgetAtTime === null && receipt.budget !== null)) continue;
      updated.set(receipt.id, {
        ...receipt,
        remainingBudgetAtTime: receipt.budget === null ? null : Math.round((receipt.budget - cumulative) * 100) / 100,
      });
    }
  }
  return receipts.map((receipt) => updated.get(receipt.id) ?? receipt);
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
  let loadNotice: string | null = null;
  let refuseStateWrites = false;
  let backedUpInvalidRaw: string | null = null;

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
      let raw: string | null;
      try {
        raw = store.getItem(APP_STATE_KEY);
      } catch {
        loadNotice = "Saved data could not be read. Changes in this session may not be saved.";
        refuseStateWrites = true;
        return emptyState();
      }

      if (raw !== null) {
        try {
          const parsed: unknown = JSON.parse(raw);
          if (isAppStateV2(parsed)) return normalizeState(parsed);
        } catch {
          // Preserve unreadable bytes below before attempting legacy recovery.
        }

        if (backedUpInvalidRaw !== raw) {
          const recoveryKey = `${APP_STATE_KEY}-recovery-${now().getTime()}-${Math.random().toString(36).slice(2)}`;
          try {
            store.setItem(recoveryKey, raw);
            backedUpInvalidRaw = raw;
          } catch {
            loadNotice = "Saved data was unreadable and could not be backed up. Changes in this session may not be saved.";
            refuseStateWrites = true;
            return emptyState();
          }
        }
        loadNotice = "Saved data was unreadable. A recovery copy was kept; the older list and receipts were restored where available.";
      }

      const migrated = migrateLegacyState(store, now());
      if (!migrated) {
        loadNotice = raw === null
          ? "Older saved data could not be read. The original records were left unchanged."
          : "Saved data was unreadable and backed up, but the older recovery records could not be read. The originals were left unchanged.";
        return emptyState();
      }
      const recovered = normalizeState(migrated);
      // Only a successful write means migration is complete. The legacy keys stay as a recovery copy.
      writeState(recovered);
      return recovered;
    },
    saveState(state) {
      // A failed write keeps the app usable for this session; the previous state stays on disk.
      if (!refuseStateWrites) writeState(state);
    },
    getLoadNotice() {
      return loadNotice;
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

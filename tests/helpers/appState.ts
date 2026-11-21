import { vi } from "vitest";
import type { AppStateV2, Item, Receipt, ShoppingList, Store } from "../../src/domain/types";
import type { GroceryStorage } from "../../src/storage/storage";

/** A grocery item with predictable defaults. */
export function makeItem(overrides: Partial<Item> = {}): Item {
  return { id: "1", name: "Rice", qty: 1, price: 0, checked: false, ...overrides };
}

/** A shopping list with predictable timestamps, so sorting and "last shopped" labels are stable. */
export function makeList(name = "My list", items: Item[] = [], overrides: Partial<ShoppingList> = {}): ShoppingList {
  return {
    id: "list-1",
    name,
    storeId: null,
    items,
    createdAt: "2026-11-01T00:00:00.000Z",
    updatedAt: "2026-11-01T00:00:00.000Z",
    lastShoppedAt: null,
    archivedAt: null,
    ...overrides,
  };
}

export function makeStore(overrides: Partial<Store> = {}): Store {
  return { id: "store-1", name: "Market", color: "#4d7b66", ...overrides };
}

/** A complete v2 record. Tests can pass only the parts they care about. */
export function makeState(overrides: Partial<AppStateV2> = {}): AppStateV2 {
  return { schemaVersion: 2, lists: [], stores: [], receipts: [], activeListId: null, ...overrides };
}

/** One list holding the given items, already active. */
export function stateWithItems(items: Item[], overrides: Partial<AppStateV2> = {}): AppStateV2 {
  const list = makeList("My list", items);
  return makeState({ lists: [list], activeListId: list.id, ...overrides });
}

export interface TestStorage {
  storage: GroceryStorage;
  /** The latest state handed to saveState, or the initial state when nothing was saved. */
  saved(): AppStateV2;
  /** How many times saveState was called. */
  saves(): number;
  /** The current in-memory state. */
  current(): AppStateV2;
}

/**
 * An in-memory GroceryStorage. `loadState` returns the same object until a save replaces it,
 * which mirrors localStorage closely enough for the hook and UI tests.
 */
export function makeStorage(initial: AppStateV2 = makeState(), budget: number | null = null): TestStorage {
  let current = initial;
  let saveCount = 0;
  let lastSaved = initial;
  const storage: GroceryStorage = {
    loadState: vi.fn(() => current),
    saveState: vi.fn((next: AppStateV2) => {
      current = next;
      lastSaved = next;
      saveCount += 1;
    }),
    loadDailyBudget: vi.fn(() => budget),
    saveDailyBudget: vi.fn(),
  };
  return { storage, saved: () => lastSaved, saves: () => saveCount, current: () => current };
}

/** The saved state's only list, for assertions that used to look at saveItems. */
export function savedItems(test: TestStorage, listId = "list-1"): Item[] {
  return test.saved().lists.find((list) => list.id === listId)?.items ?? [];
}

export function makeReceipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: "r1",
    finishedAt: "2026-11-01T14:12:00.000Z",
    currency: "PHP",
    lines: [{ name: "Rice", qty: 2, price: 50 }],
    total: 100,
    budget: null,
    ...overrides,
  };
}

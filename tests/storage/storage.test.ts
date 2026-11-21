import { beforeEach, describe, expect, it } from "vitest";
import { createList } from "../../src/domain/lists";
import type { AppStateV2, Receipt } from "../../src/domain/types";
import {
  APP_STATE_KEY,
  LEGACY_ITEMS_KEY,
  LEGACY_RECEIPTS_KEY,
  createLocalStorageAdapter,
  migrateLegacyState,
} from "../../src/storage/storage";
import { makeItem, makeList, makeReceipt, makeState } from "../helpers/appState";

function fakeStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    raw: (key: string) => values.get(key) ?? null,
  };
}

const legacyItem = makeItem({ id: "legacy-1", name: "Rice", qty: 2, price: 50, checked: true });
const legacyReceipt = makeReceipt({ id: "legacy-r1" });

describe("localStorage adapter: app state", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips the whole v2 record", () => {
    const s = createLocalStorageAdapter();
    const state = makeState({
      lists: [makeList("Groceries", [legacyItem])],
      stores: [{ id: "s1", name: "Market", color: "#4d7b66" }],
      receipts: [legacyReceipt],
      activeListId: "list-1",
    });
    s.saveState(state);
    expect(s.loadState()).toEqual(state);
  });

  it("starts a fresh install with an empty state and no auto-created list", () => {
    const s = createLocalStorageAdapter();
    const state = s.loadState();
    expect(state).toEqual({ schemaVersion: 2, lists: [], stores: [], receipts: [], activeListId: null });
    expect(JSON.parse(localStorage.getItem(APP_STATE_KEY)!)).toEqual(state);
  });

  it("returns an empty state for corrupt v2 data when there is no legacy data", () => {
    localStorage.setItem(APP_STATE_KEY, "{not json");
    expect(createLocalStorageAdapter().loadState().lists).toEqual([]);

    localStorage.setItem(APP_STATE_KEY, JSON.stringify({ schemaVersion: 2, lists: "nope" }));
    expect(createLocalStorageAdapter().loadState().lists).toEqual([]);
  });

  it("normalizes an activeListId that does not point at a list", () => {
    const list = makeList("Groceries", []);
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(makeState({ lists: [list], activeListId: "missing" })));
    expect(createLocalStorageAdapter().loadState().activeListId).toBe(list.id);
  });

  it("keeps the app usable when the storage write fails", () => {
    const store = fakeStore();
    store.setItem = () => { throw new Error("quota exceeded"); };
    const s = createLocalStorageAdapter(store);
    expect(() => s.loadState()).not.toThrow();
    expect(() => s.saveState(makeState())).not.toThrow();
    expect(s.loadState()).toEqual(makeState());
  });
});

describe("legacy migration", () => {
  beforeEach(() => localStorage.clear());

  it("moves legacy items into a My list and keeps the receipts", () => {
    localStorage.setItem(LEGACY_ITEMS_KEY, JSON.stringify([legacyItem]));
    localStorage.setItem(LEGACY_RECEIPTS_KEY, JSON.stringify([legacyReceipt]));

    const state = createLocalStorageAdapter().loadState();
    expect(state.lists).toHaveLength(1);
    expect(state.lists[0]).toMatchObject({ name: "My list", items: [legacyItem], storeId: null });
    expect(state.activeListId).toBe(state.lists[0].id);
    expect(state.receipts).toEqual([{ ...legacyReceipt, listId: null, listName: "My list", storeName: null }]);
  });

  it("keeps the legacy keys as a recovery copy", () => {
    const itemsJson = JSON.stringify([legacyItem]);
    const receiptsJson = JSON.stringify([legacyReceipt]);
    localStorage.setItem(LEGACY_ITEMS_KEY, itemsJson);
    localStorage.setItem(LEGACY_RECEIPTS_KEY, receiptsJson);

    createLocalStorageAdapter().loadState();
    expect(localStorage.getItem(LEGACY_ITEMS_KEY)).toBe(itemsJson);
    expect(localStorage.getItem(LEGACY_RECEIPTS_KEY)).toBe(receiptsJson);
  });

  it("is idempotent: loading again does not duplicate the migrated list or receipts", () => {
    localStorage.setItem(LEGACY_ITEMS_KEY, JSON.stringify([legacyItem]));
    localStorage.setItem(LEGACY_RECEIPTS_KEY, JSON.stringify([legacyReceipt]));

    const first = createLocalStorageAdapter().loadState();
    const second = createLocalStorageAdapter().loadState();
    expect(second).toEqual(first);
    expect(second.lists).toHaveLength(1);
    expect(second.receipts).toHaveLength(1);
  });

  it("migrates items when there are no legacy receipts", () => {
    localStorage.setItem(LEGACY_ITEMS_KEY, JSON.stringify([legacyItem]));
    const state = createLocalStorageAdapter().loadState();
    expect(state.lists[0].items).toEqual([legacyItem]);
    expect(state.receipts).toEqual([]);
  });

  it("migrates receipts when there are no legacy items", () => {
    localStorage.setItem(LEGACY_RECEIPTS_KEY, JSON.stringify([legacyReceipt]));
    const state = createLocalStorageAdapter().loadState();
    expect(state.lists[0].items).toEqual([]);
    expect(state.receipts).toHaveLength(1);
  });

  it("drops malformed legacy entries but keeps the valid ones", () => {
    localStorage.setItem(LEGACY_ITEMS_KEY, JSON.stringify([legacyItem, { id: 5 }, null, { name: "No id" }]));
    localStorage.setItem(LEGACY_RECEIPTS_KEY, JSON.stringify([legacyReceipt, { id: 5 }, null, { ...legacyReceipt, currency: "XXX" }]));

    const state = createLocalStorageAdapter().loadState();
    expect(state.lists[0].items).toEqual([legacyItem]);
    expect(state.receipts).toEqual([{ ...legacyReceipt, listId: null, listName: "My list", storeName: null }]);
  });

  it("writes nothing and returns an empty state when legacy data cannot be parsed", () => {
    localStorage.setItem(LEGACY_ITEMS_KEY, "{not json");
    const state = createLocalStorageAdapter().loadState();
    expect(state.lists).toEqual([]);
    expect(localStorage.getItem(APP_STATE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_ITEMS_KEY)).toBe("{not json");
  });

  it("returns null from migrateLegacyState for invalid legacy JSON", () => {
    expect(migrateLegacyState(fakeStore({ [LEGACY_ITEMS_KEY]: "{" }))).toBeNull();
  });

  it("does not treat a valid but non-array legacy value as a fresh install", () => {
    localStorage.setItem(LEGACY_ITEMS_KEY, JSON.stringify({ a: 1 }));
    expect(createLocalStorageAdapter().loadState().lists).toEqual([]);
  });

  it("migrates into a deterministic list when a clock is supplied", () => {
    const store = fakeStore({ [LEGACY_ITEMS_KEY]: JSON.stringify([legacyItem]) });
    const state = migrateLegacyState(store, new Date("2026-11-22T10:00:00.000Z"))!;
    expect(state.lists[0]).toMatchObject({ createdAt: "2026-11-22T10:00:00.000Z", updatedAt: "2026-11-22T10:00:00.000Z" });
  });
});

describe("localStorage adapter: budget", () => {
  beforeEach(() => localStorage.clear());

  it("only returns the budget saved today", () => {
    createLocalStorageAdapter(localStorage, () => "2026-10-14").saveDailyBudget(500);
    expect(createLocalStorageAdapter(localStorage, () => "2026-10-14").loadDailyBudget()).toBe(500);
    expect(createLocalStorageAdapter(localStorage, () => "2026-10-15").loadDailyBudget()).toBeNull();
  });

  it("removes the budget when set to null", () => {
    const s = createLocalStorageAdapter();
    s.saveDailyBudget(500);
    s.saveDailyBudget(null);
    expect(s.loadDailyBudget()).toBeNull();
  });

  it("ignores malformed budget data", () => {
    localStorage.setItem("grocery-daily-budget-v1", "{not json");
    expect(createLocalStorageAdapter().loadDailyBudget()).toBeNull();
  });
});

describe("state validation", () => {
  it("accepts receipts saved before v3 without the optional context fields", () => {
    const oldReceipt: Receipt = { id: "old", finishedAt: "2026-01-01T00:00:00.000Z", currency: "PHP", lines: [], total: 0, budget: null };
    const state: AppStateV2 = makeState({ receipts: [oldReceipt] });
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
    expect(createLocalStorageAdapter().loadState().receipts).toEqual([oldReceipt]);
  });

  it("does not trust a v2 record whose list items are malformed", () => {
    const list = makeList("Bad", [{ id: "1", name: "Rice" } as never]);
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(makeState({ lists: [list] })));
    expect(createLocalStorageAdapter().loadState().lists).toEqual([]);
  });

  it("does not trust a store without a color", () => {
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(makeState({ stores: [{ id: "s", name: "Shop" } as never] })));
    expect(createLocalStorageAdapter().loadState().stores).toEqual([]);
  });

  it("keeps a valid state even when the legacy keys also exist", () => {
    const state = makeState({ lists: [makeList("Current", [])], activeListId: "list-1" });
    localStorage.setItem(APP_STATE_KEY, JSON.stringify(state));
    localStorage.setItem(LEGACY_ITEMS_KEY, JSON.stringify([legacyItem]));
    expect(createLocalStorageAdapter().loadState().lists[0].name).toBe("Current");
  });
});

describe("createList helper used by migration", () => {
  it("trims the name and starts unarchived", () => {
    const list = createList("  My list  ", { id: "x", now: new Date("2026-01-01T00:00:00.000Z") });
    expect(list).toMatchObject({ id: "x", name: "My list", archivedAt: null, lastShoppedAt: null, items: [] });
  });
});

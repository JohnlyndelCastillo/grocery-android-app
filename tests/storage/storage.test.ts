import { beforeEach, describe, expect, it } from "vitest";
import { createLocalStorageAdapter } from "../../src/storage/storage";

describe("localStorage adapter", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips items", () => {
    const s = createLocalStorageAdapter();
    const items = [{ id: "1", name: "Rice", qty: 2, price: 50, checked: true }];
    s.saveItems(items);
    expect(s.loadItems()).toEqual(items);
  });

  it("returns [] for empty or corrupt data", () => {
    const s = createLocalStorageAdapter();
    expect(s.loadItems()).toEqual([]);
    localStorage.setItem("grocery-items-v1", "{not json");
    expect(s.loadItems()).toEqual([]);
    localStorage.setItem("grocery-items-v1", '{"a":1}');
    expect(s.loadItems()).toEqual([]);
  });

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
});

describe("localStorage adapter: receipts", () => {
  beforeEach(() => localStorage.clear());
  const receipt = { id: "r1", finishedAt: "2026-10-30T08:00:00.000Z", currency: "PHP" as const, lines: [{ name: "Rice", qty: 2, price: 50 }], total: 100, budget: null };

  it("round-trips receipts", () => {
    const s = createLocalStorageAdapter();
    s.saveReceipts([receipt]);
    expect(s.loadReceipts()).toEqual([receipt]);
  });

  it("returns [] for empty or corrupt data and drops malformed entries", () => {
    const s = createLocalStorageAdapter();
    expect(s.loadReceipts()).toEqual([]);
    localStorage.setItem("grocery-receipts-v1", "{not json");
    expect(s.loadReceipts()).toEqual([]);
    localStorage.setItem("grocery-receipts-v1", JSON.stringify([receipt, { id: 5 }, null, { ...receipt, currency: "XXX" }]));
    expect(s.loadReceipts()).toEqual([receipt]);
  });
});

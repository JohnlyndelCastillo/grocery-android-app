import { describe, expect, it } from "vitest";
import { localDateKey, localMonthKey, monthKeyOf } from "../../src/domain/dates";
import {
  continueList,
  listSummary,
  receiptsByMonth,
  recentReceipts,
  spentToday,
} from "../../src/domain/selectors";
import { makeItem, makeList, makeReceipt, makeState } from "../helpers/appState";

const now = new Date(2026, 10, 22, 12, 0, 0); // local noon on Nov 22, 2026
const iso = (date: Date) => date.toISOString();
const daysAgo = (days: number) => new Date(2026, 10, 22 - days, 12, 0, 0);

const cart = [
  makeItem({ id: "1", name: "Rice", qty: 2, price: 50, checked: true }), // 100
  makeItem({ id: "2", name: "Eggs", qty: 1, price: 30, checked: false }), // 30 planned, not spent
];

describe("date keys", () => {
  it("uses local calendar days and months", () => {
    expect(localDateKey(now)).toBe("2026-11-22");
    expect(localMonthKey(now)).toBe("2026-11");
  });

  it("returns a month key for a valid ISO timestamp and null for garbage", () => {
    expect(monthKeyOf(iso(now))).toBe("2026-11");
    expect(monthKeyOf("not a date")).toBeNull();
  });
});

describe("spentToday", () => {
  it("adds today's same-currency receipts to the active list's in-cart total", () => {
    const state = makeState({
      lists: [makeList("Weekly", cart)],
      activeListId: "list-1",
      receipts: [
        makeReceipt({ id: "a", finishedAt: iso(new Date(2026, 10, 22, 8)), total: 200, currency: "PHP" }),
        makeReceipt({ id: "b", finishedAt: iso(new Date(2026, 10, 22, 9)), total: 50, currency: "PHP" }),
      ],
    });
    expect(spentToday(state, "PHP", now)).toEqual({ amount: 350, receiptTotal: 250, cartTotal: 100, otherCurrencyReceipts: 0 });
  });

  it("ignores receipts from other days", () => {
    const state = makeState({
      lists: [makeList("Weekly", cart)],
      activeListId: "list-1",
      receipts: [makeReceipt({ id: "old", finishedAt: iso(daysAgo(1)), total: 999 })],
    });
    expect(spentToday(state, "PHP", now)).toEqual({ amount: 100, receiptTotal: 0, cartTotal: 100, otherCurrencyReceipts: 0 });
  });

  it("counts receipts in another currency but leaves them out of the amount", () => {
    const state = makeState({
      lists: [makeList("Weekly", cart)],
      activeListId: "list-1",
      receipts: [
        makeReceipt({ id: "usd", finishedAt: iso(new Date(2026, 10, 22, 8)), total: 5, currency: "USD" }),
        makeReceipt({ id: "php", finishedAt: iso(new Date(2026, 10, 22, 9)), total: 20, currency: "PHP" }),
      ],
    });
    expect(spentToday(state, "PHP", now)).toEqual({ amount: 120, receiptTotal: 20, cartTotal: 100, otherCurrencyReceipts: 1 });
  });

  it("uses the active list's cart, not another list's", () => {
    const active = makeList("Active", cart, { id: "active" });
    const other = makeList("Other", [makeItem({ id: "3", checked: true, qty: 1, price: 999 })], { id: "other" });
    const state = makeState({ lists: [active, other], activeListId: "active" });
    expect(spentToday(state, "PHP", now).cartTotal).toBe(100);
  });

  it("is zero without a list or receipts", () => {
    expect(spentToday(makeState(), "PHP", now)).toEqual({ amount: 0, receiptTotal: 0, cartTotal: 0, otherCurrencyReceipts: 0 });
  });

  it("rounds to cents", () => {
    const list = makeList("Cents", [makeItem({ id: "1", qty: 1, price: 0.1, checked: true }), makeItem({ id: "2", qty: 1, price: 0.2, checked: true })]);
    expect(spentToday(makeState({ lists: [list], activeListId: list.id }), "PHP", now).amount).toBe(0.3);
  });
});

describe("continueList", () => {
  it("prefers a live list with items in the cart, most recently updated first", () => {
    const cartA = makeList("A", [makeItem({ id: "a", checked: true })], { id: "a", updatedAt: "2026-11-20T00:00:00.000Z" });
    const cartB = makeList("B", [makeItem({ id: "b", checked: true })], { id: "b", updatedAt: "2026-11-21T00:00:00.000Z" });
    const empty = makeList("Empty", [], { id: "empty", updatedAt: "2026-11-22T00:00:00.000Z" });
    const state = makeState({ lists: [cartA, empty, cartB], activeListId: "empty" });
    expect(continueList(state)?.id).toBe("b");
  });

  it("falls back to the most recently shopped list", () => {
    const older = makeList("Older", [], { id: "older", lastShoppedAt: "2026-11-10T00:00:00.000Z", updatedAt: "2026-11-21T00:00:00.000Z" });
    const newer = makeList("Newer", [], { id: "newer", lastShoppedAt: "2026-11-20T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" });
    const state = makeState({ lists: [older, newer], activeListId: "older" });
    expect(continueList(state)?.id).toBe("newer");
  });

  it("falls back to the most recently updated list, then the active list", () => {
    const old = makeList("Old", [], { id: "old", updatedAt: "2026-11-01T00:00:00.000Z" });
    const recent = makeList("Recent", [], { id: "recent", updatedAt: "2026-11-02T00:00:00.000Z" });
    expect(continueList(makeState({ lists: [old, recent] }))?.id).toBe("recent");
    expect(continueList(makeState())).toBeNull();
  });

  it("never offers an archived list", () => {
    const archived = makeList("Archived", [makeItem({ checked: true })], { id: "archived", archivedAt: "2026-11-01T00:00:00.000Z" });
    expect(continueList(makeState({ lists: [archived], activeListId: "archived" }))).toBeNull();
  });
});

describe("listSummary", () => {
  it("counts items, cart totals, planned totals and progress", () => {
    expect(listSummary(makeList("Weekly", cart))).toEqual({ itemCount: 2, doneCount: 1, planned: 130, inCart: 100, progress: 0.5 });
  });

  it("reports zero progress for an empty list", () => {
    expect(listSummary(makeList("Empty", []))).toMatchObject({ itemCount: 0, doneCount: 0, progress: 0 });
  });
});

describe("receipt selectors", () => {
  const older = makeReceipt({ id: "older", finishedAt: "2026-10-05T10:00:00.000Z" });
  const newest = makeReceipt({ id: "newest", finishedAt: "2026-11-20T10:00:00.000Z" });
  const middle = makeReceipt({ id: "middle", finishedAt: "2026-11-02T10:00:00.000Z" });

  it("returns the newest receipts first, limited", () => {
    const state = makeState({ receipts: [older, newest, middle] });
    expect(recentReceipts(state, 2).map((receipt) => receipt.id)).toEqual(["newest", "middle"]);
    expect(recentReceipts(state).map((receipt) => receipt.id)).toEqual(["newest", "middle", "older"]);
  });

  it("groups receipts by month, newest month and receipt first", () => {
    const months = receiptsByMonth([older, newest, middle]);
    expect(months.map((month) => month.key)).toEqual(["2026-11", "2026-10"]);
    expect(months[0].receipts.map((receipt) => receipt.id)).toEqual(["newest", "middle"]);
    expect(months[1].receipts.map((receipt) => receipt.id)).toEqual(["older"]);
  });

  it("skips receipts with an unparseable date", () => {
    expect(receiptsByMonth([makeReceipt({ id: "bad", finishedAt: "nope" }), older])).toHaveLength(1);
  });
});

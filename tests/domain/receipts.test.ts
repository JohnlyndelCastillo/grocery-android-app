import { describe, expect, it } from "vitest";
import { addReceipt, buildReceipt, itemsFromReceipt, removeReceipt } from "../../src/domain/receipts";
import type { Item } from "../../src/domain/types";

const rice: Item = { id: "1", name: "Rice", qty: 2, price: 50, checked: true };
const eggs: Item = { id: "2", name: "Eggs", qty: 1, price: 30, checked: false };
const ctx = { currency: "PHP" as const, budget: 150, now: new Date("2026-10-30T08:00:00Z"), id: "r1" };

describe("buildReceipt", () => {
  it("includes only checked items and totals them", () => {
    expect(buildReceipt([rice, eggs], ctx)).toEqual({
      id: "r1",
      finishedAt: "2026-10-30T08:00:00.000Z",
      currency: "PHP",
      lines: [{ name: "Rice", qty: 2, price: 50 }],
      total: 100,
      budget: 150,
      listId: null,
      listName: null,
      storeName: null,
      remainingBudgetAtTime: null,
    });
  });

  it("snapshots the list, store and remaining budget context", () => {
    const receipt = buildReceipt([rice], {
      ...ctx,
      listId: "list-1",
      listName: "Weekly shop",
      storeName: "Market",
      remainingBudgetAtTime: 50,
    })!;
    expect(receipt).toMatchObject({
      listId: "list-1",
      listName: "Weekly shop",
      storeName: "Market",
      remainingBudgetAtTime: 50,
    });
  });

  it("returns null when nothing is in the cart", () => {
    expect(buildReceipt([eggs], ctx)).toBeNull();
    expect(buildReceipt([], ctx)).toBeNull();
  });

  it("copies the data so later item edits don't change the receipt", () => {
    const items = [{ ...rice }];
    const receipt = buildReceipt(items, ctx)!;
    items[0].price = 999;
    expect(receipt.lines[0].price).toBe(50);
  });
});

describe("receipt list helpers", () => {
  it("puts the newest receipt first and can remove by id", () => {
    const a = buildReceipt([rice], { ...ctx, id: "a" })!;
    const b = buildReceipt([rice], { ...ctx, id: "b" })!;
    const list = addReceipt(addReceipt([], a), b);
    expect(list.map((r) => r.id)).toEqual(["b", "a"]);
    expect(removeReceipt(list, "b").map((r) => r.id)).toEqual(["a"]);
  });
});

describe("itemsFromReceipt", () => {
  it("turns purchased lines into fresh unchecked items", () => {
    const receipt = buildReceipt([rice, eggs], ctx)!;
    let n = 0;
    const items = itemsFromReceipt(receipt, () => `new-${++n}`);
    expect(items).toEqual([{ id: "new-1", name: "Rice", qty: 2, price: 50, checked: false }]);
  });

  it("keeps every line, including a zero quantity", () => {
    const receipt = buildReceipt([{ ...rice, qty: 0 }], ctx)!;
    expect(itemsFromReceipt(receipt, () => "x")).toEqual([{ id: "x", name: "Rice", qty: 0, price: 50, checked: false }]);
  });
});

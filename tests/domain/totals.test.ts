import { describe, expect, it } from "vitest";
import { cartTotal, checkedCount, lineTotal, plannedTotal } from "../../src/domain/totals";
import type { Item } from "../../src/domain/types";

const item = (over: Partial<Item> = {}): Item => ({
  id: "x", name: "test", qty: 1, price: 0, checked: false, ...over,
});

describe("totals", () => {
  it("multiplies qty by price for a line", () => {
    expect(lineTotal(item({ qty: 3, price: 12.5 }))).toBe(37.5);
  });

  it("sums every item for the planned total", () => {
    expect(plannedTotal([item({ qty: 2, price: 50 }), item({ price: 30 })])).toBe(130);
  });

  it("only counts checked items in the cart total", () => {
    const items = [item({ qty: 2, price: 50, checked: true }), item({ price: 30 })];
    expect(cartTotal(items)).toBe(100);
    expect(checkedCount(items)).toBe(1);
  });

  it("avoids floating point noise", () => {
    expect(plannedTotal([item({ price: 0.1 }), item({ price: 0.2 })])).toBe(0.3);
  });

  it("returns 0 for an empty list", () => {
    expect(plannedTotal([])).toBe(0);
  });
});

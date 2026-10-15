import { describe, expect, it } from "vitest";
import { addItem, createItem, removeItem, removeItems, setAllChecked, updateItem } from "../../src/domain/items";

const base = [createItem("Rice", "1"), createItem("Eggs", "2")];

describe("items", () => {
  it("creates a trimmed item with defaults", () => {
    expect(createItem("  Milk ", "m")).toEqual({ id: "m", name: "Milk", qty: 1, price: 0, checked: false });
  });

  it("ignores blank names", () => {
    expect(addItem(base, "   ")).toBe(base);
  });

  it("adds without mutating the original", () => {
    const next = addItem(base, "Soap");
    expect(next).toHaveLength(3);
    expect(base).toHaveLength(2);
  });

  it("removes one or many by id", () => {
    expect(removeItem(base, "1").map((i) => i.id)).toEqual(["2"]);
    expect(removeItems(base, new Set(["1", "2"]))).toEqual([]);
  });

  it("updates only the matching item", () => {
    const next = updateItem(base, "2", { price: 9, checked: true });
    expect(next[1]).toMatchObject({ price: 9, checked: true });
    expect(next[0]).toBe(base[0]);
    expect(base[1].price).toBe(0);
  });

  it("checks and unchecks everything", () => {
    expect(setAllChecked(base, true).every((i) => i.checked)).toBe(true);
    expect(setAllChecked(setAllChecked(base, true), false).some((i) => i.checked)).toBe(false);
  });
});

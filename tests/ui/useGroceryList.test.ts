import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CurrencyCode, Item } from "../../src/domain/types";
import type { GroceryStorage } from "../../src/storage/storage";
import { useGroceryList } from "../../src/ui/hooks/useGroceryList";
import { renderHook } from "../helpers/renderHook";

const rice: Item = { id: "1", name: "Rice", qty: 2, price: 50, checked: true };   // 100, in the cart
const eggs: Item = { id: "2", name: "Eggs", qty: 1, price: 30, checked: false };  // 30, still needed

function setup(items: Item[] = [rice, eggs], budget: number | null = null) {
  const storage: GroceryStorage = {
    loadItems: () => items,
    saveItems: vi.fn(),
    loadDailyBudget: () => budget,
    saveDailyBudget: vi.fn(),
  };
  const hook = renderHook(() => useGroceryList(storage));
  return { storage, ...hook };
}

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("useGroceryList: derived values", () => {
  it("splits items by tab and totals them", () => {
    const { result } = setup();
    expect(result.current.visibleItems.map((i) => i.name)).toEqual(["Eggs"]);
    expect(result.current.doneCount).toBe(1);
    expect(result.current.cartText).toContain("100.00");
    expect(result.current.plannedText).toContain("130.00");

    act(() => result.current.changeTab("cart"));
    expect(result.current.visibleItems.map((i) => i.name)).toEqual(["Rice"]);
  });

  it("reports over budget once the cart passes the budget", () => {
    expect(setup([rice, eggs], 150).result.current.overBudget).toBe(false);
    expect(setup([rice, eggs], 50).result.current.overBudget).toBe(true);
  });
});

describe("useGroceryList: items", () => {
  it("saves every change", () => {
    const { result, storage } = setup();
    act(() => result.current.addItem("Milk"));
    expect(result.current.items.map((i) => i.name)).toEqual(["Rice", "Eggs", "Milk"]);
    expect(storage.saveItems).toHaveBeenLastCalledWith(result.current.items);

    act(() => result.current.setQty("2", 6));
    expect(result.current.items.find((i) => i.id === "2")?.qty).toBe(6);
  });

  it("'start a new trip' unchecks everything", () => {
    const { result } = setup();
    act(() => result.current.startNewTrip());
    expect(result.current.doneCount).toBe(0);
  });
});

describe("useGroceryList: selecting and deleting", () => {
  it("checking an item removes it from the selection", () => {
    const { result } = setup([eggs, { ...rice, checked: false }]);
    act(() => result.current.toggleSelectionMode());
    act(() => result.current.changeSelection("1", true));
    expect(result.current.selectedIds.has("1")).toBe(true);
    act(() => result.current.setChecked("1", true));
    expect(result.current.selectedIds.size).toBe(0);
  });

  it("asks nothing when no item is selected", () => {
    const { result } = setup();
    act(() => result.current.requestDeleteSelected());
    expect(result.current.pendingDelete).toBeNull();
  });

  it("deletes the selection after confirming, leaves select mode, and offers undo", () => {
    const { result, storage } = setup();
    act(() => result.current.toggleSelectionMode());
    act(() => result.current.changeSelection("2", true));
    act(() => result.current.requestDeleteSelected());
    expect(result.current.pendingDelete?.prompt).toBe("This will permanently remove 1 item from your list.");
    expect(result.current.items).toHaveLength(2); // nothing is deleted until confirmed

    act(() => result.current.confirmDelete());
    expect(result.current.items.map((i) => i.name)).toEqual(["Rice"]);
    expect(storage.saveItems).toHaveBeenLastCalledWith([rice]);
    expect(result.current.pendingDelete).toBeNull();
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.undo?.message).toBe("1 item deleted.");
  });

  it("cancelling a delete changes nothing", () => {
    const { result } = setup();
    act(() => result.current.requestDeleteOne("2", "Eggs"));
    expect(result.current.pendingDelete?.prompt).toBe("This will permanently remove Eggs from your list.");
    act(() => result.current.cancelDelete());
    act(() => result.current.confirmDelete()); // nothing pending: a no-op
    expect(result.current.items).toHaveLength(2);
    expect(result.current.undo).toBeNull();
  });

  it("undo puts the items back, and the banner expires after 6 seconds", () => {
    vi.useFakeTimers();
    const { result, storage } = setup();
    act(() => result.current.quickDelete("2", "Eggs"));
    expect(result.current.undo?.message).toBe("Eggs deleted.");

    act(() => result.current.undoDelete());
    expect(result.current.items.map((i) => i.name).sort()).toEqual(["Eggs", "Rice"]);
    expect(storage.saveItems).toHaveBeenLastCalledWith(result.current.items);
    expect(result.current.undo).toBeNull();

    act(() => result.current.quickDelete("2", "Eggs"));
    act(() => { vi.advanceTimersByTime(5999); });
    expect(result.current.undo).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.undo).toBeNull();
  });
});

describe("useGroceryList: budget and currency", () => {
  it("saves a valid budget, ignores an invalid one, and clears on empty", () => {
    const { result, storage } = setup();
    act(() => result.current.saveBudget("120"));
    expect(result.current.dailyBudget).toBe(120);
    expect(storage.saveDailyBudget).toHaveBeenLastCalledWith(120);

    act(() => result.current.saveBudget("-5"));
    expect(result.current.dailyBudget).toBe(120);

    act(() => result.current.saveBudget(""));
    expect(result.current.dailyBudget).toBeNull();
  });

  it("switches to a supported currency and rejects anything else", () => {
    const { result } = setup();
    act(() => result.current.changeCurrency("USD"));
    expect(result.current.currency).toBe("USD");
    expect(localStorage.length).toBeGreaterThan(0);

    act(() => result.current.changeCurrency("XXX" as CurrencyCode));
    expect(result.current.currency).toBe("USD");
  });
});

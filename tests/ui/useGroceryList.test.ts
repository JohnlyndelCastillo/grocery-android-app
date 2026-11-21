import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createList } from "../../src/domain/lists";
import type { CurrencyCode, Item } from "../../src/domain/types";
import { useGroceryList } from "../../src/ui/hooks/useGroceryList";
import { makeItem, makeList, makeReceipt, makeState, makeStorage, makeStore } from "../helpers/appState";
import { renderHook } from "../helpers/renderHook";

const rice: Item = makeItem({ id: "1", name: "Rice", qty: 2, price: 50, checked: true }); // 100, in the cart
const eggs: Item = makeItem({ id: "2", name: "Eggs", qty: 1, price: 30, checked: false }); // 30, still needed

function setup(items: Item[] = [rice, eggs], budget: number | null = null, selectedListId: string | null = null) {
  const test = makeStorage(makeState({ lists: [makeList("My list", items)], activeListId: "list-1" }), budget);
  const hook = renderHook(() => useGroceryList(test.storage, selectedListId));
  return { ...test, ...hook };
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
    expect(result.current.cartText).toContain("PHP\u00a0100");
    expect(result.current.plannedText).toContain("PHP\u00a0130");
    expect(result.current.spentToday.amount).toBe(100);

    act(() => result.current.changeTab("cart"));
    expect(result.current.visibleItems.map((i) => i.name)).toEqual(["Rice"]);
  });

  it("reports over budget once today's spending passes the budget", () => {
    expect(setup([rice, eggs], 150).result.current.overBudget).toBe(false);
    expect(setup([rice, eggs], 50).result.current.overBudget).toBe(true);
  });

  it("includes today's same-currency receipts in the budget status", () => {
    const test = makeStorage(
      makeState({
        lists: [makeList("My list", [rice])],
        activeListId: "list-1",
        receipts: [makeReceipt({ id: "today", finishedAt: new Date().toISOString(), total: 150 })],
      }),
      200,
    );
    const { result } = renderHook(() => useGroceryList(test.storage));
    expect(result.current.spentToday.amount).toBe(250);
    expect(result.current.budgetStatus).toEqual({ state: "over", amount: 50 });
  });

  it("shows a selected list even when it is not the active one", () => {
    const other = makeList("Other", [makeItem({ id: "9", name: "Milk", checked: false })], { id: "other" });
    const test = makeStorage(makeState({ lists: [makeList("My list", [rice]), other], activeListId: "list-1" }));
    const { result } = renderHook(() => useGroceryList(test.storage, "other"));
    expect(result.current.items.map((item) => item.name)).toEqual(["Milk"]);
  });
});

describe("useGroceryList: items", () => {
  it("saves every change to the whole app state", () => {
    const { result, saved } = setup();
    act(() => result.current.addItem("Milk"));
    expect(result.current.items.map((i) => i.name)).toEqual(["Rice", "Eggs", "Milk"]);
    expect(saved().lists[0].items).toEqual(result.current.items);

    act(() => result.current.setQty("2", 6));
    expect(result.current.items.find((i) => i.id === "2")?.qty).toBe(6);
    expect(saved().lists[0].items.find((item) => item.id === "2")?.qty).toBe(6);
  });

  it("'mark all in cart' can check and uncheck everything", () => {
    const { result } = setup();
    act(() => result.current.checkAll(true));
    expect(result.current.doneCount).toBe(2);
    act(() => result.current.checkAll(false));
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
    const { result, saved } = setup();
    act(() => result.current.toggleSelectionMode());
    act(() => result.current.changeSelection("2", true));
    act(() => result.current.requestDeleteSelected());
    expect(result.current.pendingDelete?.prompt).toBe("This will permanently remove 1 item from your list.");
    expect(result.current.items).toHaveLength(2); // nothing is deleted until confirmed

    act(() => result.current.confirmDelete());
    expect(result.current.items.map((i) => i.name)).toEqual(["Rice"]);
    expect(saved().lists[0].items).toEqual([rice]);
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
    const { result, saved } = setup();
    act(() => result.current.quickDelete("2", "Eggs"));
    expect(result.current.undo?.message).toBe("Eggs deleted.");

    act(() => result.current.undoDelete());
    expect(result.current.items.map((i) => i.name).sort()).toEqual(["Eggs", "Rice"]);
    expect(saved().lists[0].items.map((item) => item.name).sort()).toEqual(["Eggs", "Rice"]);
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
    expect(localStorage.getItem("grocery-currency-v1")).toBe("USD");

    act(() => result.current.changeCurrency("XXX" as CurrencyCode));
    expect(result.current.currency).toBe("USD");
  });
});

describe("useGroceryList: finishing a trip", () => {
  it("saves a receipt of the cart, resets the list, marks it shopped and returns to the needed tab", () => {
    const { result, saved } = setup([rice, eggs], 150);
    act(() => result.current.changeTab("cart"));
    act(() => result.current.finishTrip());

    expect(result.current.receipts).toHaveLength(1);
    expect(result.current.receipts[0]).toMatchObject({
      lines: [{ name: "Rice", qty: 2, price: 50 }],
      total: 100,
      budget: 150,
      currency: "PHP",
      listId: "list-1",
      listName: "My list",
      storeName: null,
      remainingBudgetAtTime: 50,
    });
    expect(saved().receipts).toHaveLength(1);
    expect(result.current.doneCount).toBe(0);
    expect(result.current.items).toHaveLength(2); // the list itself is kept
    expect(result.current.activeList?.lastShoppedAt).not.toBeNull();
    expect(result.current.activeTab).toBe("needed");
    expect(result.current.notice).toContain("Receipt saved");
  });

  it("snapshots the store name", () => {
    const store = makeStore({ id: "store-1", name: "Market" });
    const test = makeStorage(makeState({ lists: [makeList("Weekly", [rice], { storeId: "store-1" })], stores: [store], activeListId: "list-1" }), 150);
    const { result } = renderHook(() => useGroceryList(test.storage));
    act(() => result.current.finishTrip());
    expect(result.current.receipts[0].storeName).toBe("Market");
  });

  it("does nothing when the cart is empty", () => {
    const { result, saved } = setup([{ ...rice, checked: false }, eggs]);
    act(() => result.current.finishTrip());
    expect(result.current.receipts).toEqual([]);
    expect(saved().receipts).toEqual([]);
    expect(result.current.notice).toBeNull();
  });

  it("keeps newest receipts first, remembers the currency used, and can delete one", () => {
    const { result } = setup([rice]);
    act(() => result.current.changeCurrency("USD"));
    act(() => result.current.finishTrip());
    act(() => result.current.checkAll(true));
    act(() => result.current.finishTrip());
    expect(result.current.receipts).toHaveLength(2);
    expect(result.current.receipts[0].currency).toBe("USD");

    const id = result.current.receipts[1].id;
    act(() => result.current.deleteReceipt(id));
    expect(result.current.receipts.map((r) => r.id)).not.toContain(id);
  });

  it("the confirmation notice expires after 4 seconds", () => {
    vi.useFakeTimers();
    const { result } = setup();
    act(() => result.current.finishTrip());
    act(() => { vi.advanceTimersByTime(3999); });
    expect(result.current.notice).not.toBeNull();
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.notice).toBeNull();
  });
});

describe("useGroceryList: lists", () => {
  it("creates a list, makes it active and opens its empty editing session", () => {
    const { result } = setup([], null);
    let created: ReturnType<typeof result.current.createList> = null;
    act(() => { created = result.current.createList("  Weekly shop  "); });
    expect(created).toMatchObject({ name: "Weekly shop", items: [] });
    expect(result.current.lists.map((list) => list.name)).toEqual(["My list", "Weekly shop"]);
    expect(result.current.state.activeListId).toBe(created!.id);
    expect(result.current.activeList?.name).toBe("Weekly shop");
    expect(result.current.activeTab).toBe("needed");
  });

  it("ignores a blank list name", () => {
    const { result } = setup();
    act(() => { expect(result.current.createList("   ")).toBeNull(); });
    expect(result.current.lists).toHaveLength(1);
  });

  it("renames, duplicates, archives, restores and deletes lists", () => {
    const { result } = setup([rice, eggs]);
    act(() => result.current.renameList("list-1", "Weekly"));
    expect(result.current.lists[0].name).toBe("Weekly");

    let copy: ReturnType<typeof result.current.duplicateList> = null;
    act(() => { copy = result.current.duplicateList("list-1"); });
    expect(copy).toMatchObject({ name: "Weekly copy", storeId: null });
    expect(copy!.items.every((item) => !item.checked)).toBe(true);
    expect(copy!.items.map((item) => item.id)).not.toEqual(["1", "2"]);
    expect(result.current.lists).toHaveLength(2);
    expect(result.current.state.activeListId).toBe(copy!.id);

    act(() => result.current.archiveList(copy!.id));
    expect(result.current.findList(copy!.id)?.archivedAt).not.toBeNull();
    expect(result.current.state.activeListId).toBe("list-1");

    act(() => result.current.restoreList(copy!.id));
    expect(result.current.findList(copy!.id)?.archivedAt).toBeNull();

    act(() => result.current.deleteList(copy!.id));
    expect(result.current.lists.map((list) => list.id)).toEqual(["list-1"]);
  });

  it("switches the active list and resets tab and selection", () => {
    const other = makeList("Other", [makeItem({ id: "9", name: "Milk" })], { id: "other" });
    const test = makeStorage(makeState({ lists: [makeList("My list", [rice]), other], activeListId: "list-1" }));
    const { result } = renderHook(() => useGroceryList(test.storage));
    act(() => result.current.changeTab("cart"));
    act(() => result.current.toggleSelectionMode());
    act(() => result.current.selectList("other"));
    expect(result.current.activeList?.name).toBe("Other");
    expect(result.current.activeTab).toBe("needed");
    expect(result.current.selectionMode).toBe(false);
  });

  it("repeats a receipt as a new unchecked list, matching the store by name", () => {
    const store = makeStore({ id: "store-1", name: "Market" });
    const receipt = makeReceipt({ id: "r1", listName: "Weekly", storeName: "Market", lines: [{ name: "Rice", qty: 2, price: 50 }] });
    const test = makeStorage(makeState({ stores: [store], receipts: [receipt] }));
    const { result } = renderHook(() => useGroceryList(test.storage));

    let list: ReturnType<typeof result.current.repeatReceipt> = null;
    act(() => { list = result.current.repeatReceipt("r1"); });
    expect(list).toMatchObject({ name: "Repeat of Weekly", storeId: "store-1" });
    expect(list!.items).toEqual([expect.objectContaining({ name: "Rice", qty: 2, price: 50, checked: false })]);
    expect(result.current.state.activeListId).toBe(list!.id);
    expect(result.current.receipts).toEqual([receipt]); // the receipt is untouched
  });

  it("returns null when repeating a missing receipt", () => {
    const { result } = setup();
    act(() => { expect(result.current.repeatReceipt("missing")).toBeNull(); });
  });
});

describe("useGroceryList: stores", () => {
  it("creates, renames, recolors and deletes stores", () => {
    const { result } = setup();
    let store: ReturnType<typeof result.current.createStore> = null;
    act(() => { store = result.current.createStore("Market", "#4d7b66"); });
    expect(store).toMatchObject({ name: "Market", color: "#4d7b66" });

    act(() => { expect(result.current.createStore("market")).toBeNull(); });
    act(() => result.current.renameStore(store!.id, "Grocer"));
    expect(result.current.stores[0].name).toBe("Grocer");
    act(() => result.current.recolorStore(store!.id, "#c08819"));
    expect(result.current.stores[0].color).toBe("#c08819");
    act(() => result.current.deleteStore(store!.id));
    expect(result.current.stores).toEqual([]);
  });
});

describe("useGroceryList: creating a list helper", () => {
  it("uses createList with the supplied items", () => {
    const list = createList("Test", { id: "x", items: [rice] });
    expect(list.items).toEqual([rice]);
  });
});

import { describe, expect, it } from "vitest";
import {
  STORE_COLORS,
  activeListOf,
  addList,
  addStore,
  archiveList,
  createList,
  createStore,
  deleteList,
  deleteStore,
  duplicateList,
  findList,
  groupListsByStore,
  liveLists,
  markListShopped,
  mostRecentList,
  recolorStore,
  renameList,
  renameStore,
  restoreList,
  setActiveList,
  storeName,
  updateListItems,
} from "../../src/domain/lists";
import { makeItem, makeList, makeState, makeStore } from "../helpers/appState";

const now = new Date("2026-11-22T10:00:00.000Z");
const items = [makeItem({ id: "1", name: "Rice", qty: 2, price: 50, checked: true })];

describe("list helpers", () => {
  it("creates a trimmed, unarchived list", () => {
    const list = createList("  Weekly shop ", { id: "l1", items, now });
    expect(list).toMatchObject({
      id: "l1",
      name: "Weekly shop",
      storeId: null,
      items,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastShoppedAt: null,
      archivedAt: null,
    });
  });

  it("finds a list by id and ignores a missing one", () => {
    const list = makeList();
    expect(findList([list], "list-1")).toBe(list);
    expect(findList([list], "missing")).toBeNull();
    expect(findList([list], null)).toBeNull();
  });

  it("uses the active list, falling back to the most recently updated", () => {
    const old = makeList("Old", [], { id: "old", updatedAt: "2026-11-01T00:00:00.000Z" });
    const recent = makeList("Recent", [], { id: "recent", updatedAt: "2026-11-20T00:00:00.000Z" });
    expect(activeListOf(makeState({ lists: [old, recent], activeListId: "old" }))).toBe(old);
    expect(activeListOf(makeState({ lists: [old, recent], activeListId: "missing" }))).toBe(recent);
    expect(mostRecentList([old, recent])).toBe(recent);
  });

  it("lists only live lists", () => {
    const live = makeList("Live", [], { id: "live" });
    const archived = makeList("Archived", [], { id: "archived", archivedAt: "2026-11-01T00:00:00.000Z" });
    expect(liveLists([live, archived])).toEqual([live]);
  });

  it("adds a list and makes it active", () => {
    const state = makeState();
    const list = makeList();
    expect(addList(state, list)).toEqual({ ...state, lists: [list], activeListId: list.id });
  });

  it("renames only with a non-blank name", () => {
    const state = makeState({ lists: [makeList("Old")], activeListId: "list-1" });
    expect(renameList(state, "list-1", "  New  ").lists[0].name).toBe("New");
    expect(renameList(state, "list-1", "   ")).toBe(state);
    expect(renameList(state, "missing", "New")).toBe(state);
  });

  it("updates a list's items and timestamp without touching other lists", () => {
    const other = makeList("Other", [], { id: "other" });
    const state = makeState({ lists: [makeList("Mine", []), other], activeListId: "list-1" });
    const next = updateListItems(state, "list-1", items, now);
    expect(next.lists[0]).toMatchObject({ items, updatedAt: now.toISOString() });
    expect(next.lists[1]).toBe(other);
    expect(updateListItems(state, "missing", items)).toBe(state);
  });

  it("marks a list as shopped", () => {
    const state = makeState({ lists: [makeList()] });
    const next = markListShopped(state, "list-1", now);
    expect(next.lists[0]).toMatchObject({ lastShoppedAt: now.toISOString(), updatedAt: now.toISOString() });
    expect(markListShopped(state, "missing", now)).toBe(state);
  });

  it("duplicates a list with new item ids, unchecked, keeping the store", () => {
    const source = makeList("Weekly", items, { storeId: "store-1" });
    const state = makeState({ lists: [source], activeListId: source.id });
    const result = duplicateList(state, source.id, { id: "copy", now, itemId: () => "new-item" })!;
    expect(result.list).toMatchObject({ id: "copy", name: "Weekly copy", storeId: "store-1", items: [{ id: "new-item", checked: false }] });
    expect(result.state.lists.map((list) => list.id)).toEqual(["list-1", "copy"]);
    expect(result.state.activeListId).toBe("copy");
    expect(source.items[0]).toBe(items[0]); // the original is untouched
  });

  it("returns null when duplicating a missing list", () => {
    expect(duplicateList(makeState(), "missing")).toBeNull();
  });

  it("archives a list and moves the active pointer to a live list", () => {
    const first = makeList("First", [], { id: "first", updatedAt: "2026-11-01T00:00:00.000Z" });
    const second = makeList("Second", [], { id: "second", updatedAt: "2026-11-02T00:00:00.000Z" });
    const state = makeState({ lists: [first, second], activeListId: "first" });
    const next = archiveList(state, "first", now);
    expect(next.lists[0].archivedAt).toBe(now.toISOString());
    expect(next.activeListId).toBe("second");
  });

  it("keeps the active pointer when archiving another list, and clears it when none are left", () => {
    const first = makeList("First", [], { id: "first" });
    const second = makeList("Second", [], { id: "second" });
    const state = makeState({ lists: [first, second], activeListId: "first" });
    expect(archiveList(state, "second", now).activeListId).toBe("first");

    const only = makeState({ lists: [first], activeListId: "first" });
    expect(archiveList(only, "first", now).activeListId).toBeNull();
  });

  it("restores an archived list", () => {
    const list = makeList("Archived", [], { archivedAt: now.toISOString() });
    const next = restoreList(makeState({ lists: [list] }), "list-1");
    expect(next.lists[0].archivedAt).toBeNull();
    expect(restoreList(makeState(), "missing")).toEqual(makeState());
  });

  it("deletes a list without touching receipts and moves the active pointer", () => {
    const first = makeList("First", [], { id: "first", updatedAt: "2026-11-01T00:00:00.000Z" });
    const second = makeList("Second", [], { id: "second", updatedAt: "2026-11-02T00:00:00.000Z" });
    const receipt = { id: "r1", finishedAt: now.toISOString(), currency: "PHP" as const, lines: [], total: 0, budget: null, listId: "first" };
    const state = makeState({ lists: [first, second], receipts: [receipt], activeListId: "first" });
    const next = deleteList(state, "first");
    expect(next.lists.map((list) => list.id)).toEqual(["second"]);
    expect(next.activeListId).toBe("second");
    expect(next.receipts).toEqual([receipt]);
    expect(deleteList(state, "missing")).toBe(state);
  });

  it("sets the active list only when it exists", () => {
    const state = makeState({ lists: [makeList()] });
    expect(setActiveList(state, "list-1").activeListId).toBe("list-1");
    expect(setActiveList(state, "missing")).toBe(state);
    expect(setActiveList(state, null).activeListId).toBeNull();
  });
});

describe("store helpers", () => {
  it("creates a trimmed store with a default color", () => {
    expect(createStore("  Market ", { id: "s1" })).toEqual({ id: "s1", name: "Market", color: STORE_COLORS[0] });
  });

  it("adds a store once and rejects a duplicate name in any case", () => {
    const store = makeStore({ id: "s1", name: "Market" });
    const state = addStore(makeState(), store);
    expect(state.stores).toEqual([store]);
    expect(addStore(state, makeStore({ id: "s2", name: "market" }))).toBe(state);
  });

  it("renames a store, rejecting blanks and duplicates", () => {
    const state = makeState({ stores: [makeStore({ id: "s1", name: "Market" }), makeStore({ id: "s2", name: "Bakery" })] });
    expect(renameStore(state, "s1", "  Grocer ").stores[0].name).toBe("Grocer");
    expect(renameStore(state, "s1", "Bakery")).toBe(state);
    expect(renameStore(state, "s1", "  ")).toBe(state);
  });

  it("recolors only with a supported palette color", () => {
    const state = makeState({ stores: [makeStore()] });
    expect(recolorStore(state, "store-1", STORE_COLORS[2]).stores[0].color).toBe(STORE_COLORS[2]);
    expect(recolorStore(state, "store-1", "#000000")).toBe(state);
  });

  it("deletes a store and clears it from lists, keeping the lists", () => {
    const list = makeList("Weekly", [], { storeId: "store-1" });
    const state = makeState({ lists: [list], stores: [makeStore()] });
    const next = deleteStore(state, "store-1");
    expect(next.stores).toEqual([]);
    expect(next.lists[0].storeId).toBeNull();
    expect(deleteStore(state, "missing")).toBe(state);
  });

  it("looks up a store name", () => {
    expect(storeName([makeStore({ name: "Market" })], "store-1")).toBe("Market");
    expect(storeName([], "store-1")).toBeNull();
    expect(storeName([], null)).toBeNull();
  });
});

describe("grouping lists by store", () => {
  it("follows store order and puts unassigned lists last under No store", () => {
    const market = makeStore({ id: "market", name: "Market" });
    const bakery = makeStore({ id: "bakery", name: "Bakery" });
    const lists = [
      makeList("No store", [], { id: "none" }),
      makeList("Bakery run", [], { id: "b", storeId: "bakery" }),
      makeList("Market run", [], { id: "m", storeId: "market" }),
    ];
    const groups = groupListsByStore(lists, [market, bakery]);
    expect(groups.map((group) => group.name)).toEqual(["Market", "Bakery", "No store"]);
    expect(groups[0].lists.map((list) => list.name)).toEqual(["Market run"]);
    expect(groups[2]).toMatchObject({ key: "no-store", color: null });
  });

  it("omits stores with no lists and treats an unknown store id as unassigned", () => {
    const market = makeStore({ id: "market", name: "Market" });
    const bakery = makeStore({ id: "bakery", name: "Bakery" });
    const groups = groupListsByStore([makeList("Odd", [], { storeId: "gone" })], [market, bakery]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ key: "no-store", lists: [{ name: "Odd" }] });
  });
});

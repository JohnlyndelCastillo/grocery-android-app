import { useEffect, useMemo, useRef, useState } from "react";
import { budgetStatus, parseBudget } from "../../domain/budget";
import {
  addList as addListToState,
  addStore as addStoreToState,
  archiveList as archiveListInState,
  createList,
  createStore,
  deleteList as deleteListInState,
  deleteStore as deleteStoreInState,
  duplicateList as duplicateListInState,
  activeListOf,
  findList,
  markListShopped,
  recolorStore as recolorStoreInState,
  renameList as renameListInState,
  renameStore as renameStoreInState,
  restoreList as restoreListInState,
  setActiveList as setActiveListInState,
  storeName,
  updateListItems,
} from "../../domain/lists";
import { addItem, removeItems, setAllChecked, updateItem } from "../../domain/items";
import { addReceipt, buildReceipt, itemsFromReceipt, removeReceipt } from "../../domain/receipts";
import { spentToday } from "../../domain/selectors";
import { cartTotal, checkedCount, plannedTotal, round2 } from "../../domain/totals";
import type { AppStateV2, CurrencyCode, Item, ShoppingList, Store } from "../../domain/types";
import { isCurrency, loadCurrency, saveCurrency } from "../../storage/currency";
import type { GroceryStorage } from "../../storage/storage";
import { budgetMessage, makeMoney } from "../format";
import type { Tab, UndoAction } from "../types";

const UNDO_MS = 6000;
const NOTICE_MS = 4000;
const countLabel = (n: number): string => `${n} ${n === 1 ? "item" : "items"}`;

/** A delete the user has asked for but not yet confirmed. */
export interface PendingDelete {
  ids: Set<string>;
  /** Text shown in the confirm dialog. */
  prompt: string;
  /** Text shown in the undo banner afterwards. */
  doneMessage: string;
}

/**
 * All persisted app state plus the selected list's editing state. Components only render what this returns
 * and call what it exposes; nothing in here touches the DOM, so it can be tested without rendering the app.
 */
export function useGroceryList(storage: GroceryStorage, selectedListId: string | null = null) {
  const [state, setState] = useState<AppStateV2>(() => storage.loadState());
  const [dailyBudget, setDailyBudget] = useState<number | null>(() => storage.loadDailyBudget());
  const [currency, setCurrency] = useState<CurrencyCode>(() => loadCurrency());
  const [activeTab, setActiveTab] = useState<Tab>("needed");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [undo, setUndo] = useState<UndoAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storageIssue, setStorageIssue] = useState<string | null>(() => storage.getLoadNotice?.() ?? null);
  // Committing several changes in one event must build on the previous change, not the last render.
  const stateRef = useRef(state);
  stateRef.current = state;

  const activeList = findList(state.lists, selectedListId) ?? activeListOf(state);
  const items = activeList?.items ?? [];
  const receipts = state.receipts;

  useEffect(() => {
    if (!undo) return;
    const timeout = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => window.clearTimeout(timeout);
  }, [undo]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), NOTICE_MS);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  // A different list is a different editing session: never keep a tab, selection or dialog from the old one.
  useEffect(() => {
    setActiveTab("needed");
    setSelectionMode(false);
    setSelectedIds(new Set());
    setPendingDelete(null);
  }, [activeList?.id]);

  function commitState(update: (current: AppStateV2) => AppStateV2): AppStateV2 {
    const nextState = update(stateRef.current);
    stateRef.current = nextState;
    setState(nextState);
    storage.saveState(nextState);
    return nextState;
  }

  function commitItems(next: Item[]): void {
    if (!activeList) return;
    commitState((current) => updateListItems(current, activeList.id, next));
  }

  // ---- derived values ----
  const money = useMemo(() => makeMoney(currency), [currency]);
  const cartAmount = cartTotal(items);
  const spent = spentToday(state, currency);
  const status = budgetStatus(spent.amount, dailyBudget);
  const visibleItems = items.filter((item) => (activeTab === "needed" ? !item.checked : item.checked));
  const activeStoreName = storeName(state.stores, activeList?.storeId ?? null);

  function changeSelection(id: string, selected: boolean): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function deleteWithUndo(ids: Set<string>, message: string): void {
    if (!activeList) return;
    setUndo({ listId: activeList.id, items: items.filter((item) => ids.has(item.id)), message });
    commitItems(removeItems(items, ids));
  }

  function createNewList(name: string, storeId: string | null = null): ShoppingList | null {
    if (!name.trim()) return null;
    const list = createList(name, { storeId });
    commitState((current) => addListToState(current, list));
    return list;
  }

  function duplicateList(listId: string): ShoppingList | null {
    const result = duplicateListInState(state, listId);
    if (!result) return null;
    commitState(() => result.state);
    return result.list;
  }

  function repeatReceipt(receiptId: string): ShoppingList | null {
    const receipt = receipts.find((entry) => entry.id === receiptId);
    if (!receipt) return null;
    const matchedStore = receipt.storeName
      ? state.stores.find((store) => store.name.toLocaleLowerCase() === receipt.storeName?.toLocaleLowerCase())
      : undefined;
    const list = createList(`Repeat of ${receipt.listName ?? receipt.storeName ?? "trip"}`, {
      storeId: matchedStore?.id ?? null,
      items: itemsFromReceipt(receipt),
    });
    commitState((current) => addListToState(current, list));
    return list;
  }

  return {
    // persisted data
    state,
    lists: state.lists,
    stores: state.stores,
    receipts,
    activeList,
    activeStoreName,

    // selected list data
    items,
    visibleItems,
    activeTab,
    doneCount: checkedCount(items),
    money,
    currency,
    currencyLabel: currency, // the plain code ("PHP"), used as the price placeholder and the budget field prefix
    dailyBudget,
    budgetText: budgetMessage(status, money),
    budgetStatus: status,
    spentToday: spent,
    cartAmount,
    overBudget: status.state === "over",
    cartText: money.format(cartAmount),
    plannedText: money.format(plannedTotal(items)),
    selectionMode,
    selectedIds,
    pendingDelete,
    undo,
    notice,
    storageIssue,

    // items
    addItem: (name: string) => commitItems(addItem(items, name)),
    setChecked(id: string, checked: boolean): void {
      commitItems(updateItem(items, id, { checked }));
      changeSelection(id, false); // a checked item leaves this tab, so it must not stay selected
    },
    setQty: (id: string, qty: number) => commitItems(updateItem(items, id, { qty })),
    setPrice: (id: string, price: number) => commitItems(updateItem(items, id, { price })),
    checkAll: (checked: boolean) => commitItems(setAllChecked(items, checked)),
    // Saves a receipt for everything in the cart, then resets the list for the next trip.
    // Does nothing when the cart is empty.
    finishTrip(): void {
      if (!activeList) return;
      const remainingBudgetAtTime = dailyBudget === null ? null : round2(dailyBudget - spent.amount);
      const receipt = buildReceipt(items, {
        currency,
        budget: dailyBudget,
        listId: activeList.id,
        listName: activeList.name,
        storeName: activeStoreName,
        remainingBudgetAtTime,
      });
      if (!receipt) return;
      const now = new Date();
      commitState((current) => {
        const withReceipt = { ...current, receipts: addReceipt(current.receipts, receipt) };
        const reset = updateListItems(withReceipt, activeList.id, setAllChecked(items, false), now);
        return markListShopped(reset, activeList.id, now);
      });
      setActiveTab("needed");
      setSelectedIds(new Set());
      setSelectionMode(false);
      setNotice("Trip finished. Receipt saved in History.");
    },
    deleteReceipt(id: string): void {
      commitState((current) => ({ ...current, receipts: removeReceipt(current.receipts, id) }));
    },
    dismissNotice: () => setNotice(null),
    dismissStorageIssue: () => setStorageIssue(null),
    showNotice: (message: string) => setNotice(message),

    // tabs + selection
    changeTab(tab: Tab): void {
      setActiveTab(tab);
      setSelectedIds(new Set());
    },
    toggleSelectionMode(): void {
      setSelectionMode((current) => !current);
      setSelectedIds(new Set());
    },
    changeSelection,
    selectAllVisible: (selected: boolean) =>
      setSelectedIds(selected ? new Set(visibleItems.map((item) => item.id)) : new Set()),

    // deleting items
    quickDelete: (id: string, name: string) => deleteWithUndo(new Set([id]), `${name} deleted.`),
    requestDeleteOne(id: string, name: string): void {
      setPendingDelete({ ids: new Set([id]), prompt: `This will permanently remove ${name} from your list.`, doneMessage: "Item deleted." });
    },
    requestDeleteSelected(): void {
      if (!selectedIds.size) return;
      const label = countLabel(selectedIds.size);
      setPendingDelete({ ids: new Set(selectedIds), prompt: `This will permanently remove ${label} from your list.`, doneMessage: `${label} deleted.` });
    },
    cancelDelete: () => setPendingDelete(null),
    confirmDelete(): void {
      if (!pendingDelete) return;
      setPendingDelete(null);
      setSelectedIds(new Set());
      setSelectionMode(false);
      deleteWithUndo(pendingDelete.ids, pendingDelete.doneMessage);
    },
    undoDelete(): void {
      if (!undo) return;
      const sourceList = findList(stateRef.current.lists, undo.listId);
      if (!sourceList) {
        setNotice("The original list is no longer available.");
        setUndo(null);
        return;
      }
      const existingIds = new Set(sourceList.items.map((item) => item.id));
      const restoredItems = [...sourceList.items, ...undo.items.filter((item) => !existingIds.has(item.id))];
      commitState((current) => updateListItems(current, undo.listId, restoredItems));
      setUndo(null);
    },

    // lists
    createList: createNewList,
    selectList: (listId: string | null) => commitState((current) => setActiveListInState(current, listId)),
    renameList: (listId: string, name: string) => commitState((current) => renameListInState(current, listId, name)),
    duplicateList,
    archiveList: (listId: string) => commitState((current) => archiveListInState(current, listId)),
    restoreList: (listId: string) => commitState((current) => restoreListInState(current, listId)),
    deleteList: (listId: string) => commitState((current) => deleteListInState(current, listId)),
    repeatReceipt,
    findList: (listId: string) => findList(state.lists, listId),

    // stores
    createStore: (name: string, color?: string): Store | null => {
      if (!name.trim() || state.stores.some((store) => store.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) return null;
      const store = createStore(name, { color });
      commitState((current) => addStoreToState(current, store));
      return store;
    },
    renameStore: (storeId: string, name: string) => commitState((current) => renameStoreInState(current, storeId, name)),
    recolorStore: (storeId: string, color: string) => commitState((current) => recolorStoreInState(current, storeId, color)),
    deleteStore: (storeId: string) => commitState((current) => deleteStoreInState(current, storeId)),

    // budget + currency
    saveBudget(raw: string): void {
      const parsed = parseBudget(raw);
      if (!parsed.ok) return;
      setDailyBudget(parsed.value);
      storage.saveDailyBudget(parsed.value);
    },
    changeCurrency(next: CurrencyCode): void {
      if (!isCurrency(next)) return;
      setCurrency(next);
      saveCurrency(next);
    },
  };
}

export type GroceryList = ReturnType<typeof useGroceryList>;

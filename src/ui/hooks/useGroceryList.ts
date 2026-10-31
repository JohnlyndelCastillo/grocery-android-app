import { useEffect, useMemo, useState } from "react";
import { budgetStatus, parseBudget } from "../../domain/budget";
import { addItem, removeItems, setAllChecked, updateItem } from "../../domain/items";
import { addReceipt, buildReceipt, removeReceipt } from "../../domain/receipts";
import { cartTotal, checkedCount, plannedTotal } from "../../domain/totals";
import type { CurrencyCode, Item, Receipt } from "../../domain/types";
import { isCurrency, loadCurrency, saveCurrency } from "../../storage/currency";
import type { GroceryStorage } from "../../storage/storage";
import { budgetMessage, budgetShort, currencyFormatter, currencySymbol } from "../format";
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
 * All the grocery list's state and actions. Components only render what this returns and call what it
 * exposes; nothing in here touches the DOM, so it can be tested without rendering the app.
 */
export function useGroceryList(storage: GroceryStorage) {
  const [items, setItems] = useState<Item[]>(() => storage.loadItems());
  const [dailyBudget, setDailyBudget] = useState<number | null>(() => storage.loadDailyBudget());
  const [currency, setCurrency] = useState<CurrencyCode>(() => loadCurrency());
  const [activeTab, setActiveTab] = useState<Tab>("needed");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [undo, setUndo] = useState<UndoAction | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>(() => storage.loadReceipts());
  const [notice, setNotice] = useState<string | null>(null);

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

  // ---- derived values ----
  const money = useMemo(() => currencyFormatter(currency), [currency]);
  const cartAmount = cartTotal(items);
  const status = budgetStatus(cartAmount, dailyBudget);
  const visibleItems = items.filter((item) => (activeTab === "needed" ? !item.checked : item.checked));

  // ---- items ----
  function commitItems(next: Item[]): void {
    setItems(next);
    storage.saveItems(next);
  }

  function changeSelection(id: string, selected: boolean): void {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function deleteWithUndo(ids: Set<string>, message: string): void {
    setUndo({ items: items.filter((item) => ids.has(item.id)), message });
    commitItems(removeItems(items, ids));
  }

  return {
    // data
    items,
    visibleItems,
    activeTab,
    doneCount: checkedCount(items),
    money,
    currency,
    currencyLabel: currencySymbol(money) || currency,
    dailyBudget,
    budgetText: budgetMessage(status, money),
    budgetShortText: budgetShort(status, money),
    cartAmount,
    overBudget: status.state === "over",
    cartText: money.format(cartAmount),
    plannedText: money.format(plannedTotal(items)),
    selectionMode,
    selectedIds,
    pendingDelete,
    undo,
    receipts,
    notice,

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
      const receipt = buildReceipt(items, { currency, budget: dailyBudget });
      if (!receipt) return;
      const nextReceipts = addReceipt(receipts, receipt);
      setReceipts(nextReceipts);
      storage.saveReceipts(nextReceipts);
      commitItems(setAllChecked(items, false));
      setActiveTab("needed");
      setSelectedIds(new Set());
      setSelectionMode(false);
      setNotice("Trip finished. Receipt saved in Settings.");
    },
    deleteReceipt(id: string): void {
      const nextReceipts = removeReceipt(receipts, id);
      setReceipts(nextReceipts);
      storage.saveReceipts(nextReceipts);
    },
    dismissNotice: () => setNotice(null),

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

    // deleting
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
      commitItems([...items, ...undo.items]);
      setUndo(null);
    },

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

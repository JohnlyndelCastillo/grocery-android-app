import { useEffect, useRef, useState } from "react";
import { budgetStatus, parseBudget } from "../domain/budget";
import { addItem, removeItems, setAllChecked, updateItem } from "../domain/items";
import { cartTotal, checkedCount, plannedTotal } from "../domain/totals";
import type { CurrencyCode, Item } from "../domain/types";
import { isCurrency, loadCurrency, saveCurrency } from "../storage/currency";
import type { GroceryStorage } from "../storage/storage";
import { budgetMessage, currencyFormatter, currencySymbol } from "./format";
import type { SettingsView, Tab } from "./types";
import { AddItemForm } from "./components/AddItemForm";
import { BudgetPanel } from "./components/BudgetPanel";
import { DeleteDialog } from "./components/DeleteDialog";
import { Header } from "./components/Header";
import { SettingsPage } from "./components/SettingsPage";
import { ShoppingList } from "./components/ShoppingList";
import { UndoBanner, type UndoAction } from "./components/UndoBanner";

interface AppProps {
  storage: GroceryStorage;
}

export function App({ storage }: AppProps) {
  const [items, setItems] = useState<Item[]>(() => storage.loadItems());
  const [dailyBudget, setDailyBudget] = useState<number | null>(() => storage.loadDailyBudget());
  const [currency, setCurrency] = useState<CurrencyCode>(() => loadCurrency());
  const [activeTab, setActiveTab] = useState<Tab>("needed");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [settingsView, setSettingsView] = useState<SettingsView>("closed");
  const [undo, setUndo] = useState<UndoAction | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const homePageRef = useRef<HTMLDivElement>(null);
  const money = currencyFormatter(currency);

  const cartAmount = cartTotal(items);
  const plannedAmount = plannedTotal(items);
  const status = budgetStatus(cartAmount, dailyBudget);
  const doneCount = checkedCount(items);
  const visibleItems = items.filter((item) => (activeTab === "needed" ? !item.checked : item.checked));
  const pricePlaceholder = currencySymbol(money) || currency;

  useEffect(() => {
    if (!undo) return;
    const timeout = window.setTimeout(() => setUndo(null), 6000);
    return () => window.clearTimeout(timeout);
  }, [undo]);

  function commitItems(next: Item[]) {
    setItems(next);
    storage.saveItems(next);
  }

  function openDeleteDialog(message: string, itemId: string | null) {
    setDeleteMessage(message);
    setPendingDeleteId(itemId);
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDeleteDialog() {
    const dialog = dialogRef.current;
    if (dialog?.open && typeof dialog.close === "function") dialog.close();
    else dialog?.removeAttribute("open");
    setPendingDeleteId(null);
  }

  function deleteWithUndo(ids: Set<string>, message: string) {
    setUndo({ items: items.filter((item) => ids.has(item.id)), message });
    commitItems(removeItems(items, ids));
  }

  function confirmDelete() {
    if (!dialogRef.current?.open) return;
    const ids = pendingDeleteId ? new Set([pendingDeleteId]) : new Set(selectedIds);
    const message = pendingDeleteId ? "Item deleted." : `${ids.size} ${ids.size === 1 ? "item" : "items"} deleted.`;
    closeDeleteDialog();
    setSelectedIds(new Set());
    setSelectionMode(false);
    deleteWithUndo(ids, message);
  }

  function saveBudget(raw: string) {
    const parsed = parseBudget(raw);
    if (!parsed.ok) return;
    setDailyBudget(parsed.value);
    storage.saveDailyBudget(parsed.value);
  }

  function changeCurrency(next: CurrencyCode) {
    if (!isCurrency(next)) return;
    setCurrency(next);
    saveCurrency(next);
  }

  function changeTab(tab: Tab) {
    setActiveTab(tab);
    setSelectedIds(new Set());
  }

  function toggleSelection() {
    setSelectionMode((current) => !current);
    setSelectedIds(new Set());
  }

  function changeSelection(id: string, selected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function undoDelete() {
    if (!undo) return;
    commitItems([...items, ...undo.items]);
    setUndo(null);
  }

  function animateHomePageIn() {
    const page = homePageRef.current;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!page || reduceMotion || typeof page.animate !== "function") return;
    page.animate(
      [
        { opacity: 0, transform: "translateX(-12px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 260, easing: "cubic-bezier(.2,.75,.25,1)" },
    );
  }

  return (
    <>
      <div ref={homePageRef} id="home-page" className="flex h-full min-h-0 flex-col" hidden={settingsView !== "closed"}>
        <Header
          cartTotal={money.format(cartAmount)}
          plannedTotal={money.format(plannedAmount)}
          overBudget={status.state === "over"}
          onOpenSettings={() => setSettingsView("settings")}
        />
        <main className="min-h-0 flex-1 overflow-y-auto [overscroll-behavior-y:contain] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] pt-[19px] pb-[22px]">
          <BudgetPanel
            currency={currency}
            symbol={currencySymbol(money) || currency}
            budget={dailyBudget}
            status={budgetMessage(status, money)}
            onCurrencyChange={changeCurrency}
            onSaveBudget={saveBudget}
          />
          <AddItemForm onAdd={(name) => commitItems(addItem(items, name))} />
          <ShoppingList
            allItems={items}
            visibleItems={visibleItems}
            activeTab={activeTab}
            doneCount={doneCount}
            selectedIds={selectedIds}
            selectionMode={selectionMode}
            money={money}
            pricePlaceholder={pricePlaceholder}
            onTabChange={changeTab}
            onCheckAll={(checked) => commitItems(setAllChecked(items, checked))}
            onSelectAll={(checked) => setSelectedIds(checked ? new Set(visibleItems.map((item) => item.id)) : new Set())}
            onToggleSelection={toggleSelection}
            onDeleteSelected={() => {
              if (!selectedIds.size) return;
              const count = selectedIds.size;
              openDeleteDialog(`This will permanently remove ${count} ${count === 1 ? "item" : "items"} from your list.`, null);
            }}
            onChecked={(id, checked) => {
              commitItems(updateItem(items, id, { checked }));
              changeSelection(id, false);
            }}
            onSelected={changeSelection}
            onQty={(id, qty) => commitItems(updateItem(items, id, { qty }))}
            onPrice={(id, price) => commitItems(updateItem(items, id, { price }))}
            onQuickDelete={(id, name) => deleteWithUndo(new Set([id]), `${name} deleted.`)}
            onSwipeDelete={(id, name) => openDeleteDialog(`This will permanently remove ${name} from your list.`, id)}
          />
        </main>
        <footer className="shrink-0 bg-app pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-2">
          <button className="secondary block min-h-[46px] w-full rounded-xl border border-[#cbdcc9] bg-white font-bold text-green hover:bg-[#edf4ea]" id="uncheck" type="button" onClick={() => commitItems(setAllChecked(items, false))}>
            <span className="mr-[5px] text-[1.05rem]" aria-hidden="true">↻</span> Start a new trip
          </button>
        </footer>
      </div>

      <SettingsPage
        view={settingsView}
        onOpenAbout={() => setSettingsView("about")}
        onClose={() => setSettingsView((current) => current === "about" ? "settings" : "closed")}
        onHomeEnter={animateHomePageIn}
      />
      <DeleteDialog dialogRef={dialogRef} message={deleteMessage} onCancel={closeDeleteDialog} onConfirm={confirmDelete} />
      <UndoBanner undo={undo} onUndo={undoDelete} />
    </>
  );
}

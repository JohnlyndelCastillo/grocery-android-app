import { budgetStatus, parseBudget } from "../domain/budget";
import { addItem, removeItems, setAllChecked, updateItem } from "../domain/items";
import { cartTotal, checkedCount, plannedTotal } from "../domain/totals";
import type { Item } from "../domain/types";
import { isCurrency, loadCurrency, saveCurrency } from "../storage/currency";
import type { GroceryStorage } from "../storage/storage";
import { getElements } from "./elements";
import { budgetMessage, currencyFormatter, currencySymbol } from "./format";
import { setupHeaderCollapse } from "./header";
import { createRow, type RowContext } from "./row";
import { mountSettingsPage } from "./settings";
import { appTemplate } from "./template";
import { createUndo } from "./undo";

type Tab = "needed" | "cart";

export function mountApp(root: HTMLElement, storage: GroceryStorage): void {
  root.innerHTML = appTemplate;
  mountSettingsPage(root);
  const els = getElements(root);
  setupHeaderCollapse(els);
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  // ---- state ----
  let items: Item[] = storage.loadItems();
  let dailyBudget: number | null = storage.loadDailyBudget();
  let currency = loadCurrency();
  let money = currencyFormatter(currency);
  let activeTab: Tab = "needed";
  let selectionMode = false;
  let selectedIds = new Set<string>();
  let pendingDeleteId: string | null = null; // set while the swipe-delete dialog is open

  const undo = createUndo(els, (restored) => {
    setItems([...items, ...restored]);
    render();
  });

  const visibleItems = (): Item[] =>
    items.filter((item) => (activeTab === "needed" ? !item.checked : item.checked));

  // Every change to `items` goes through here: swap, save, refresh totals.
  function setItems(next: Item[]): void {
    items = next;
    storage.saveItems(items);
    updateTotals();
  }

  // ---- screen updates ----
  function updateTotals(): void {
    const inCart = cartTotal(items);
    const status = budgetStatus(inCart, dailyBudget);
    const over = status.state === "over";
    els.plannedTotal.textContent = money.format(plannedTotal(items));
    els.cartTotal.textContent = money.format(inCart);
    els.cartCard.classList.toggle("over-budget", over);
    els.cartCard.setAttribute("aria-label", `In your cart ${money.format(inCart)}${over ? ", over today's budget" : ""}`);
    els.budgetStatus.textContent = budgetMessage(status, money);
  }

  function updateProgress(): void {
    const done = checkedCount(items);
    els.itemCount.textContent = `${done} / ${items.length}`;
    els.itemCount.setAttribute("aria-label", `${done} of ${items.length} items in cart`);
    els.progressTrack.setAttribute("aria-valuemax", String(items.length));
    els.progressTrack.setAttribute("aria-valuenow", String(done));
    els.progressFill.style.width = `${items.length ? (done / items.length) * 100 : 0}%`;
    els.checkAll.checked = items.length > 0 && done === items.length;
    els.checkAll.indeterminate = done > 0 && done < items.length;
  }

  function updateBulkActions(): void {
    const n = selectedIds.size;
    const visible = visibleItems();
    const visibleSelected = visible.filter((item) => selectedIds.has(item.id)).length;
    els.bulkActions.hidden = !selectionMode;
    els.toggleSelectBtn.textContent = selectionMode ? "Cancel" : "Select Items";
    els.deleteSelectedBtn.textContent = n ? `Delete selected (${n})` : "Delete selected";
    els.deleteSelectedBtn.disabled = n === 0;
    els.selectAll.checked = visible.length > 0 && visibleSelected === visible.length;
    els.selectAll.indeterminate = visibleSelected > 0 && visibleSelected < visible.length;
  }

  function updateTabs(): void {
    const needed = items.filter((item) => !item.checked).length;
    els.neededCount.textContent = String(needed);
    els.cartCount.textContent = String(items.length - needed);
    for (const [tab, el] of [["needed", els.neededTab], ["cart", els.cartTab]] as const) {
      el.setAttribute("aria-selected", String(activeTab === tab));
      el.tabIndex = activeTab === tab ? 0 : -1;
    }
    els.listTabs.classList.toggle("cart-active", activeTab === "cart");
  }

  function rowContext(): RowContext {
    return {
      money,
      pricePlaceholder: currencySymbol(money) || currency,
      selecting: selectionMode,
      isSelected: (id) => selectedIds.has(id),
      getItem: (id) => items.find((item) => item.id === id),
      onChecked: (id, checked) => { setItems(updateItem(items, id, { checked })); render(true); },
      onSelected: (id, selected) => {
        if (selected) selectedIds.add(id);
        else selectedIds.delete(id);
        updateBulkActions();
      },
      onQty: (id, qty) => setItems(updateItem(items, id, { qty })),
      onPrice: (id, price) => setItems(updateItem(items, id, { price })),
      onQuickDelete: (id, name) => deleteWithUndo(new Set([id]), `${name} deleted.`),
      onSwipeDelete: (id, name) => {
        pendingDeleteId = id;
        els.deleteConfirmMessage.textContent = `This will permanently remove ${name} from your list.`;
        els.deleteDialog.showModal();
      },
    };
  }

  function render(animate = false): void {
    const rows = visibleItems();
    const ctx = rowContext();
    els.list.replaceChildren(...rows.map((item) => createRow(item, ctx)));
    if (animate && !reduceMotion && typeof els.list.animate === "function") {
      els.list.animate(
        [{ opacity: 0.35, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 220, easing: "cubic-bezier(.2,.75,.25,1)" },
      );
    }
    els.emptyState.textContent = activeTab === "needed" ? "Nothing left to shop for. You’re all set!" : "No items in your cart yet.";
    els.emptyState.hidden = rows.length > 0;
    updateTabs();
    updateProgress();
    updateBulkActions();
    updateTotals();
  }

  function deleteWithUndo(ids: Set<string>, message: string): void {
    undo.show(items.filter((item) => ids.has(item.id)), message);
    setItems(removeItems(items, ids));
    render(true);
  }

  function selectTab(tab: Tab): void {
    activeTab = tab;
    selectedIds.clear();
    render(true);
  }

  function setCurrency(next: typeof currency): void {
    currency = next;
    money = currencyFormatter(currency);
    saveCurrency(currency);
    els.budgetCurrency.textContent = currencySymbol(money) || currency;
    render();
  }

  // ---- events ----
  // add an item
  els.nameInput.addEventListener("input", () => {
    if (!els.nameInput.value.trim()) return;
    els.nameInput.classList.remove("invalid");
    els.nameInput.removeAttribute("aria-invalid");
  });
  els.addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!els.nameInput.value.trim()) {
      els.nameInput.classList.add("invalid");
      els.nameInput.setAttribute("aria-invalid", "true");
      els.nameInput.focus();
      return;
    }
    els.nameInput.classList.remove("invalid");
    els.nameInput.removeAttribute("aria-invalid");
    setItems(addItem(items, els.nameInput.value));
    els.nameInput.value = "";
    render();
  });

  // budget + currency
  els.budgetForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const parsed = parseBudget(els.budgetInput.value);
    if (!parsed.ok) return;
    dailyBudget = parsed.value;
    storage.saveDailyBudget(dailyBudget);
    updateTotals();
  });
  els.currencySelect.addEventListener("change", () => {
    if (isCurrency(els.currencySelect.value)) setCurrency(els.currencySelect.value);
  });

  // cart + tabs
  els.checkAll.addEventListener("change", () => { setItems(setAllChecked(items, els.checkAll.checked)); render(true); });
  els.uncheckBtn.addEventListener("click", () => { setItems(setAllChecked(items, false)); render(true); });
  els.neededTab.addEventListener("click", () => selectTab("needed"));
  els.cartTab.addEventListener("click", () => selectTab("cart"));

  // bulk select + delete
  els.toggleSelectBtn.addEventListener("click", () => {
    selectionMode = !selectionMode;
    selectedIds.clear();
    render();
  });
  els.selectAll.addEventListener("change", () => {
    selectedIds = els.selectAll.checked ? new Set(visibleItems().map((item) => item.id)) : new Set();
    render();
  });
  els.deleteSelectedBtn.addEventListener("click", () => {
    const n = selectedIds.size;
    if (!n) return;
    els.deleteConfirmMessage.textContent = `This will permanently remove ${n} ${n === 1 ? "item" : "items"} from your list.`;
    els.deleteDialog.showModal();
  });
  els.cancelDeleteBtn.addEventListener("click", () => {
    pendingDeleteId = null;
    els.deleteDialog.close();
  });
  els.confirmDeleteBtn.addEventListener("click", () => {
    if (!els.deleteDialog.open) return;
    const ids = pendingDeleteId ? new Set([pendingDeleteId]) : new Set(selectedIds);
    const message = pendingDeleteId ? "Item deleted." : `${ids.size} ${ids.size === 1 ? "item" : "items"} deleted.`;
    pendingDeleteId = null;
    selectedIds.clear();
    selectionMode = false; // leave select mode *before* the list redraws
    els.deleteDialog.close();
    deleteWithUndo(ids, message);
  });

  // ---- start ----
  els.currencySelect.value = currency;
  els.budgetInput.value = dailyBudget === null ? "" : String(dailyBudget);
  els.budgetCurrency.textContent = currencySymbol(money) || currency;
  render();
}

import { budgetStatus, parseBudget } from "../domain/budget";
import { addItem, removeItem, removeItems, setAllChecked, updateItem } from "../domain/items";
import { cartTotal, checkedCount, lineTotal, plannedTotal } from "../domain/totals";
import type { Item } from "../domain/types";
import type { GroceryStorage } from "../storage/storage";
import { budgetMessage, peso } from "./format";
import { appTemplate } from "./template";

export function mountApp(root: HTMLElement, storage: GroceryStorage): void {
  root.innerHTML = appTemplate;
  const $ = <T extends HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;

  const listEl = $<HTMLUListElement>("#list");
  const form = $<HTMLFormElement>("#add-form");
  const nameInput = $<HTMLInputElement>("#new-name");
  const cartTotalEl = $("#cart-total");
  const plannedTotalEl = $("#planned-total");
  const cartCardEl = $("#cart-card");
  const uncheckBtn = $<HTMLButtonElement>("#uncheck");
  const itemCountEl = $("#item-count");
  const emptyStateEl = $("#empty-state");
  const progressTrackEl = $(".progress-track");
  const progressFillEl = $("#progress-fill");
  const toggleSelectBtn = $<HTMLButtonElement>("#toggle-select");
  const bulkActionsEl = $<HTMLDivElement>("#bulk-actions");
  const selectAllEl = $<HTMLInputElement>("#select-all");
  const deleteSelectedBtn = $<HTMLButtonElement>("#delete-selected");
  const checkAllEl = $<HTMLInputElement>("#check-all");
  const deleteDialog = $<HTMLDialogElement>("#confirm-delete-dialog");
  const deleteConfirmMessage = $("#delete-confirm-message");
  const cancelDeleteBtn = $<HTMLButtonElement>("#cancel-delete");
  const confirmDeleteBtn = $<HTMLButtonElement>("#confirm-delete");
  const budgetForm = $<HTMLFormElement>("#budget-form");
  const budgetInput = $<HTMLInputElement>("#budget-input");
  const budgetStatusEl = $("#budget-status");

  // ---- state ----
  let items: Item[] = storage.loadItems();
  let dailyBudget: number | null = storage.loadDailyBudget();
  let selectionMode = false;
  let selectedIds = new Set<string>();

  budgetInput.value = dailyBudget === null ? "" : String(dailyBudget);

  // ---- derived UI ----
  function updateTotals(): void {
    const inCart = cartTotal(items);
    const status = budgetStatus(inCart, dailyBudget);
    plannedTotalEl.textContent = peso.format(plannedTotal(items));
    cartTotalEl.textContent = peso.format(inCart);
    cartCardEl.classList.toggle("over-budget", status.state === "over");
    cartCardEl.setAttribute(
      "aria-label",
      `In your cart ${peso.format(inCart)}${status.state === "over" ? ", over today's budget" : ""}`,
    );
    budgetStatusEl.textContent = budgetMessage(status);
  }

  function updateProgress(): void {
    const done = checkedCount(items);
    itemCountEl.textContent = `${done} / ${items.length}`;
    itemCountEl.setAttribute("aria-label", `${done} of ${items.length} items in cart`);
    progressTrackEl.setAttribute("aria-valuemax", String(items.length));
    progressTrackEl.setAttribute("aria-valuenow", String(done));
    progressFillEl.style.width = `${items.length ? (done / items.length) * 100 : 0}%`;
    checkAllEl.checked = items.length > 0 && done === items.length;
    checkAllEl.indeterminate = done > 0 && done < items.length;
  }

  function updateBulkActions(): void {
    bulkActionsEl.hidden = !selectionMode;
    toggleSelectBtn.textContent = selectionMode ? "Cancel" : "Select for delete";
    const n = selectedIds.size;
    deleteSelectedBtn.textContent = n ? `Delete selected (${n})` : "Delete selected";
    deleteSelectedBtn.disabled = n === 0;
    selectAllEl.checked = items.length > 0 && n === items.length;
    selectAllEl.indeterminate = n > 0 && n < items.length;
  }

  // Every change to `items` goes through here: swap, save, refresh totals.
  function setItems(next: Item[]): void {
    items = next;
    storage.saveItems(items);
    updateTotals();
  }

  // ---- rendering ----
  function numberInput(value: number, step: string, onChange: (n: number) => void): HTMLInputElement {
    const el = document.createElement("input");
    el.type = "number";
    el.inputMode = "decimal";
    el.min = "0";
    el.step = step;
    el.value = value ? String(value) : "";
    el.addEventListener("input", () => onChange(Number(el.value) || 0));
    return el;
  }

  function renderRow(item: Item): HTMLLIElement {
    // Rows keep focus while typing, so they look up the latest item instead of re-rendering.
    const current = (): Item => items.find((i) => i.id === item.id) ?? item;

    const li = document.createElement("li");
    if (item.checked) li.classList.add("done");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = item.checked;
    check.setAttribute("aria-label", `Mark ${item.name} as ${item.checked ? "not in cart" : "in cart"}`);
    check.addEventListener("change", () => {
      li.classList.toggle("done", check.checked);
      setItems(updateItem(items, item.id, { checked: check.checked }));
      updateProgress();
    });

    const select = document.createElement("input");
    select.type = "checkbox";
    select.className = "select-item";
    select.checked = selectedIds.has(item.id);
    select.hidden = !selectionMode;
    select.setAttribute("aria-label", `Select ${item.name} for deletion`);
    select.addEventListener("change", () => {
      if (select.checked) selectedIds.add(item.id);
      else selectedIds.delete(item.id);
      updateBulkActions();
    });

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = item.name;

    const subtotal = document.createElement("span");
    subtotal.className = "item-subtotal";
    const updateSubtotal = (): void => {
      subtotal.textContent = `Line total · ${peso.format(lineTotal(current()))}`;
    };
    updateSubtotal();

    const itemInfo = document.createElement("div");
    itemInfo.className = "item-info";
    itemInfo.append(name, subtotal);

    const qty = numberInput(item.qty, "1", (n) => {
      setItems(updateItem(items, item.id, { qty: n }));
      updateSubtotal();
    });
    qty.className = "qty";
    qty.title = "Quantity";
    qty.setAttribute("aria-label", `Quantity of ${item.name}`);

    const price = numberInput(item.price, "0.01", (n) => {
      setItems(updateItem(items, item.id, { price: n }));
      updateSubtotal();
    });
    price.className = "price";
    price.placeholder = "₱";
    price.title = "Price per unit";
    price.setAttribute("aria-label", `Price per unit for ${item.name}`);

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Delete ${item.name}`);
    del.addEventListener("click", () => {
      setItems(removeItem(items, item.id));
      render();
    });

    li.append(check, select, itemInfo, qty, price, del);
    return li;
  }

  function render(): void {
    listEl.replaceChildren(...items.map(renderRow));
    emptyStateEl.hidden = items.length > 0;
    updateProgress();
    updateBulkActions();
    updateTotals();
  }

  // ---- events ----
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setItems(addItem(items, nameInput.value));
    nameInput.value = "";
    render();
  });

  budgetForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const parsed = parseBudget(budgetInput.value);
    if (!parsed.ok) return;
    dailyBudget = parsed.value;
    storage.saveDailyBudget(dailyBudget);
    updateTotals();
  });

  uncheckBtn.addEventListener("click", () => {
    setItems(setAllChecked(items, false));
    render();
  });

  checkAllEl.addEventListener("change", () => {
    setItems(setAllChecked(items, checkAllEl.checked));
    render();
  });

  toggleSelectBtn.addEventListener("click", () => {
    selectionMode = !selectionMode;
    selectedIds.clear();
    render();
  });

  selectAllEl.addEventListener("change", () => {
    selectedIds = selectAllEl.checked ? new Set(items.map((i) => i.id)) : new Set();
    render();
  });

  deleteSelectedBtn.addEventListener("click", () => {
    const n = selectedIds.size;
    if (!n) return;
    deleteConfirmMessage.textContent = `This will permanently remove ${n} ${n === 1 ? "item" : "items"} from your list.`;
    deleteDialog.showModal();
  });

  cancelDeleteBtn.addEventListener("click", () => deleteDialog.close());

  confirmDeleteBtn.addEventListener("click", () => {
    if (!deleteDialog.open) return;
    setItems(removeItems(items, selectedIds));
    selectedIds.clear();
    selectionMode = false;
    deleteDialog.close();
    render();
  });

  render();
}

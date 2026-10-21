import { budgetStatus, parseBudget } from "../domain/budget";
import { ChevronUp, createElement } from "lucide";
import { addItem, removeItems, setAllChecked, updateItem } from "../domain/items";
import { cartTotal, checkedCount, lineTotal, plannedTotal } from "../domain/totals";
import type { Item } from "../domain/types";
import type { GroceryStorage } from "../storage/storage";
import { budgetMessage, currencyFormatter, type CurrencyCode } from "./format";
import { appTemplate } from "./template";
import { mountSettingsPage } from "./settings";

export function mountApp(root: HTMLElement, storage: GroceryStorage): void {
  root.innerHTML = appTemplate;
  mountSettingsPage(root);
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
  const neededTab = $<HTMLButtonElement>("#needed-tab");
  const cartTab = $<HTMLButtonElement>("#cart-tab");
  const listTabs = $(".list-tabs");
  const neededCount = $("#needed-count");
  const cartCount = $("#cart-count");
  const deleteDialog = $<HTMLDialogElement>("#confirm-delete-dialog");
  const deleteConfirmMessage = $("#delete-confirm-message");
  const cancelDeleteBtn = $<HTMLButtonElement>("#cancel-delete");
  const confirmDeleteBtn = $<HTMLButtonElement>("#confirm-delete");
  const budgetForm = $<HTMLFormElement>("#budget-form");
  const budgetInput = $<HTMLInputElement>("#budget-input");
  const budgetStatusEl = $("#budget-status");
  const currencySelect = $<HTMLSelectElement>("#currency-select");
  const budgetCurrencyEl = $("#budget-currency");
  const collapseHeaderBtn = $<HTMLButtonElement>("#collapse-header");
  const collapseIcon = createElement(ChevronUp);
  collapseIcon.classList.add("header-chevron");
  collapseIcon.setAttribute("aria-hidden", "true");
  collapseHeaderBtn.append(collapseIcon);
  const heroTitle = $("#hero-title");
  const undoBanner = $<HTMLDivElement>("#undo-banner");
  const undoMessage = $("#undo-message");
  const undoDeleteBtn = $<HTMLButtonElement>("#undo-delete");
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  // ---- state ----
  let items: Item[] = storage.loadItems();
  let dailyBudget: number | null = storage.loadDailyBudget();
  const savedCurrency = localStorage.getItem("grocery-currency-v1");
  let currency: CurrencyCode = savedCurrency === "VND" || savedCurrency === "USD" ? savedCurrency : "PHP";
  let money = currencyFormatter(currency);
  currencySelect.value = currency;
  let selectionMode = false;
  let activeTab: "needed" | "cart" = "needed";
  let selectedIds = new Set<string>();
  let pendingDeleteId: string | null = null;
  let deletedSnapshot: Item[] | null = null;
  let undoTimer = 0;

  budgetInput.value = dailyBudget === null ? "" : String(dailyBudget);

  // ---- derived UI ----
  function updateTotals(): void {
    const inCart = cartTotal(items);
    const status = budgetStatus(inCart, dailyBudget);
    plannedTotalEl.textContent = money.format(plannedTotal(items));
    cartTotalEl.textContent = money.format(inCart);
    cartCardEl.classList.toggle("over-budget", status.state === "over");
    cartCardEl.setAttribute(
      "aria-label",
      `In your cart ${money.format(inCart)}${status.state === "over" ? ", over today's budget" : ""}`,
    );
    budgetStatusEl.textContent = budgetMessage(status, money);
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
    toggleSelectBtn.textContent = selectionMode ? "Cancel" : "Select Items";
    const n = selectedIds.size;
    deleteSelectedBtn.textContent = n ? `Delete selected (${n})` : "Delete selected";
    deleteSelectedBtn.disabled = n === 0;
    const visibleItems = items.filter((item) => activeTab === "needed" ? !item.checked : item.checked);
    const visibleSelected = visibleItems.filter((item) => selectedIds.has(item.id)).length;
    selectAllEl.checked = visibleItems.length > 0 && visibleSelected === visibleItems.length;
    selectAllEl.indeterminate = visibleSelected > 0 && visibleSelected < visibleItems.length;
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
    li.classList.add("swipe-row");
    if (item.checked) li.classList.add("done");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = item.checked;
    check.setAttribute("aria-label", `Mark ${item.name} as ${item.checked ? "not in cart" : "in cart"}`);
    check.addEventListener("change", () => {
      li.classList.toggle("done", check.checked);
      setItems(updateItem(items, item.id, { checked: check.checked }));
      render(true);
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
      subtotal.textContent = `Line total · ${money.format(lineTotal(current()))}`;
    };
    updateSubtotal();

    const itemInfo = document.createElement("div");
    itemInfo.className = "item-info";
    const titleRow = document.createElement("div");
    titleRow.className = "item-title-row";
    titleRow.append(check, select, name);
    const detailsRow = document.createElement("div");
    detailsRow.className = "item-details-row";
    detailsRow.append(subtotal);
    itemInfo.append(titleRow, detailsRow);

    const qty = numberInput(item.qty || 1, "1", (n) => {
      setItems(updateItem(items, item.id, { qty: n }));
      updateSubtotal();
    });
    qty.className = "qty";
    qty.title = "Quantity";
    qty.setAttribute("aria-label", `Quantity of ${item.name}`);

    const quantity = document.createElement("div");
    quantity.className = "quantity-control";
    const adjustQty = (delta: number): void => {
      const next = Math.max(0, (Number(qty.value) || 0) + delta);
      qty.value = String(next);
      qty.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const decrement = document.createElement("button");
    decrement.type = "button";
    decrement.className = "qty-step";
    decrement.textContent = "−";
    decrement.setAttribute("aria-label", `Decrease quantity of ${item.name}`);
    decrement.addEventListener("click", () => adjustQty(-1));
    const increment = document.createElement("button");
    increment.type = "button";
    increment.className = "qty-step";
    increment.textContent = "+";
    increment.setAttribute("aria-label", `Increase quantity of ${item.name}`);
    increment.addEventListener("click", () => adjustQty(1));
    quantity.append(decrement, qty, increment);

    const price = numberInput(item.price, "0.01", (n) => {
      setItems(updateItem(items, item.id, { price: n }));
      updateSubtotal();
    });
    price.className = "price";
    price.placeholder = money.formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;
    price.title = "Price per unit";
    price.setAttribute("aria-label", `Price per unit for ${item.name}`);

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "✕";
    del.setAttribute("aria-label", `Delete ${item.name}`);
    del.addEventListener("click", () => {
      deleteWithUndo(new Set([item.id]), `${item.name} deleted.`);
    });

    let startX = 0;
    let startY = 0;
    let swiping = false;
    li.addEventListener("touchstart", (event) => {
      if (selectionMode || event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      swiping = false;
    }, { passive: true });
    li.addEventListener("touchmove", (event) => {
      if (selectionMode || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - startX;
      const dy = event.touches[0].clientY - startY;
      if (!swiping && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) swiping = true;
      if (swiping) event.preventDefault();
    }, { passive: false });
    li.addEventListener("touchend", (event) => {
      if (selectionMode || !swiping) return;
      const dx = event.changedTouches[0].clientX - startX;
      if (dx < -48) {
        root.querySelectorAll(".swipe-row.is-swiped").forEach((row) => row.classList.remove("is-swiped"));
        li.classList.add("is-swiped");
      } else if (dx > 48) {
        li.classList.remove("is-swiped");
      }
      swiping = false;
    });
    li.addEventListener("click", (event) => {
      if ((event.target as HTMLElement).closest("button, input")) return;
      if (li.classList.contains("is-swiped")) li.classList.remove("is-swiped");
    });

    const content = document.createElement("div");
    content.className = "swipe-content";
    detailsRow.append(quantity, price, del);
    content.append(itemInfo);
    const swipeDelete = document.createElement("button");
    swipeDelete.className = "swipe-delete";
    swipeDelete.textContent = "Delete";
    swipeDelete.setAttribute("aria-label", `Delete ${item.name}`);
    swipeDelete.addEventListener("click", () => requestDelete(item.id, item.name));
    li.append(swipeDelete, content);
    return li;
  }

  function requestDelete(id: string, name: string): void {
    pendingDeleteId = id;
    deleteConfirmMessage.textContent = `This will permanently remove ${name} from your list.`;
    deleteDialog.showModal();
  }

  function render(animateListChange = false): void {
    const needed = items.filter((item) => !item.checked);
    const inCart = items.filter((item) => item.checked);
    neededCount.textContent = String(needed.length);
    cartCount.textContent = String(inCart.length);
    neededTab.setAttribute("aria-selected", String(activeTab === "needed"));
    cartTab.setAttribute("aria-selected", String(activeTab === "cart"));
    listTabs.classList.toggle("cart-active", activeTab === "cart");
    neededTab.tabIndex = activeTab === "needed" ? 0 : -1;
    cartTab.tabIndex = activeTab === "cart" ? 0 : -1;
    listEl.replaceChildren(...(activeTab === "needed" ? needed : inCart).map(renderRow));
    if (animateListChange && !reduceMotion && typeof listEl.animate === "function") {
      listEl.animate(
        [
          { opacity: 0.35, transform: "translateY(5px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 220, easing: "cubic-bezier(.2,.75,.25,1)" },
      );
    }
    emptyStateEl.textContent = activeTab === "needed" ? "Nothing left to shop for. You’re all set!" : "No items in your cart yet.";
    emptyStateEl.hidden = (activeTab === "needed" ? needed : inCart).length > 0;
    updateProgress();
    updateBulkActions();
    updateTotals();
  }

  function selectTab(tab: "needed" | "cart"): void {
    activeTab = tab;
    selectedIds.clear();
    render(true);
  }

  function deleteWithUndo(ids: Set<string>, message: string): void {
    deletedSnapshot = items.filter((item) => ids.has(item.id));
    setItems(removeItems(items, ids));
    undoMessage.textContent = message;
    undoBanner.hidden = false;
    window.clearTimeout(undoTimer);
    undoTimer = window.setTimeout(() => { undoBanner.hidden = true; deletedSnapshot = null; }, 6000);
    render(true);
  }

  // ---- events ----
  currencySelect.addEventListener("change", () => {
    const selected = currencySelect.value as CurrencyCode;
    if (!["PHP", "VND", "USD"].includes(selected)) return;
    currency = selected;
    money = currencyFormatter(currency);
    localStorage.setItem("grocery-currency-v1", currency);
    budgetCurrencyEl.textContent = money.formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;
    render();
  });

  collapseHeaderBtn.addEventListener("click", () => {
    const collapsed = collapseHeaderBtn.getAttribute("aria-expanded") === "true";
    collapseHeaderBtn.setAttribute("aria-expanded", String(!collapsed));
    collapseHeaderBtn.setAttribute("aria-label", collapsed ? "Expand header" : "Collapse header");
    heroTitle.setAttribute("aria-hidden", String(collapsed));
    root.querySelector(".hero")?.classList.toggle("collapsed", collapsed);
  });

  undoDeleteBtn.addEventListener("click", () => {
    if (!deletedSnapshot) return;
    setItems([...items, ...deletedSnapshot]);
    deletedSnapshot = null;
    undoBanner.hidden = true;
    window.clearTimeout(undoTimer);
    render();
  });

  nameInput.addEventListener("input", () => {
    if (nameInput.value.trim()) {
      nameInput.classList.remove("invalid");
      nameInput.removeAttribute("aria-invalid");
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!nameInput.value.trim()) {
      nameInput.classList.add("invalid");
      nameInput.setAttribute("aria-invalid", "true");
      nameInput.focus();
      return;
    }
    nameInput.classList.remove("invalid");
    nameInput.removeAttribute("aria-invalid");
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
    render(true);
  });

  checkAllEl.addEventListener("change", () => {
    setItems(setAllChecked(items, checkAllEl.checked));
    render(true);
  });

  neededTab.addEventListener("click", () => selectTab("needed"));
  cartTab.addEventListener("click", () => selectTab("cart"));

  toggleSelectBtn.addEventListener("click", () => {
    selectionMode = !selectionMode;
    selectedIds.clear();
    render();
  });

  selectAllEl.addEventListener("change", () => {
    const visibleItems = items.filter((item) => activeTab === "needed" ? !item.checked : item.checked);
    selectedIds = selectAllEl.checked ? new Set(visibleItems.map((item) => item.id)) : new Set();
    render();
  });

  deleteSelectedBtn.addEventListener("click", () => {
    const n = selectedIds.size;
    if (!n) return;
    deleteConfirmMessage.textContent = `This will permanently remove ${n} ${n === 1 ? "item" : "items"} from your list.`;
    deleteDialog.showModal();
  });

  cancelDeleteBtn.addEventListener("click", () => {
    pendingDeleteId = null;
    deleteDialog.close();
  });

  confirmDeleteBtn.addEventListener("click", () => {
    if (!deleteDialog.open) return;
    if (pendingDeleteId) {
      deleteWithUndo(new Set([pendingDeleteId]), "Item deleted.");
      pendingDeleteId = null;
    } else {
      deleteWithUndo(selectedIds, `${selectedIds.size} items deleted.`);
    }
    selectedIds.clear();
    selectionMode = false;
    deleteDialog.close();
    if (undoBanner.hidden) render();
  });

  budgetCurrencyEl.textContent = money.formatToParts(0).find((part) => part.type === "currency")?.value ?? currency;
  render();
}

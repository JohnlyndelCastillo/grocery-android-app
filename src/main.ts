import "./style.css";
import type { Item } from "./types";
import { loadDailyBudget, loadItems, saveDailyBudget, saveItems } from "./storage";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

let items: Item[] = loadItems();
let dailyBudget: number | null = loadDailyBudget();

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <header class="hero">
    <div class="eyebrow">YOUR MARKET RUN</div>
    <h1>Grocery list<span class="hero-mark" aria-hidden="true">✳</span></h1>
    <p>Keep track of what you need and what’s in your cart.</p>
    <div class="totals" aria-label="Spending summary">
      <div id="cart-card" class="total-card cart-card"><span>In your cart</span><strong id="cart-total"></strong></div>
      <div class="total-card"><span>Planned total</span><strong id="planned-total"></strong></div>
    </div>
  </header>
  <main>
    <form id="budget-form" class="budget-form">
      <label for="budget-input">Today’s budget</label>
      <div class="budget-controls">
        <span aria-hidden="true">₱</span>
        <input id="budget-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Set a spending limit" />
        <button type="submit">Save</button>
      </div>
      <p id="budget-status" aria-live="polite"></p>
    </form>
    <form id="add-form">
      <label class="sr-only" for="new-name">New grocery item</label>
      <input id="new-name" placeholder="What do you need?" required autocomplete="off" />
      <button type="submit"><span aria-hidden="true">＋</span> Add item</button>
    </form>
    <section class="list-section" aria-labelledby="list-heading">
      <div class="section-heading">
        <div><h2 id="list-heading">Your list</h2><p>Tap an item when it’s in your cart.</p></div>
        <div class="heading-actions"><span id="item-count" class="item-count"></span><button id="toggle-select" class="text-button" type="button">Select for delete</button></div>
      </div>
      <div class="progress-track" role="progressbar" aria-label="Shopping progress" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">
        <span id="progress-fill"></span>
      </div>
      <div class="check-all-row"><label><input id="check-all" type="checkbox" /> Mark all in cart</label></div>
      <div id="bulk-actions" class="bulk-actions" hidden>
        <label><input id="select-all" type="checkbox" /> Select all to delete</label>
        <button id="delete-selected" type="button" disabled>Delete selected</button>
      </div>
      <ul id="list"></ul>
      <p id="empty-state" class="empty-state">Your list is looking fresh. Add your first item above.</p>
    </section>
    <button id="uncheck" class="secondary"><span aria-hidden="true">↻</span> Start a new trip</button>
  </main>
  <dialog id="confirm-delete-dialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-confirm-message">
    <div class="dialog-content">
      <h2 id="delete-dialog-title">Delete selected items?</h2>
      <p id="delete-confirm-message"></p>
      <div class="dialog-actions">
        <button id="cancel-delete" type="button" class="dialog-cancel">Cancel</button>
        <button id="confirm-delete" type="button" class="dialog-confirm">Delete items</button>
      </div>
    </div>
  </dialog>
`;

const listEl = app.querySelector<HTMLUListElement>("#list")!;
const form = app.querySelector<HTMLFormElement>("#add-form")!;
const nameInput = app.querySelector<HTMLInputElement>("#new-name")!;
const cartTotalEl = app.querySelector<HTMLElement>("#cart-total")!;
const plannedTotalEl = app.querySelector<HTMLElement>("#planned-total")!;
const uncheckBtn = app.querySelector<HTMLButtonElement>("#uncheck")!;
const itemCountEl = app.querySelector<HTMLElement>("#item-count")!;
const emptyStateEl = app.querySelector<HTMLElement>("#empty-state")!;
const progressTrackEl = app.querySelector<HTMLElement>(".progress-track")!;
const progressFillEl = app.querySelector<HTMLElement>("#progress-fill")!;
const toggleSelectBtn = app.querySelector<HTMLButtonElement>("#toggle-select")!;
const bulkActionsEl = app.querySelector<HTMLDivElement>("#bulk-actions")!;
const selectAllEl = app.querySelector<HTMLInputElement>("#select-all")!;
const deleteSelectedBtn = app.querySelector<HTMLButtonElement>("#delete-selected")!;
const checkAllEl = app.querySelector<HTMLInputElement>("#check-all")!;
const deleteDialog = app.querySelector<HTMLDialogElement>("#confirm-delete-dialog")!;
const deleteConfirmMessage = app.querySelector<HTMLElement>("#delete-confirm-message")!;
const cancelDeleteBtn = app.querySelector<HTMLButtonElement>("#cancel-delete")!;
const confirmDeleteBtn = app.querySelector<HTMLButtonElement>("#confirm-delete")!;
const budgetForm = app.querySelector<HTMLFormElement>("#budget-form")!;
const budgetInput = app.querySelector<HTMLInputElement>("#budget-input")!;
const budgetStatusEl = app.querySelector<HTMLElement>("#budget-status")!;
const cartCardEl = app.querySelector<HTMLElement>("#cart-card")!;
let selectionMode = false;
let selectedIds = new Set<string>();

budgetInput.value = dailyBudget === null ? "" : String(dailyBudget);

function persist(): void {
  saveItems(items);
  updateTotals();
}

function updateTotals(): void {
  const lineTotal = (i: Item): number => i.qty * i.price;
  const planned = items.reduce((sum, i) => sum + lineTotal(i), 0);
  const inCart = items.filter((i) => i.checked).reduce((sum, i) => sum + lineTotal(i), 0);
  plannedTotalEl.textContent = peso.format(planned);
  cartTotalEl.textContent = peso.format(inCart);
  const overBudget = dailyBudget !== null && inCart > dailyBudget;
  cartCardEl.classList.toggle("over-budget", overBudget);
  cartCardEl.setAttribute("aria-label", `In your cart ${peso.format(inCart)}${overBudget ? ", over today's budget" : ""}`);
  if (dailyBudget === null) {
    budgetStatusEl.textContent = "Set a limit to track today’s spending.";
  } else if (overBudget) {
    budgetStatusEl.textContent = `${peso.format(inCart - dailyBudget)} over today’s budget`;
  } else if (inCart === dailyBudget) {
    budgetStatusEl.textContent = "You’re right at today’s budget.";
  } else {
    budgetStatusEl.textContent = `${peso.format(dailyBudget - inCart)} left for today`;
  }
}

function updateProgress(): void {
  const checkedCount = items.filter((item) => item.checked).length;
  itemCountEl.textContent = `${checkedCount} / ${items.length}`;
  itemCountEl.setAttribute("aria-label", `${checkedCount} of ${items.length} items in cart`);
  progressTrackEl.setAttribute("aria-valuemax", String(items.length));
  progressTrackEl.setAttribute("aria-valuenow", String(checkedCount));
  progressFillEl.style.width = `${items.length ? (checkedCount / items.length) * 100 : 0}%`;
  checkAllEl.checked = items.length > 0 && checkedCount === items.length;
  checkAllEl.indeterminate = checkedCount > 0 && checkedCount < items.length;
}

function updateBulkActions(): void {
  bulkActionsEl.hidden = !selectionMode;
  toggleSelectBtn.textContent = selectionMode ? "Cancel" : "Select for delete";
  const selectedCount = selectedIds.size;
  deleteSelectedBtn.textContent = selectedCount ? `Delete selected (${selectedCount})` : "Delete selected";
  deleteSelectedBtn.disabled = selectedCount === 0;
  selectAllEl.checked = items.length > 0 && selectedCount === items.length;
  selectAllEl.indeterminate = selectedCount > 0 && selectedCount < items.length;
}

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

function render(): void {
  listEl.replaceChildren();
  emptyStateEl.hidden = items.length > 0;
  updateProgress();
  updateBulkActions();

  for (const item of items) {
    const li = document.createElement("li");
    if (item.checked) li.classList.add("done");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = item.checked;
    check.setAttribute("aria-label", `Mark ${item.name} as ${item.checked ? "not in cart" : "in cart"}`);
    check.addEventListener("change", () => {
      item.checked = check.checked;
      li.classList.toggle("done", item.checked);
      updateProgress();
      persist();
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

    const itemInfo = document.createElement("div");
    itemInfo.className = "item-info";
    const subtotal = document.createElement("span");
    subtotal.className = "item-subtotal";
    const updateSubtotal = (): void => {
      subtotal.textContent = `Line total · ${peso.format(item.qty * item.price)}`;
    };
    updateSubtotal();
    itemInfo.append(name, subtotal);

    const qty = numberInput(item.qty, "1", (n) => {
      item.qty = n;
      updateSubtotal();
      persist();
    });
    qty.className = "qty";
    qty.title = "Quantity";
    qty.setAttribute("aria-label", `Quantity of ${item.name}`);

    const price = numberInput(item.price, "0.01", (n) => {
      item.price = n;
      updateSubtotal();
      persist();
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
      items = items.filter((i) => i.id !== item.id);
      persist();
      render();
    });

    li.append(check, select, itemInfo, qty, price, del);
    listEl.append(li);
  }

  updateTotals();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();
  if (!name) return;
  items.push({ id: crypto.randomUUID(), name, qty: 1, price: 0, checked: false });
  nameInput.value = "";
  persist();
  render();
});

budgetForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = budgetInput.value.trim();
  dailyBudget = value === "" ? null : Number(value);
  if (dailyBudget !== null && (!Number.isFinite(dailyBudget) || dailyBudget < 0)) return;
  saveDailyBudget(dailyBudget);
  updateTotals();
});

uncheckBtn.addEventListener("click", () => {
  items.forEach((i) => (i.checked = false));
  persist();
  render();
});

toggleSelectBtn.addEventListener("click", () => {
  selectionMode = !selectionMode;
  selectedIds.clear();
  render();
});

selectAllEl.addEventListener("change", () => {
  selectedIds = selectAllEl.checked ? new Set(items.map((item) => item.id)) : new Set();
  render();
});

deleteSelectedBtn.addEventListener("click", () => {
  const selectedCount = selectedIds.size;
  if (!selectedCount) return;
  deleteConfirmMessage.textContent = `This will permanently remove ${selectedCount} ${selectedCount === 1 ? "item" : "items"} from your list.`;
  deleteDialog.showModal();
});

cancelDeleteBtn.addEventListener("click", () => deleteDialog.close());

confirmDeleteBtn.addEventListener("click", () => {
  if (!deleteDialog.open) return;
  items = items.filter((item) => !selectedIds.has(item.id));
  selectedIds.clear();
  selectionMode = false;
  deleteDialog.close();
  persist();
  render();
});

checkAllEl.addEventListener("change", () => {
  items.forEach((item) => (item.checked = checkAllEl.checked));
  persist();
  render();
});

render();

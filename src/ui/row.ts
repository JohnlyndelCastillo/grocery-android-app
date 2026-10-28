import { lineTotal } from "../domain/totals";
import type { Item } from "../domain/types";
import { attachSwipe } from "./swipe";

// Everything a row needs from the outside. The row never touches app state itself.
export interface RowContext {
  money: Intl.NumberFormat;
  pricePlaceholder: string;
  selecting: boolean;
  isSelected(id: string): boolean;
  getItem(id: string): Item | undefined;
  onChecked(id: string, checked: boolean): void;
  onSelected(id: string, selected: boolean): void;
  onQty(id: string, qty: number): void;
  onPrice(id: string, price: number): void;
  onQuickDelete(id: string, name: string): void; // the ✕ button
  onSwipeDelete(id: string, name: string): void; // the red Delete button
}

function make<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function checkbox(checked: boolean, label: string, className = ""): HTMLInputElement {
  const el = make("input", className);
  el.type = "checkbox";
  el.checked = checked;
  el.setAttribute("aria-label", label);
  return el;
}

function button(className: string, text: string, label: string, onClick: () => void): HTMLButtonElement {
  const el = make("button", className, text);
  el.type = "button";
  el.setAttribute("aria-label", label);
  el.addEventListener("click", onClick);
  return el;
}

function numberField(value: number, step: string, blankWhenZero: boolean, onChange: (n: number) => void): HTMLInputElement {
  const el = make("input");
  el.type = "number";
  el.inputMode = "decimal";
  el.min = "0";
  el.step = step;
  el.value = blankWhenZero && !value ? "" : String(value);
  el.addEventListener("input", () => onChange(Number(el.value) || 0));
  return el;
}

export function createRow(item: Item, ctx: RowContext): HTMLLIElement {
  // Typing must not re-render the row (it would lose focus), so read the latest values on demand.
  const current = (): Item => ctx.getItem(item.id) ?? item;

  const li = make("li", "swipe-row");
  li.classList.toggle("done", item.checked);
  attachSwipe(li, () => ctx.selecting);

  const check = checkbox(item.checked, `Mark ${item.name} as ${item.checked ? "not in cart" : "in cart"}`);
  check.addEventListener("change", () => {
    li.classList.toggle("done", check.checked);
    ctx.onChecked(item.id, check.checked);
  });

  const select = checkbox(ctx.isSelected(item.id), `Select ${item.name} for deletion`, "select-item");
  select.hidden = !ctx.selecting;
  select.addEventListener("change", () => ctx.onSelected(item.id, select.checked));

  const subtotal = make("span", "item-subtotal");
  const refreshSubtotal = (): void => {
    subtotal.textContent = `Line total · ${ctx.money.format(lineTotal(current()))}`;
  };
  refreshSubtotal();

  const qty = numberField(item.qty, "1", false, (n) => { ctx.onQty(item.id, n); refreshSubtotal(); });
  qty.className = "qty";
  qty.title = "Quantity";
  qty.setAttribute("aria-label", `Quantity of ${item.name}`);

  const step = (delta: number): void => {
    qty.value = String(Math.max(0, (Number(qty.value) || 0) + delta)); // never below zero
    qty.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const quantity = make("div", "quantity-control");
  quantity.append(
    button("qty-step", "−", `Decrease quantity of ${item.name}`, () => step(-1)),
    qty,
    button("qty-step", "+", `Increase quantity of ${item.name}`, () => step(1)),
  );

  const price = numberField(item.price, "0.01", true, (n) => { ctx.onPrice(item.id, n); refreshSubtotal(); });
  price.className = "price";
  price.placeholder = ctx.pricePlaceholder;
  price.title = "Price per unit";
  price.setAttribute("aria-label", `Price per unit for ${item.name}`);

  const del = button("del", "✕", `Delete ${item.name}`, () => ctx.onQuickDelete(item.id, item.name));

  const titleRow = make("div", "item-title-row");
  titleRow.append(check, select, make("span", "name", item.name));
  const detailsRow = make("div", "item-details-row");
  detailsRow.append(subtotal, quantity, price, del);
  const info = make("div", "item-info");
  info.append(titleRow, detailsRow);
  const content = make("div", "swipe-content");
  content.append(info);

  const swipeDelete = button("swipe-delete", "Delete", `Delete ${item.name}`, () => ctx.onSwipeDelete(item.id, item.name));
  li.append(swipeDelete, content);
  return li;
}

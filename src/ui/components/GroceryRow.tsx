import { useRef } from "react";
import { lineTotal } from "../../domain/totals";
import type { Item } from "../../domain/types";
import { useSwipe } from "../hooks/useSwipe";
import type { Money } from "../format";

interface GroceryRowProps {
  item: Item;
  money: Money;
  pricePlaceholder: string;
  selecting: boolean;
  selected: boolean;
  swiped: boolean;
  onSwipe(id: string, open: boolean): void;
  onChecked(id: string, checked: boolean): void;
  onSelected(id: string, selected: boolean): void;
  onQty(id: string, qty: number): void;
  onPrice(id: string, price: number): void;
  onQuickDelete(id: string, name: string): void;
  onSwipeDelete(id: string, name: string): void;
}

const label = "mb-1 block text-label text-muted";
const step = "qty-step tap grid h-[48px] w-[48px] shrink-0 place-items-center rounded-none bg-transparent p-0 text-[1.375rem] font-medium text-ink touch-manipulation";

// One row inside the list card. Three parts, none shorter than 48dp:
//  1. checkbox + name (wraps) + "Line total",
//  2. labeled editors: Quantity (three 48dp areas) and Unit price,
//  3. remove, in its own 48dp area.
// The editors wrap, so at 320dp or large text they stack instead of squeezing.
export function GroceryRow({ item, money, pricePlaceholder, selecting, selected, swiped, onSwipe, onChecked, onSelected, onQty, onPrice, onQuickDelete, onSwipeDelete }: GroceryRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  useSwipe(rowRef, {
    disabled: selecting,
    onSwipeLeft: () => onSwipe(item.id, true),
    onSwipeRight: () => {
      if (swiped) onSwipe(item.id, false);
      else if (!item.checked && !selecting) onChecked(item.id, true);
    },
  });

  function changeQuantity(delta: number) {
    const current = Number(quantityRef.current?.value ?? item.qty) || 0;
    const next = Math.max(0, current + delta);
    if (quantityRef.current) quantityRef.current.value = String(next);
    onQty(item.id, next);
  }

  return (
    <li
      ref={rowRef}
      data-swiped={swiped}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("button, input")) onSwipe(item.id, false);
      }}
      className={`group swipe-row swipe-enter touch-pan-y relative overflow-hidden border-b border-[var(--color-line)] last:border-b-0 ${item.checked ? "done" : ""}`}
    >
      <button
        className="swipe-delete absolute inset-y-0 right-0 w-[84px] rounded-none bg-[var(--color-danger-fill)] text-label font-semibold text-on-danger"
        type="button"
        aria-label={`Delete ${item.name}`}
        onClick={() => onSwipeDelete(item.id, item.name)}
      >Delete</button>
      <div className="swipe-content relative z-[1] w-full bg-[var(--color-surface)] px-4 pb-4 pt-1 transition-transform duration-200 group-data-[swiped=true]:-translate-x-[76px]">
        <div className="item-title-row -ml-2 flex min-w-0 items-start">
          <label className="tap grid shrink-0 place-items-center" hidden={!selecting}>
            <input
              className="select-item"
              type="checkbox"
              checked={selected}
              aria-label={`Select ${item.name} for deletion`}
              onChange={(event) => onSelected(item.id, event.currentTarget.checked)}
            />
          </label>
          <label className="tap grid shrink-0 place-items-center">
            <input
              className="item-check"
              type="checkbox"
              checked={item.checked}
              aria-label={`Mark ${item.name} as ${item.checked ? "not in cart" : "in cart"}`}
              onChange={(event) => onChecked(item.id, event.currentTarget.checked)}
            />
          </label>
          {/* Checked items only strike the name through. Nothing else is faded. */}
          <span className={`name min-w-0 flex-1 py-3 text-item font-medium ${item.checked ? "line-through" : ""}`}>{item.name}</span>
          <div className="item-subtotal shrink-0 pl-3 pt-0.5 text-right">
            <span className="block text-label text-muted">Line total</span>
            <span className="num block text-body font-semibold text-green">{money.format(lineTotal(item))}</span>
          </div>
        </div>
        
        <div className="item-details-row mt-1 flex flex-wrap items-end gap-2">
          {/* Quantity */}
          <div className="min-w-0">
            <span className={label} aria-hidden="true">Quantity</span>

            <div className="quantity-control flex h-[48px] w-[144px] overflow-hidden rounded-xl bg-[var(--color-quantity-surface)]">
              <button
                className={step}
                type="button"
                aria-label={`Decrease quantity of ${item.name}`}
                onClick={() => changeQuantity(-1)}
              >−</button>

              <input
                ref={quantityRef}
                className="qty num tap w-[48px] shrink-0 text-center"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                defaultValue={item.qty}
                title="Quantity"
                aria-label={`Quantity of ${item.name}`}
                onInput={(event) =>
                  onQty(item.id, Number(event.currentTarget.value) || 0)
                }
              />

              <button
                className={step}
                type="button"
                aria-label={`Increase quantity of ${item.name}`}
                onClick={() => changeQuantity(1)}
              >+</button>
            </div>
          </div>

          {/* Unit price */}
          <div className="min-w-[128px] flex-1">
            <span className={label} aria-hidden="true">
              Unit price · {pricePlaceholder}
            </span>

            <input
              className="price num w-full text-right"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={item.price || ""}
              placeholder={pricePlaceholder}
              title="Price per unit"
              aria-label={`Price per unit for ${item.name}`}
              onInput={(event) =>
                onPrice(item.id, Number(event.currentTarget.value) || 0)
              }
            />
          </div>

          {/* Delete */}
          <button
            className="del tap grid size-[48px] shrink-0 place-items-center rounded-xl bg-transparent p-0 text-muted"
            type="button"
            aria-label={`Delete ${item.name}`}
            onClick={() => onQuickDelete(item.id, item.name)}
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
</div>
      </div>
    </li>
  );
}

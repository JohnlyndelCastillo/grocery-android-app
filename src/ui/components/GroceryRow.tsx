import { useRef } from "react";
import { lineTotal } from "../../domain/totals";
import type { Item } from "../../domain/types";
import { useSwipe } from "../hooks/useSwipe";

interface GroceryRowProps {
  item: Item;
  money: Intl.NumberFormat;
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

  const fieldClass = "h-[38px] rounded-[9px] px-[7px] text-center text-[.83rem]";

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
      className={`group swipe-row swipe-enter touch-pan-y relative mb-2 flex min-h-16 items-center overflow-hidden rounded-[15px] border border-line bg-white shadow-[0_2px_7px_#263d2d08] ${item.checked ? "done" : ""}`}
    >
      <button
        className="swipe-delete absolute inset-y-0 right-0 w-[84px] rounded-none bg-[#ad5147] text-[.82rem] font-bold text-white"
        type="button"
        aria-label={`Delete ${item.name}`}
        onClick={() => onSwipeDelete(item.id, item.name)}
      >Delete</button>
      <div className={`swipe-content relative z-[1] flex min-h-[62px] w-full items-stretch bg-white p-[10px] transition-transform duration-200 group-data-[swiped=true]:-translate-x-[76px] max-[380px]:p-2 ${item.checked ? "bg-[#f0f5ef]" : ""}`}>
        <div className="item-info flex min-w-0 flex-1 flex-col gap-[7px]">
          <div className="item-title-row flex min-w-0 items-start gap-[9px] max-[380px]:gap-[7px]">
            <input
              className="item-check size-[22px] shrink-0 appearance-none rounded-[7px] border-[1.7px] border-[#b9c7ba] bg-white"
              type="checkbox"
              checked={item.checked}
              aria-label={`Mark ${item.name} as ${item.checked ? "not in cart" : "in cart"}`}
              onChange={(event) => onChecked(item.id, event.currentTarget.checked)}
            />
            <input
              className="select-item size-[22px] shrink-0 appearance-none rounded-[7px] border-[1.7px] border-[#d39a59] bg-white checked:border-[#b87a35] checked:bg-[#b87a35]"
              type="checkbox"
              checked={selected}
              hidden={!selecting}
              aria-label={`Select ${item.name} for deletion`}
              onChange={(event) => onSelected(item.id, event.currentTarget.checked)}
            />
            <span className={`name min-w-0 flex-1 wrap-anywhere pt-[2px] text-[.91rem] font-semibold ${item.checked ? "text-[#89958b] line-through" : ""}`}>{item.name}</span>
          </div>
          <div className="item-details-row flex min-w-0 items-center gap-2 pl-[31px] max-[380px]:gap-[5px] max-[380px]:pl-[29px]">
            <span className="item-subtotal min-w-0 flex-1 text-[.7rem] tabular-nums text-[#7c897e]">Line total · {money.format(lineTotal(item))}</span>
            <div className="quantity-control flex shrink-0 items-center gap-[2px] rounded-[11px] border border-[#dfe6dc] bg-[#f7f9f5] p-[2px]">
              <button
                className="qty-step h-[34px] w-[30px] rounded-lg bg-transparent p-0 text-[1.1rem] font-semibold text-green-dark touch-manipulation max-[380px]:w-[27px]"
                type="button"
                aria-label={`Decrease quantity of ${item.name}`}
                onClick={() => changeQuantity(-1)}
              >−</button>
              <input
                ref={quantityRef}
                className={`${fieldClass} qty !h-[34px] w-[30px] !border-0 !bg-transparent !px-[2px] !shadow-none`}
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                defaultValue={item.qty}
                title="Quantity"
                aria-label={`Quantity of ${item.name}`}
                onInput={(event) => onQty(item.id, Number(event.currentTarget.value) || 0)}
              />
              <button
                className="qty-step h-[34px] w-[30px] rounded-lg bg-transparent p-0 text-[1.1rem] font-semibold text-green-dark touch-manipulation max-[380px]:w-[27px]"
                type="button"
                aria-label={`Increase quantity of ${item.name}`}
                onClick={() => changeQuantity(1)}
              >+</button>
            </div>
            <input
              className={`${fieldClass} price w-[76px] max-[380px]:w-[68px]`}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={item.price || ""}
              placeholder={pricePlaceholder}
              title="Price per unit"
              aria-label={`Price per unit for ${item.name}`}
              onInput={(event) => onPrice(item.id, Number(event.currentTarget.value) || 0)}
            />
            <button
              className="del -ml-[5px] h-[34px] w-8 shrink-0 rounded-lg bg-transparent p-0 text-[1.15rem] text-[#a0aaa1] hover:bg-[#fff0ed] hover:text-[#b34a42]"
              type="button"
              aria-label={`Delete ${item.name}`}
              onClick={() => onQuickDelete(item.id, item.name)}
            >✕</button>
          </div>
        </div>
      </div>
    </li>
  );
}

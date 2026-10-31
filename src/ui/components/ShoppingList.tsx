import { useEffect, useRef, useState } from "react";
import type { Item } from "../../domain/types";
import type { Tab } from "../types";
import { GroceryRow } from "./GroceryRow";

interface ShoppingListProps {
  allItems: Item[];
  visibleItems: Item[];
  activeTab: Tab;
  doneCount: number;
  selectedIds: Set<string>;
  selectionMode: boolean;
  money: Intl.NumberFormat;
  pricePlaceholder: string;
  cartText: string;
  onTabChange(tab: Tab): void;
  onCheckAll(checked: boolean): void;
  onSelectAll(checked: boolean): void;
  onToggleSelection(): void;
  onDeleteSelected(): void;
  onChecked(id: string, checked: boolean): void;
  onSelected(id: string, selected: boolean): void;
  onQty(id: string, qty: number): void;
  onPrice(id: string, price: number): void;
  onQuickDelete(id: string, name: string): void;
  onSwipeDelete(id: string, name: string): void;
  onFinishTrip(): void;
}

export function ShoppingList({ allItems, visibleItems, activeTab, doneCount, selectedIds, selectionMode, money, pricePlaceholder, cartText, onTabChange, onCheckAll, onSelectAll, onToggleSelection, onDeleteSelected, onChecked, onSelected, onQty, onPrice, onQuickDelete, onSwipeDelete, onFinishTrip }: ShoppingListProps) {
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const checkAllRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const neededCount = allItems.filter((item) => !item.checked).length;
  const selectedVisibleCount = visibleItems.filter((item) => selectedIds.has(item.id)).length;
  const progress = allItems.length > 0 ? (doneCount / allItems.length) * 100 : 0;

  useEffect(() => {
    if (checkAllRef.current) checkAllRef.current.indeterminate = doneCount > 0 && doneCount < allItems.length;
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleItems.length;
  }, [allItems.length, doneCount, selectedVisibleCount, visibleItems.length]);

  return (
    <section className="list-section" aria-label="Your list">
      <div className="mb-2 flex items-center gap-3">
        <div className="progress-track h-[5px] flex-1 overflow-hidden rounded-[9px] bg-[var(--color-tabs-surface)]" role="progressbar" aria-label="Shopping progress" aria-valuemin={0} aria-valuemax={allItems.length} aria-valuenow={doneCount}>
          <span className="block h-full rounded-[inherit] bg-[var(--color-focus)] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </div>
        <span id="item-count" className="shrink-0 rounded-[20px] bg-[var(--color-selection-hover)] px-[10px] py-[5px] text-[.73rem] font-bold text-green" aria-label={`${doneCount} of ${allItems.length} items in cart`}>
          {doneCount} / {allItems.length}
        </span>
      </div>
      <div className="sticky top-0 z-10 bg-app pb-2 pt-1">
      <div className={`list-tabs relative isolate flex gap-[6px] rounded-xl bg-[var(--color-tabs-surface)] p-1 ${activeTab === "cart" ? "cart-active" : ""}`} role="tablist" aria-label="Filter grocery items">
        <button id="needed-tab" className="list-tab relative z-[1] min-h-[2.375rem] flex-1 rounded-[9px] bg-transparent px-[10px] py-[7px] text-[.78rem] font-bold text-[var(--color-tabs-muted)]" type="button" role="tab" aria-controls="list" aria-selected={activeTab === "needed"} tabIndex={activeTab === "needed" ? 0 : -1} onClick={() => onTabChange("needed")}>
          Still needed <span className="ml-[3px] inline-block min-w-[18px] rounded-[10px] bg-[var(--color-tabs-surface)] px-[5px] py-[2px] text-center text-[.68rem]">{neededCount}</span>
        </button>
        <button id="cart-tab" className="list-tab relative z-[1] min-h-[2.375rem] flex-1 rounded-[9px] bg-transparent px-[10px] py-[7px] text-[.78rem] font-bold text-[var(--color-tabs-muted)]" type="button" role="tab" aria-controls="list" aria-selected={activeTab === "cart"} tabIndex={activeTab === "cart" ? 0 : -1} onClick={() => onTabChange("cart")}>
          In cart <span className="ml-[3px] inline-block min-w-[18px] rounded-[10px] bg-[var(--color-tabs-surface)] px-[5px] py-[2px] text-center text-[.68rem]">{allItems.length - neededCount}</span>
        </button>
      </div>
      </div>

      <div className="mb-[6px] flex items-center justify-between">
        <label className="inline-flex min-h-9 items-center gap-2 text-[.82rem] font-semibold text-[var(--color-selection-muted)]">
          <input ref={checkAllRef} id="check-all" className="size-[1.125rem] accent-green" type="checkbox" checked={allItems.length > 0 && doneCount === allItems.length} onChange={(event) => onCheckAll(event.currentTarget.checked)} />
          Mark all in cart
        </label>
        <button id="toggle-select" className="min-h-11 rounded-lg bg-transparent px-2 text-[.85rem] font-bold text-green hover:bg-[var(--color-selection-hover)]" type="button" onClick={onToggleSelection}>
          {selectionMode ? "Cancel" : "Select"}
        </button>
      </div>

      <div id="bulk-actions" className="mb-[10px] flex items-center justify-between gap-2 rounded-xl bg-[var(--color-selection-surface)] px-[11px] py-[9px]" hidden={!selectionMode}>
        <label className="flex items-center gap-[7px] text-[.82rem] font-semibold text-[var(--color-selection-ink)]">
          <input ref={selectAllRef} id="select-all" className="size-[1.125rem] accent-green" type="checkbox" checked={visibleItems.length > 0 && selectedVisibleCount === visibleItems.length} onChange={(event) => onSelectAll(event.currentTarget.checked)} />
          Select all to delete
        </label>
        <button id="delete-selected" className="min-h-[2.125rem] rounded-xl bg-[var(--color-danger-fill)] px-[11px] text-[.78rem] font-bold text-white disabled:cursor-default disabled:opacity-45" type="button" disabled={selectedIds.size === 0} onClick={onDeleteSelected}>
          {selectedIds.size ? `Delete selected (${selectedIds.size})` : "Delete selected"}
        </button>
      </div>

      <ul id="list" className="m-0 list-none p-0">
        {visibleItems.map((item) => (
          <GroceryRow
            key={item.id}
            item={item}
            money={money}
            pricePlaceholder={pricePlaceholder}
            selecting={selectionMode}
            selected={selectedIds.has(item.id)}
            swiped={swipedId === item.id}
            onSwipe={(id, open) => setSwipedId((current) => (open ? id : current === id ? null : current))}
            onChecked={onChecked}
            onSelected={onSelected}
            onQty={onQty}
            onPrice={onPrice}
            onQuickDelete={onQuickDelete}
            onSwipeDelete={onSwipeDelete}
          />
        ))}
      </ul>
      <p id="empty-state" className="m-0 rounded-[15px] border border-dashed border-[var(--color-empty-border)] px-4 py-6 text-center text-[.88rem] text-[var(--color-empty-muted)]" hidden={visibleItems.length > 0}>
        {activeTab === "needed" ? "Nothing left to shop for. You’re all set!" : "No items in your cart yet."}
      </p>
      {activeTab === "cart" && (
        <button
            id="finish-trip"
            className="mt-3 block min-h-[2.875rem] w-full rounded-xl bg-green-fill font-bold text-white disabled:cursor-default disabled:opacity-45"
            type="button"
            disabled={doneCount === 0}
            onClick={onFinishTrip}
          >
            Finish trip{doneCount > 0 ? ` · ${cartText}` : ""}
        </button>
      )}
    </section>
  );
}

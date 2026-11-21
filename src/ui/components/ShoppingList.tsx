import { useEffect, useRef, useState } from "react";
import type { Item } from "../../domain/types";
import type { Tab } from "../types";
import { GroceryRow } from "./GroceryRow";
import type { Money } from "../format";

interface ShoppingListProps {
  allItems: Item[];
  visibleItems: Item[];
  activeTab: Tab;
  selectedIds: Set<string>;
  selectionMode: boolean;
  money: Money;
  pricePlaceholder: string;
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
}

export function ShoppingList({ allItems, visibleItems, activeTab, selectedIds, selectionMode, money, pricePlaceholder, onCheckAll, onSelectAll, onToggleSelection, onDeleteSelected, onChecked, onSelected, onQty, onPrice, onQuickDelete, onSwipeDelete }: ShoppingListProps) {
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const checkAllRef = useRef<HTMLInputElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const neededCount = allItems.filter((item) => !item.checked).length;
  const selectedVisibleCount = visibleItems.filter((item) => selectedIds.has(item.id)).length;
  const doneCount = allItems.length - neededCount;

  useEffect(() => {
    if (checkAllRef.current) checkAllRef.current.indeterminate = doneCount > 0 && doneCount < allItems.length;
    if (selectAllRef.current) selectAllRef.current.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleItems.length;
  }, [allItems.length, doneCount, selectedVisibleCount, visibleItems.length]);

  return (
    <section className="list-section" aria-label="Your list">
      <div className="list-toolbar">
        <label className="tap inline-flex items-center gap-2.5 pr-2 text-label font-medium text-muted">
          <input ref={checkAllRef} id="check-all" type="checkbox" checked={allItems.length > 0 && doneCount === allItems.length} onChange={(event) => onCheckAll(event.currentTarget.checked)} />
          Mark all in cart
        </label>
        <button id="toggle-select" className="tap rounded-xl bg-transparent px-3 text-label font-medium text-ink" type="button" onClick={onToggleSelection}>
          {selectionMode ? "Cancel" : "Select"}
        </button>
      </div>

      <div id="bulk-actions" className="bulk-actions" hidden={!selectionMode}>
        <label className="tap inline-flex items-center gap-2.5 text-label font-medium text-ink">
          <input ref={selectAllRef} id="select-all" type="checkbox" checked={visibleItems.length > 0 && selectedVisibleCount === visibleItems.length} onChange={(event) => onSelectAll(event.currentTarget.checked)} />
          Select all to delete
        </label>
        <button id="delete-selected" className="tap rounded-xl bg-[var(--color-danger-fill)] px-4 text-label font-medium text-on-danger disabled:cursor-default disabled:opacity-45" type="button" disabled={selectedIds.size === 0} onClick={onDeleteSelected}>
          {selectedIds.size ? `Delete selected (${selectedIds.size})` : "Delete selected"}
        </button>
      </div>

      <ul id="list" className="item-list">
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
      <p id="empty-state" className="empty-state" hidden={visibleItems.length > 0}>
        {allItems.length === 0 ? "Your list is empty." : activeTab === "needed" ? "Everything is in your cart." : "No items in your cart yet."}
      </p>
    </section>
  );
}

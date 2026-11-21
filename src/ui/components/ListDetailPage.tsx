import type { ShoppingList as ShoppingListRecord } from "../../domain/types";
import type { GroceryList } from "../hooks/useGroceryList";
import { lightTap, successTap } from "../haptics";
import { AddItemForm } from "./AddItemForm";
import { ShoppingList } from "./ShoppingList";
import { SummaryCard } from "./SummaryCard";
import { SearchField } from "./SearchFilters";

interface ListDetailPageProps {
  app: GroceryList;
  list: ShoppingListRecord;
  storeName: string | null;
  onBack(): void;
  onOpenBudget(): void;
  onOpenListActions(): void;
}

export function ListDetailPage({ app, list, storeName, onBack, onOpenBudget, onOpenListActions }: ListDetailPageProps) {
  const neededCount = list.items.filter((item) => !item.checked).length;
  const doneCount = list.items.length - neededCount;
  const progress = list.items.length === 0 ? 0 : doneCount / list.items.length;

  return (
    <div id="list-detail-page" className="page flex flex-col">
      <header className="list-header">
        <div className="flex min-w-0 items-center gap-2">
          <button id="back-to-lists" className="icon-button" type="button" aria-label="Back to lists" onClick={onBack}>
            <svg className="size-[1.125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <div className="min-w-0">
            <h1 id="list-detail-title" className="detail-title">{list.name}</h1>
            <p id="list-detail-store" className="detail-store">{storeName ?? "No store"}{list.archivedAt ? " · Archived" : ""}</p>
          </div>
        </div>
        <button id="open-list-actions" className="icon-button" type="button" aria-label="List options" onClick={onOpenListActions}>
          <svg className="size-[1.125rem]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
        </button>
      </header>

      <main id="screen-scroll" className="detail-page-scroll page-scroll min-h-0 flex-1">
        <SummaryCard
          cartTotal={app.cartText}
          plannedTotal={app.plannedText}
          budget={app.dailyBudget}
          status={app.budgetStatus}
          money={app.money}
          onOpenBudget={onOpenBudget}
        />

        <div className="list-progress">
          <div className="flex items-center justify-between gap-3">
            <span>Shopping progress</span>
            <span id="item-count" className="num font-medium text-ink" aria-label={`${doneCount} of ${list.items.length} items in cart`}>{doneCount} / {list.items.length}</span>
          </div>
          <span className="progress block" role="progressbar" aria-labelledby="progress-label" aria-valuemin={0} aria-valuemax={list.items.length} aria-valuenow={doneCount}>
            <span id="progress-label" className="sr-only">Shopping progress</span>
            <i className="block" style={{ width: `${progress * 100}%` }} />
          </span>
        </div>

        <div className="item-search-row">
          <SearchField id="search-list-items" label="Search items" placeholder="Search items" />
        </div>

        <div className="segments" role="tablist" aria-label="Items by shopping status">
          <button id="needed-tab" className="segment" type="button" role="tab" aria-controls="list" aria-selected={app.activeTab === "needed"} tabIndex={app.activeTab === "needed" ? 0 : -1} onClick={() => app.changeTab("needed")}>
            Still needed <span className="num">{neededCount}</span>
          </button>
          <button id="cart-tab" className="segment" type="button" role="tab" aria-controls="list" aria-selected={app.activeTab === "cart"} tabIndex={app.activeTab === "cart" ? 0 : -1} onClick={() => app.changeTab("cart")}>
            In cart <span className="num">{doneCount}</span>
          </button>
        </div>

        <ShoppingList
          allItems={app.items}
          visibleItems={app.visibleItems}
          activeTab={app.activeTab}
          selectedIds={app.selectedIds}
          selectionMode={app.selectionMode}
          money={app.money}
          pricePlaceholder={app.currencyLabel}
          onCheckAll={app.checkAll}
          onSelectAll={app.selectAllVisible}
          onToggleSelection={app.toggleSelectionMode}
          onDeleteSelected={app.requestDeleteSelected}
          onChecked={(id, checked) => {
            app.setChecked(id, checked);
            if (checked) void lightTap();
          }}
          onSelected={app.changeSelection}
          onQty={app.setQty}
          onPrice={app.setPrice}
          onQuickDelete={app.quickDelete}
          onSwipeDelete={app.requestDeleteOne}
        />
      </main>

      <div className="detail-bottom">
        {app.activeTab === "cart" && (
          <button
            id="finish-trip"
            className="tap finish-trip"
            type="button"
            disabled={app.doneCount === 0}
            onClick={() => {
              app.finishTrip();
              void successTap();
            }}
          >
            Finish trip{app.doneCount > 0 ? ` · ${app.cartText}` : ""}
          </button>
        )}
        <AddItemForm onAdd={app.addItem} />
      </div>
    </div>
  );
}

import { useRef, useState } from "react";
import type { GroceryStorage } from "../storage/storage";
import { AddItemForm } from "./components/AddItemForm";
import { BudgetSheet } from "./components/BudgetSheet";
import { DeleteDialog } from "./components/DeleteDialog";
import { Header } from "./components/Header";
import { NoticeBanner } from "./components/NoticeBanner";
import { SettingsPage } from "./components/SettingsPage";
import { SummaryCard } from "./components/SummaryCard";
import { ShoppingList } from "./components/ShoppingList";
import { UndoBanner } from "./components/UndoBanner";
import { useBackButton } from "./hooks/useBackButton";
import { useGroceryList } from "./hooks/useGroceryList";
import { lightTap, successTap } from "./haptics";
import { parentView, type SettingsView } from "./types";

interface AppProps {
  storage: GroceryStorage;
}

export function App({ storage }: AppProps) {
  const list = useGroceryList(storage);
  const [settingsView, setSettingsView] = useState<SettingsView>("closed");
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [confirmReceiptDelete, setConfirmReceiptDelete] = useState(false);
  const selectedReceipt = list.receipts.find((r) => r.id === receiptId) ?? null;
  const homePageRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  // Android Back, from the most recent thing on screen to the oldest: a sheet or dialog, then a screen in
  // Settings (Receipt > Receipts > Settings > Home), then select mode. Home with nothing open sends the app
  // to the background.
  useBackButton(() => {
    if (budgetOpen) {
      setBudgetOpen(false);
      return true;
    }
    if (confirmReceiptDelete) {
      setConfirmReceiptDelete(false);
      return true;
    }
    if (list.pendingDelete) {
      list.cancelDelete();
      return true;
    }
    if (settingsView !== "closed") {
      setSettingsView(parentView(settingsView));
      return true;
    }
    if (list.selectionMode) {
      list.toggleSelectionMode();
      return true;
    }
    return false;
  });

  function animateHomePageIn() {
    const page = homePageRef.current;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (!page || reduceMotion || typeof page.animate !== "function") return;
    page.animate(
      [
        { opacity: 0, transform: "translateX(-12px)" },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 260, easing: "cubic-bezier(.2,.75,.25,1)" },
    );
  }

  return (
    <>
      <div ref={homePageRef} id="home-page" className="flex h-full min-h-0 flex-col" hidden={settingsView !== "closed"}>
        <main ref={mainRef} className={`-mx-[var(--gutter)] min-h-0 flex-1 scroll-pt-[calc(var(--bar-h)+4rem)] overflow-y-auto [overscroll-behavior-y:contain] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] px-[var(--gutter)] ${list.activeTab === "cart" ? "pb-4" : "pb-[calc(16px+env(safe-area-inset-bottom,0px))]"}`}>
          <Header
            cartTotal={list.cartText}
            overBudget={list.overBudget}
            scrollerRef={mainRef}
            onOpenSettings={() => setSettingsView("settings")}
          />
          <div className="pt-2">
            <SummaryCard
              cartTotal={list.cartText}
              plannedTotal={list.plannedText}
              budget={list.dailyBudget}
              status={list.budgetStatus}
              money={list.money}
              scrollerRef={mainRef}
              onOpenBudget={() => setBudgetOpen(true)}
            />
            <AddItemForm onAdd={list.addItem} />
            <ShoppingList
              allItems={list.items}
              visibleItems={list.visibleItems}
              activeTab={list.activeTab}
              doneCount={list.doneCount}
              selectedIds={list.selectedIds}
              selectionMode={list.selectionMode}
              money={list.money}
              pricePlaceholder={list.currencyLabel}
              onTabChange={list.changeTab}
              onCheckAll={list.checkAll}
              onSelectAll={list.selectAllVisible}
              onToggleSelection={list.toggleSelectionMode}
              onDeleteSelected={list.requestDeleteSelected}
              onChecked={(id, checked) => {
                list.setChecked(id, checked);
                if (checked) void lightTap();
              }}
              onSelected={list.changeSelection}
              onQty={list.setQty}
              onPrice={list.setPrice}
              onQuickDelete={list.quickDelete}
              onSwipeDelete={list.requestDeleteOne}
            />
          </div>
        </main>
        {list.activeTab === "cart" && (
          <footer className="shrink-0 bg-app pb-[max(16px,env(safe-area-inset-bottom,0px))] pt-2">
            <button
              id="finish-trip"
              className="tap num block w-full rounded-xl bg-green-fill px-4 text-body font-semibold text-on-action disabled:cursor-default disabled:opacity-45"
              type="button"
              disabled={list.doneCount === 0}
              onClick={() => {
                list.finishTrip();
                void successTap();
              }}
            >
              Finish trip{list.doneCount > 0 ? ` · ${list.cartText}` : ""}
            </button>
          </footer>
        )}
      </div>

      <SettingsPage
        view={settingsView}
        receipts={list.receipts}
        selectedReceipt={selectedReceipt}
        currency={list.currency}
        onCurrencyChange={list.changeCurrency}
        onOpenCurrency={() => setSettingsView("currency")}
        onOpenAbout={() => setSettingsView("about")}
        onOpenReceipts={() => setSettingsView("receipts")}
        onOpenReceipt={(id) => { setReceiptId(id); setSettingsView("receipt"); }}
        onDeleteReceipt={() => setConfirmReceiptDelete(true)}
        onClose={() => setSettingsView(parentView)}
        onHomeEnter={animateHomePageIn}
      />
      <BudgetSheet
        open={budgetOpen}
        budget={list.dailyBudget}
        symbol={list.currencyLabel}
        money={list.money}
        cartAmount={list.cartAmount}
        onSave={list.saveBudget}
        onClose={() => setBudgetOpen(false)}
      />
      <DeleteDialog
        open={list.pendingDelete !== null}
        message={list.pendingDelete?.prompt ?? ""}
        onCancel={list.cancelDelete}
        onConfirm={list.confirmDelete}
      />
      <DeleteDialog
        open={confirmReceiptDelete}
        idPrefix="receipt-"
        title="Delete this receipt?"
        confirmLabel="Delete receipt"
        message="This receipt will be permanently removed. Your grocery list won’t change."
        onCancel={() => setConfirmReceiptDelete(false)}
        onConfirm={() => {
          if (receiptId) list.deleteReceipt(receiptId);
          setConfirmReceiptDelete(false);
          setReceiptId(null);
          setSettingsView("receipts");
        }}
      />
      <NoticeBanner message={list.notice} onDismiss={list.dismissNotice} />
      <UndoBanner undo={list.undo} onUndo={list.undoDelete} />
    </>
  );
}

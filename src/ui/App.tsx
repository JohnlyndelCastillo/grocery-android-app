import { useRef, useState } from "react";
import type { GroceryStorage } from "../storage/storage";
import { AddItemForm } from "./components/AddItemForm";
import { BudgetRow } from "./components/BudgetRow";
import { BudgetSheet } from "./components/BudgetSheet";
import { DeleteDialog } from "./components/DeleteDialog";
import { Header } from "./components/Header";
import { NoticeBanner } from "./components/NoticeBanner";
import { SettingsPage } from "./components/SettingsPage";
import { ShoppingList } from "./components/ShoppingList";
import { UndoBanner } from "./components/UndoBanner";
import { useGroceryList } from "./hooks/useGroceryList";
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
        <Header
          cartTotal={list.cartText}
          plannedTotal={list.plannedText}
          overBudget={list.overBudget}
          onOpenSettings={() => setSettingsView("settings")}
        />
        <main className="min-h-0 flex-1 overflow-y-auto [overscroll-behavior-y:contain] [scrollbar-width:none] [-webkit-overflow-scrolling:touch] pt-[19px] pb-[calc(22px+env(safe-area-inset-bottom,0px))]">
          <BudgetRow
            budgetText={list.dailyBudget === null ? null : list.money.format(list.dailyBudget)}
            status={list.budgetShortText}
            over={list.overBudget}
            onOpen={() => setBudgetOpen(true)}
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
            cartText={list.cartText}
            onTabChange={list.changeTab}
            onCheckAll={list.checkAll}
            onSelectAll={list.selectAllVisible}
            onToggleSelection={list.toggleSelectionMode}
            onDeleteSelected={list.requestDeleteSelected}
            onChecked={list.setChecked}
            onSelected={list.changeSelection}
            onQty={list.setQty}
            onPrice={list.setPrice}
            onQuickDelete={list.quickDelete}
            onSwipeDelete={list.requestDeleteOne}
            onFinishTrip={list.finishTrip}
          />
        </main>
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

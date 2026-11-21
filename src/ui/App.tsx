import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { GroceryStorage } from "../storage/storage";
import type { ShoppingList, Store } from "../domain/types";
import { BudgetSheet } from "./components/BudgetSheet";
import { BottomNav } from "./components/BottomNav";
import { DeleteDialog } from "./components/DeleteDialog";
import { HistoryPage } from "./components/HistoryPage";
import { HomePage } from "./components/HomePage";
import { ListActionsDialog } from "./components/ListActionsDialog";
import { ListDetailPage } from "./components/ListDetailPage";
import { ListDialog } from "./components/ListDialog";
import { ListsPage } from "./components/ListsPage";
import { NoticeBanner } from "./components/NoticeBanner";
import { ReceiptDetailPage } from "./components/ReceiptDetailPage";
import { RepeatTripDialog } from "./components/RepeatTripDialog";
import { SettingsPage, type SettingsPageView } from "./components/SettingsPage";
import { StoreManagerDialog } from "./components/StoreManagerDialog";
import { UndoBanner } from "./components/UndoBanner";
import { useBackButton } from "./hooks/useBackButton";
import { useGroceryList } from "./hooks/useGroceryList";
import { useHashRoute } from "./hooks/useHashRoute";
import { parentRoute, routeHref, tabForRoute, type AppTab, type Route } from "./routes";

interface AppProps {
  storage: GroceryStorage;
}

type ListDialogState = { mode: "create" } | { mode: "rename"; list: ShoppingList } | null;

export function App({ storage }: AppProps) {
  const { route, navigate } = useHashRoute();
  const routeListId = route.name === "list" ? route.listId : null;
  const app = useGroceryList(storage, routeListId);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [listDialog, setListDialog] = useState<ListDialogState>(null);
  const [actionsList, setActionsList] = useState<ShoppingList | null>(null);
  const [storesOpen, setStoresOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [deleteList, setDeleteList] = useState<ShoppingList | null>(null);
  const [deleteReceiptId, setDeleteReceiptId] = useState<string | null>(null);
  const [settingsView, setSettingsView] = useState<SettingsPageView>("settings");

  const selectedList = routeListId ? app.findList(routeListId) : null;
  const selectedReceipt = route.name === "receipt" ? app.receipts.find((receipt) => receipt.id === route.receiptId) ?? null : null;
  const routeKey = routeHref(route);
  const scrollPositions = useRef(new Map<string, number>());

  // Invalid deep links return to their parent tab with a short notice.
  useEffect(() => {
    if (route.name === "list" && !app.findList(route.listId)) {
      app.showNotice("That list couldn’t be found.");
      navigate({ name: "lists" }, { replace: true });
    } else if (route.name === "receipt" && !app.receipts.some((receipt) => receipt.id === route.receiptId)) {
      app.showNotice("That receipt couldn’t be found.");
      navigate({ name: "history" }, { replace: true });
    }
  }, [route, app.lists, app.receipts]);

  // Opening a list makes it the most recently used one.
  useEffect(() => {
    if (routeListId && app.findList(routeListId) && app.state.activeListId !== routeListId) app.selectList(routeListId);
  }, [routeListId, app.state.activeListId]);

  // Remember where each tab or detail was scrolled.
  useLayoutEffect(() => {
    const scroller = document.getElementById("screen-scroll");
    if (scroller) scroller.scrollTop = scrollPositions.current.get(routeKey) ?? 0;
    return () => {
      if (scroller) scrollPositions.current.set(routeKey, scroller.scrollTop);
    };
  }, [routeKey]);

  // Android Back: sheets and dialogs first, then selection, then a detail's parent, then Home.
  useBackButton(() => {
    if (budgetOpen) { setBudgetOpen(false); return true; }
    if (listDialog) { setListDialog(null); return true; }
    if (actionsList) { setActionsList(null); return true; }
    if (storeToDelete) { setStoreToDelete(null); setStoresOpen(true); return true; }
    if (storesOpen) { setStoresOpen(false); return true; }
    if (repeatOpen) { setRepeatOpen(false); return true; }
    if (deleteList) { setDeleteList(null); return true; }
    if (deleteReceiptId) { setDeleteReceiptId(null); return true; }
    if (app.pendingDelete) { app.cancelDelete(); return true; }
    if (app.selectionMode && route.name === "list") { app.toggleSelectionMode(); return true; }
    if (route.name === "settings" && settingsView !== "settings") { setSettingsView("settings"); return true; }
    const parent = parentRoute(route);
    if (parent) { navigate(parent); return true; }
    if (route.name !== "home") { navigate({ name: "home" }); return true; }
    return false;
  });

  function openList(listId: string) {
    navigate({ name: "list", listId });
  }

  function openTab(tab: AppTab) {
    if (tab === "settings") setSettingsView("settings");
    const target: Route =
      tab === "home" ? { name: "home" } :
      tab === "lists" ? { name: "lists" } :
      tab === "history" ? { name: "history" } :
      { name: "settings" };
    navigate(target);
  }

  function requestStoreDelete(storeId: string) {
    const store = app.stores.find((entry) => entry.id === storeId);
    if (!store) return;
    setStoresOpen(false);
    setStoreToDelete(store);
  }

  function cancelStoreDelete() {
    setStoreToDelete(null);
    setStoresOpen(true);
  }

  function confirmStoreDelete() {
    if (!storeToDelete) return;
    app.deleteStore(storeToDelete.id);
    setStoreToDelete(null);
    setStoresOpen(true);
    app.showNotice("Store removed. Its lists and receipts are kept.");
  }

  function submitListDialog(name: string, storeId: string | null) {
    if (!listDialog) return;
    if (listDialog.mode === "create") {
      const created = app.createList(name, storeId);
      if (created) {
        setListDialog(null);
        navigate({ name: "list", listId: created.id });
      }
      return;
    }
    app.renameList(listDialog.list.id, name);
    setListDialog(null);
  }

  function duplicate(list: ShoppingList) {
    const copy = app.duplicateList(list.id);
    setActionsList(null);
    if (copy) {
      app.showNotice("List duplicated.");
      navigate({ name: "list", listId: copy.id });
    }
  }

  function archive(list: ShoppingList) {
    app.archiveList(list.id);
    setActionsList(null);
    if (route.name === "list" && route.listId === list.id) navigate({ name: "lists" });
    app.showNotice("List archived.");
  }

  function restore(list: ShoppingList) {
    app.restoreList(list.id);
    setActionsList(null);
    app.showNotice("List restored.");
  }

  function confirmDeleteList() {
    if (!deleteList) return;
    const wasOpen = route.name === "list" && route.listId === deleteList.id;
    app.deleteList(deleteList.id);
    setDeleteList(null);
    if (wasOpen) navigate({ name: "lists" });
    app.showNotice("List deleted. Its receipts are unchanged.");
  }

  function pickRepeatReceipt(receiptId: string) {
    const list = app.repeatReceipt(receiptId);
    setRepeatOpen(false);
    if (list) {
      app.showNotice("Trip repeated as a new list.");
      navigate({ name: "list", listId: list.id });
    }
  }

  const screen =
    route.name === "home" ? (
      <HomePage
        app={app}
        onOpenBudget={() => setBudgetOpen(true)}
        onOpenList={openList}
        onOpenHistory={() => navigate({ name: "history" })}
        onOpenReceipt={(receiptId) => navigate({ name: "receipt", receiptId })}
        onNewList={() => setListDialog({ mode: "create" })}
        onRepeatTrip={() => setRepeatOpen(true)}
      />
    ) : route.name === "lists" ? (
      <ListsPage
        app={app}
        onOpenList={openList}
        onNewList={() => setListDialog({ mode: "create" })}
        onManageStores={() => setStoresOpen(true)}
        onOpenListActions={setActionsList}
      />
    ) : route.name === "list" ? (
      selectedList ? (
        <ListDetailPage
          app={app}
          list={selectedList}
          storeName={app.stores.find((store) => store.id === selectedList.storeId)?.name ?? null}
          onBack={() => navigate({ name: "lists" })}
          onOpenBudget={() => setBudgetOpen(true)}
          onOpenListActions={() => setActionsList(selectedList)}
        />
      ) : null
    ) : route.name === "history" ? (
      <HistoryPage app={app} onOpenReceipt={(receiptId) => navigate({ name: "receipt", receiptId })} onStartList={() => navigate({ name: "lists" })} />
    ) : route.name === "receipt" ? (
      selectedReceipt ? (
        <ReceiptDetailPage receipt={selectedReceipt} onBack={() => navigate({ name: "history" })} onDelete={() => setDeleteReceiptId(selectedReceipt.id)} />
      ) : null
    ) : (
      <SettingsPage
        currency={app.currency}
        view={settingsView}
        onCurrencyChange={app.changeCurrency}
        onViewChange={setSettingsView}
      />
    );

  return (
    <>
      <div className="app-shell">
        <div key={routeKey} className="screen-transition min-h-0 flex-1">{screen}</div>
        <BottomNav active={tabForRoute(route)} onNavigate={openTab} />
      </div>

      <BudgetSheet
        open={budgetOpen}
        budget={app.dailyBudget}
        symbol={app.currencyLabel}
        money={app.money}
        spentAmount={app.spentToday.amount}
        onSave={app.saveBudget}
        onClose={() => setBudgetOpen(false)}
      />

      <ListDialog
        open={listDialog !== null}
        title={listDialog?.mode === "rename" ? "Rename list" : "New list"}
        initialName={listDialog?.mode === "rename" ? listDialog.list.name : ""}
        stores={app.stores}
        initialStoreId={listDialog?.mode === "rename" ? listDialog.list.storeId : null}
        submitLabel={listDialog?.mode === "rename" ? "Save" : "Create list"}
        showStore={listDialog?.mode !== "rename"}
        onCancel={() => setListDialog(null)}
        onSubmit={submitListDialog}
      />

      <ListActionsDialog
        open={actionsList !== null}
        list={actionsList}
        onClose={() => setActionsList(null)}
        onRename={() => {
          if (!actionsList) return;
          setListDialog({ mode: "rename", list: actionsList });
          setActionsList(null);
        }}
        onDuplicate={() => { if (actionsList) duplicate(actionsList); }}
        onArchive={() => { if (actionsList) archive(actionsList); }}
        onRestore={() => { if (actionsList) restore(actionsList); }}
        onDelete={() => {
          if (!actionsList) return;
          setDeleteList(actionsList);
          setActionsList(null);
        }}
      />

      <StoreManagerDialog
        open={storesOpen}
        stores={app.stores}
        onClose={() => setStoresOpen(false)}
        onAdd={(name, color) => {
          if (!app.createStore(name, color)) app.showNotice("That store name is already used.");
        }}
        onRename={app.renameStore}
        onRecolor={app.recolorStore}
        onDelete={requestStoreDelete}
      />

      <RepeatTripDialog open={repeatOpen} receipts={app.receipts} onClose={() => setRepeatOpen(false)} onPick={pickRepeatReceipt} />

      <DeleteDialog
        open={app.pendingDelete !== null}
        message={app.pendingDelete?.prompt ?? ""}
        onCancel={app.cancelDelete}
        onConfirm={app.confirmDelete}
      />
      <DeleteDialog
        open={deleteReceiptId !== null}
        idPrefix="receipt-"
        title="Delete this receipt?"
        confirmLabel="Delete receipt"
        message="This receipt will be permanently removed. Your grocery list won’t change."
        onCancel={() => setDeleteReceiptId(null)}
        onConfirm={() => {
          if (deleteReceiptId) app.deleteReceipt(deleteReceiptId);
          setDeleteReceiptId(null);
          navigate({ name: "history" });
        }}
      />
      <DeleteDialog
        open={deleteList !== null}
        idPrefix="list-"
        title="Delete this list?"
        confirmLabel="Delete list"
        message={deleteList ? `This will permanently remove “${deleteList.name}” and its ${deleteList.items.length} ${deleteList.items.length === 1 ? "item" : "items"}. Its receipts stay in History.` : ""}
        onCancel={() => setDeleteList(null)}
        onConfirm={confirmDeleteList}
      />
      <DeleteDialog
        open={storeToDelete !== null}
        idPrefix="store-"
        title="Delete this store?"
        confirmLabel="Delete store"
        message={storeToDelete ? (() => {
          const affected = app.lists.filter((list) => list.storeId === storeToDelete.id).length;
          return affected === 0
            ? `“${storeToDelete.name}” isn’t assigned to any lists. Receipts will be kept.`
            : `${affected} ${affected === 1 ? "list will" : "lists will"} move to No store. Receipts will be kept.`;
        })() : ""}
        onCancel={cancelStoreDelete}
        onConfirm={confirmStoreDelete}
      />

      <NoticeBanner
        message={app.storageIssue ?? app.notice}
        onDismiss={app.storageIssue ? app.dismissStorageIssue : app.dismissNotice}
      />
      <UndoBanner undo={app.undo} onUndo={app.undoDelete} />
    </>
  );
}

// Every element app.ts needs, looked up once and typed.
// If template.ts renames an id, this is the only place to fix.
export function getElements(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => root.querySelector<T>(sel)!;
  return {
    // header + totals
    hero: $(".hero"),
    heroTitle: $("#hero-title"),
    collapseHeaderBtn: $<HTMLButtonElement>("#collapse-header"),
    cartCard: $("#cart-card"),
    cartTotal: $("#cart-total"),
    plannedTotal: $("#planned-total"),
    // budget + currency
    budgetForm: $<HTMLFormElement>("#budget-form"),
    budgetInput: $<HTMLInputElement>("#budget-input"),
    budgetStatus: $("#budget-status"),
    budgetCurrency: $("#budget-currency"),
    currencySelect: $<HTMLSelectElement>("#currency-select"),
    // add item
    addForm: $<HTMLFormElement>("#add-form"),
    nameInput: $<HTMLInputElement>("#new-name"),
    // list header
    itemCount: $("#item-count"),
    progressTrack: $(".progress-track"),
    progressFill: $("#progress-fill"),
    checkAll: $<HTMLInputElement>("#check-all"),
    uncheckBtn: $<HTMLButtonElement>("#uncheck"),
    // tabs
    listTabs: $(".list-tabs"),
    neededTab: $<HTMLButtonElement>("#needed-tab"),
    cartTab: $<HTMLButtonElement>("#cart-tab"),
    neededCount: $("#needed-count"),
    cartCount: $("#cart-count"),
    // list
    list: $<HTMLUListElement>("#list"),
    emptyState: $("#empty-state"),
    // bulk select
    toggleSelectBtn: $<HTMLButtonElement>("#toggle-select"),
    bulkActions: $<HTMLDivElement>("#bulk-actions"),
    selectAll: $<HTMLInputElement>("#select-all"),
    deleteSelectedBtn: $<HTMLButtonElement>("#delete-selected"),
    // delete dialog + undo
    deleteDialog: $<HTMLDialogElement>("#confirm-delete-dialog"),
    deleteConfirmMessage: $("#delete-confirm-message"),
    cancelDeleteBtn: $<HTMLButtonElement>("#cancel-delete"),
    confirmDeleteBtn: $<HTMLButtonElement>("#confirm-delete"),
    undoBanner: $<HTMLDivElement>("#undo-banner"),
    undoMessage: $("#undo-message"),
    undoDeleteBtn: $<HTMLButtonElement>("#undo-delete"),
  };
}

export type Elements = ReturnType<typeof getElements>;

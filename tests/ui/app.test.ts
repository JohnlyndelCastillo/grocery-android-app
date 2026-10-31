import { act } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item, Receipt } from "../../src/domain/types";
import type { GroceryStorage } from "../../src/storage/storage";
import { version } from "../../package.json";
import { mountApp } from "../helpers/mountApp";

// jsdom has no <dialog>.showModal(), so give it a tiny stand-in.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

const rice: Item = { id: "1", name: "Rice", qty: 2, price: 50, checked: false };
const eggs: Item = { id: "2", name: "Eggs", qty: 1, price: 30, checked: false };
let unmount = () => {};

afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
});

function setup(items: Item[] = [], budget: number | null = null, receipts: Receipt[] = []) {
  const storage: GroceryStorage = {
    loadItems: () => items,
    saveItems: vi.fn(),
    loadDailyBudget: () => budget,
    loadReceipts: () => receipts,
    saveReceipts: vi.fn(),
    saveDailyBudget: vi.fn(),
  };
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, storage); });
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const click = <T extends HTMLElement>(sel: string) => act(() => q<T>(sel).click());
  const submit = (sel: string) => act(() => q(sel).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  return { root, storage, q, click, submit };
}

describe("grocery app", () => {
  beforeEach(() => localStorage.clear());

  it("shows the empty state, then adds an item and saves it", () => {
    const { q, submit, storage } = setup();
    expect(q<HTMLElement>("#empty-state").hidden).toBe(false);

    q<HTMLInputElement>("#new-name").value = "Soap";
    submit("#add-form");

    expect(q<HTMLElement>("#empty-state").hidden).toBe(true);
    expect(q("#list").textContent).toContain("Soap");
    expect(storage.saveItems).toHaveBeenCalled();
  });

  it("moves the cart total when an item is checked", () => {
    const { q, click } = setup([rice, eggs]);
    expect(q("#cart-card strong").textContent).toContain("0.00");
    click<HTMLInputElement>("li input[type=checkbox]:not(.select-item)");
    expect(q("#cart-card strong").textContent).toContain("100.00");
    expect(q(".totals .total-card:nth-child(2) strong").textContent).toContain("130.00");
    expect(q("#cart-tab").textContent).toContain("In cart 1");
  });

  it("shows the progress bar and count pill, and updates them as items are checked", () => {
    const { q, click } = setup([rice, eggs]);
    const bar = () => q<HTMLElement>("[role=progressbar]");
    expect(q("#item-count").textContent).toBe("0 / 2");
    expect(bar().getAttribute("aria-valuenow")).toBe("0");
    expect(bar().getAttribute("aria-valuemax")).toBe("2");
    expect(bar().firstElementChild!.getAttribute("style")).toContain("width: 0%");

    click<HTMLInputElement>("li input[type=checkbox]:not(.select-item)");
    expect(q("#item-count").textContent).toBe("1 / 2");
    expect(q("#item-count").getAttribute("aria-label")).toBe("1 of 2 items in cart");
    expect(bar().getAttribute("aria-valuenow")).toBe("1");
    expect(bar().firstElementChild!.getAttribute("style")).toContain("width: 50%");

    click<HTMLInputElement>("#check-all");
    expect(q("#item-count").textContent).toBe("2 / 2");
    expect(bar().firstElementChild!.getAttribute("style")).toContain("width: 100%");
  });

  it("keeps the progress bar and count pill on both tabs and with an empty list", () => {
    const { q, click } = setup([{ ...rice, checked: true }, eggs]);
    click<HTMLButtonElement>("#cart-tab");
    expect(q("#item-count").textContent).toBe("1 / 2");
    click<HTMLButtonElement>("#needed-tab");
    expect(q("#item-count").textContent).toBe("1 / 2");

    const empty = setup();
    expect(empty.q("#item-count").textContent).toBe("0 / 0");
    expect(empty.q("[role=progressbar]").firstElementChild!.getAttribute("style")).toContain("width: 0%");
  });

  it("filters items into Still needed and In cart tabs as their checked state changes", () => {
    const { q, click } = setup([rice, eggs]);
    expect(q("#needed-tab").textContent).toContain("Still needed 2");
    expect(q("#cart-tab").textContent).toContain("In cart 0");
    expect(q("#list").textContent).toContain("Rice");

    click<HTMLInputElement>('li input[type="checkbox"]:not(.select-item)');
    expect(q("#list").textContent).not.toContain("Rice");
    expect(q("#needed-tab").textContent).toContain("Still needed 1");
    expect(q("#cart-tab").textContent).toContain("In cart 1");

    click<HTMLButtonElement>("#cart-tab");
    expect(q("#list").textContent).toContain("Rice");
    click<HTMLInputElement>('li input[type="checkbox"]:not(.select-item)');
    expect(q("#needed-tab").getAttribute("aria-selected")).toBe("false");
    click<HTMLButtonElement>("#needed-tab");
    expect(q("#list").textContent).toContain("Rice");
  });

  it("shows a tab-specific empty state after marking every item in cart", () => {
    const { q, click } = setup([rice, eggs]);
    click<HTMLInputElement>("#check-all");
    expect(q("#needed-tab").textContent).toContain("Still needed 0");
    expect(q<HTMLElement>("#empty-state").hidden).toBe(false);
    expect(q("#empty-state").textContent).toContain("Nothing left to shop for");
    click<HTMLButtonElement>("#cart-tab");
    expect(q("#list").textContent).toContain("Rice");
    expect(q("#list").textContent).toContain("Eggs");
  });

  it("flags the cart card when over budget", () => {
    const { q } = setup([{ ...rice, checked: true }], 80);
    expect(q("#cart-card").getAttribute("aria-label")).toContain("over today's budget");
    expect(q("#budget-status").textContent).toContain("over");
  });

  it("saves a new budget from the form", () => {
    const { q, submit, storage } = setup();
    q<HTMLInputElement>("#budget-input").value = "500";
    submit("#budget-form");
    expect(storage.saveDailyBudget).toHaveBeenCalledWith(500);
    expect(q("#budget-status").textContent).toContain("500.00 left");
  });

  it("deletes selected items after confirming", () => {
    const { q, click } = setup([rice, eggs]);
    click<HTMLButtonElement>("#toggle-select");
    click<HTMLInputElement>(".select-item");
    click<HTMLButtonElement>("#delete-selected");
    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(true);
    click<HTMLButtonElement>("#confirm-delete");
    expect(q("#list").textContent).not.toContain("Rice");
    expect(q("#list").textContent).toContain("Eggs");
  });

  it("selects all for bulk deletion only in the active tab", () => {
    const { q, click } = setup([{ ...rice, checked: true }, eggs]);
    click<HTMLButtonElement>("#toggle-select");
    click<HTMLInputElement>("#select-all");
    expect(q<HTMLInputElement>('.select-item[aria-label="Select Eggs for deletion"]').checked).toBe(true);
    click<HTMLButtonElement>("#cart-tab");
    expect(q<HTMLInputElement>("#select-all").checked).toBe(false);
    click<HTMLInputElement>("#select-all");
    click<HTMLButtonElement>("#delete-selected");
    click<HTMLButtonElement>("#confirm-delete");
    click<HTMLButtonElement>("#needed-tab");
    expect(q("#list").textContent).toContain("Eggs");
    click<HTMLButtonElement>("#cart-tab");
    expect(q("#list").textContent).not.toContain("Rice");
  });

  it("shows just the title, settings button and spending totals in the header", () => {
    const { q } = setup([rice]);
    expect(q("header h1").textContent).toBe("Grocery list");
    expect(q("#open-settings")).not.toBeNull();
    expect(q("#collapse-header")).toBeNull();
    expect(q("#cart-card strong").textContent).toContain("0.00");
    expect(q(".totals .total-card:nth-child(2) strong").textContent).toContain("100.00");
  });

  it("has no pinned 'Start a new trip' footer, and 'Mark all in cart' resets the list", () => {
    const { q, click } = setup([{ ...rice, checked: true }, { ...eggs, checked: true }]);
    expect(q("footer")).toBeNull();
    expect(q("#uncheck")).toBeNull();
    click<HTMLInputElement>("#check-all"); // all are checked, so this unchecks everything
    expect(q("#needed-tab").textContent).toContain("Still needed 2");
    expect(q("#cart-tab").textContent).toContain("In cart 0");
  });

  it("opens the settings list, shows the app version on About, and returns", () => {
    const { q, click } = setup();
    click<HTMLButtonElement>("#open-settings");
    expect(q<HTMLElement>("#home-page").hidden).toBe(true);
    expect(q<HTMLElement>("#settings-page").hidden).toBe(false);
    expect(q<HTMLElement>("#settings-home").textContent).toContain("About");
    expect(q("#settings-home a")).toBeNull();
    click<HTMLButtonElement>("#open-about");
    expect(q("#settings-title").textContent).toBe("About");
    expect(q("#about-page").textContent).toContain(`v${version}`);
    expect(q<HTMLButtonElement>("#close-settings").textContent).toContain("Settings");
    expect(q<HTMLAnchorElement>("#about-page a").href).toBe(`https://github.com/JohnlyndelCastillo/grocery-android-app/releases#release-v${version}`);
    click<HTMLButtonElement>("#close-settings");
    expect(q<HTMLElement>("#settings-home").hidden).toBe(false);
    expect(q("#settings-title").textContent).toBe("Settings");
    click<HTMLButtonElement>("#close-settings");
    expect(q<HTMLElement>("#home-page").hidden).toBe(false);
  });

  it("increments and decrements quantity without going below zero", () => {
    const { q, click, storage } = setup([eggs]);
    const qty = q<HTMLInputElement>(".qty");

    click<HTMLButtonElement>('[aria-label="Increase quantity of Eggs"]');
    expect(qty.value).toBe("2");
    expect(q(".item-subtotal").textContent).toContain("60.00");

    click<HTMLButtonElement>('[aria-label="Decrease quantity of Eggs"]');
    click<HTMLButtonElement>('[aria-label="Decrease quantity of Eggs"]');
    expect(qty.value).toBe("0");
    expect(q(".item-subtotal").textContent).toContain("0.00");
    expect(storage.saveItems).toHaveBeenLastCalledWith([{ ...eggs, qty: 0 }]);
  });

  it("keeps typed quantity edits and shows the item name in the title row", () => {
    const longNameItem = { ...eggs, name: "A very long grocery item name" };
    const { q, storage } = setup([longNameItem]);
    const qty = q<HTMLInputElement>(".qty");
    act(() => {
      qty.value = "3";
      qty.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(q(".item-title-row .name").textContent).toBe(longNameItem.name);
    expect(q(".item-details-row .item-subtotal").textContent).toContain("90.00");
    expect(storage.saveItems).toHaveBeenLastCalledWith([{ ...longNameItem, qty: 3 }]);
  });

  it("reveals and confirms single-item deletion from the swipe action", () => {
    const { q, click, storage } = setup([rice, eggs]);
    const swipeDelete = q<HTMLButtonElement>('[aria-label="Delete Rice"]');
    act(() => swipeDelete.click());

    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(true);
    expect(q("#delete-confirm-message").textContent).toContain("Rice");
    click<HTMLButtonElement>("#confirm-delete");

    expect(q("#list").textContent).not.toContain("Rice");
    expect(q("#list").textContent).toContain("Eggs");
    expect(storage.saveItems).toHaveBeenLastCalledWith([eggs]);
  });

  it("deletes immediately when the per-item x button is clicked", () => {
    const { q, click, storage } = setup([rice, eggs]);
    click<HTMLButtonElement>('.del[aria-label="Delete Rice"]');

    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(false);
    expect(q("#list").textContent).not.toContain("Rice");
    expect(q("#list").textContent).toContain("Eggs");
    expect(storage.saveItems).toHaveBeenLastCalledWith([eggs]);
    expect(q<HTMLElement>("#undo-banner").hidden).toBe(false);
    click<HTMLButtonElement>("#undo-delete");
    expect(q("#list").textContent).toContain("Rice");
    expect(q<HTMLElement>("#undo-banner").hidden).toBe(true);
  });

  it("finishes a trip from the In cart tab, then shows the receipt in Settings", () => {
    const { q, click, storage } = setup([{ ...rice, checked: true }, eggs], 150);
    expect(document.querySelector("#finish-trip")).toBeNull(); // only rendered on the In cart tab
    click<HTMLButtonElement>("#cart-tab");
    expect(q<HTMLElement>("#finish-trip").hidden).toBe(false);
    expect(q("#finish-trip").textContent).toContain("100.00");

    click<HTMLButtonElement>("#finish-trip");
    expect(storage.saveReceipts).toHaveBeenCalledTimes(1);
    expect(q("#cart-card strong").textContent).toContain("0.00");
    expect(q<HTMLElement>("#notice-banner").hidden).toBe(false);
    expect(q("#needed-tab").getAttribute("aria-selected")).toBe("true");

    click<HTMLButtonElement>("#open-settings");
    expect(q("#receipts-count").textContent).toBe("1");
    click<HTMLButtonElement>("#open-receipts");
    expect(q("#settings-title").textContent).toBe("Receipts");
    expect(q("#receipts-list").textContent).toContain("1 item");
    expect(q("#receipts-list").textContent).toContain("100.00");

    click<HTMLButtonElement>("#receipts-list button");
    expect(q("#settings-title").textContent).toBe("Receipt");
    expect(q("#receipt-detail").textContent).toContain("Rice");
    expect(q("#receipt-detail").textContent).toContain("2 × ");
    expect(q("#receipt-detail").textContent).not.toContain("Eggs");
    expect(q("#receipt-total").textContent).toContain("100.00");
    expect(q("#receipt-budget").textContent).toContain("50.00 left");

    click<HTMLButtonElement>("#close-settings"); // back to the receipts list
    expect(q("#settings-title").textContent).toBe("Receipts");
    click<HTMLButtonElement>("#close-settings"); // back to Settings
    expect(q("#settings-title").textContent).toBe("Settings");
    click<HTMLButtonElement>("#close-settings"); // back to the list
    expect(q<HTMLElement>("#home-page").hidden).toBe(false);
  });

  it("disables Finish trip while the cart is empty", () => {
    const { q, click } = setup([rice]);
    click<HTMLButtonElement>("#cart-tab");
    expect(q<HTMLButtonElement>("#finish-trip").disabled).toBe(true);
  });

  it("shows an empty state when there are no receipts", () => {
    const { q, click } = setup();
    click<HTMLButtonElement>("#open-settings");
    expect(q("#receipts-count")).toBeNull();
    click<HTMLButtonElement>("#open-receipts");
    expect(q("#receipts-empty").textContent).toContain("Finish trip");
  });

  it("deletes a receipt only after confirming", () => {
    const saved: Receipt = { id: "r1", finishedAt: "2026-10-30T08:00:00.000Z", currency: "PHP", lines: [{ name: "Rice", qty: 2, price: 50 }], total: 100, budget: null };
    const { q, click, storage } = setup([], null, [saved]);
    click<HTMLButtonElement>("#open-settings");
    click<HTMLButtonElement>("#open-receipts");
    click<HTMLButtonElement>("#receipts-list button");
    expect(q("#receipt-budget")).toBeNull(); // no budget was set that day

    click<HTMLButtonElement>("#delete-receipt");
    expect(q<HTMLDialogElement>("#receipt-confirm-delete-dialog").open).toBe(true);
    click<HTMLButtonElement>("#receipt-cancel-delete");
    expect(q("#receipt-detail")).not.toBeNull();
    expect(storage.saveReceipts).not.toHaveBeenCalled();

    click<HTMLButtonElement>("#delete-receipt");
    click<HTMLButtonElement>("#receipt-confirm-delete");
    expect(storage.saveReceipts).toHaveBeenLastCalledWith([]);
    expect(q("#settings-title").textContent).toBe("Receipts");
    expect(q("#receipts-empty")).not.toBeNull();
  });

  it("edits the budget in a bottom sheet opened from the budget row, and can clear it", () => {
    const { q, click, submit, storage } = setup([{ ...rice, checked: true }], 500);
    expect(q("#budget-row").textContent).toContain("500.00");
    expect(q("#budget-status").textContent).toContain("400.00 left");
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(false);

    click<HTMLButtonElement>("#budget-row");
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(true);
    expect(q<HTMLInputElement>("#budget-input").value).toBe("500");
    q<HTMLInputElement>("#budget-input").value = "300";
    submit("#budget-form");
    expect(storage.saveDailyBudget).toHaveBeenLastCalledWith(300);
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(false);
    expect(q("#budget-status").textContent).toContain("200.00 left");

    click<HTMLButtonElement>("#budget-row");
    expect(q<HTMLInputElement>("#budget-input").value).toBe("300"); // reopened with the saved value
    click<HTMLButtonElement>("#clear-budget");
    expect(storage.saveDailyBudget).toHaveBeenLastCalledWith(null);
    expect(q("#budget-row").textContent).toContain("Set a daily budget");
    expect(q("#clear-budget")).toBeNull();
  });

  it("keeps the budget sheet open on an invalid amount and closes it with Esc without saving", () => {
    const { q, click, submit, storage } = setup([], 100);
    click<HTMLButtonElement>("#budget-row");
    q<HTMLInputElement>("#budget-input").value = "-5";
    submit("#budget-form");
    expect(storage.saveDailyBudget).not.toHaveBeenCalled();
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(true);
    expect(q("#budget-preview").textContent).toContain("valid amount");

    act(() => { q("#budget-sheet").dispatchEvent(new Event("cancel", { cancelable: true })); });
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(false);
    expect(storage.saveDailyBudget).not.toHaveBeenCalled();
  });

  it("previews the remaining budget while typing in the sheet", () => {
    const { q, click } = setup([{ ...rice, checked: true }], 500);
    click<HTMLButtonElement>("#budget-row");
    const input = q<HTMLInputElement>("#budget-input");
    act(() => {
      input.value = "80";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(q("#budget-preview").textContent).toContain("20.00 over");
  });

  it("turns the budget row orange when over budget", () => {
    const { q } = setup([{ ...rice, checked: true }], 80);
    expect(q("#budget-row").className).toContain("bg-[var(--color-budget-surface)]");
    expect(q("#budget-row").className).toContain("border-[var(--color-budget-border)]");
    expect(q("#budget-row").className).toContain("text-[var(--color-budget-ink)]");
    expect(q("#budget-status").textContent).toContain("20.00 over");
  });
});

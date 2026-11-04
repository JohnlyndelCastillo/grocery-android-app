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
    expect(q("#cart-card strong").textContent).toBe("PHP\u00a00");
    click<HTMLInputElement>("li input[type=checkbox]:not(.select-item)");
    expect(q("#cart-card strong").textContent).toBe("PHP\u00a0100");
    expect(q(".totals .total-card:nth-child(2) strong").textContent).toBe("PHP\u00a0130");
    expect(q("#cart-tab").textContent).toContain("In cart 1");
  });

  it("shows the progress label, count and bar, and updates them as items are checked", () => {
    const { q, click } = setup([rice, eggs]);
    const bar = () => q<HTMLElement>("[role=progressbar]");
    expect(q("#item-count").textContent).toBe("0 / 2");
    expect(bar().getAttribute("aria-valuenow")).toBe("0");
    expect(bar().getAttribute("aria-valuemax")).toBe("2");
    expect(bar().firstElementChild!.getAttribute("style")).toContain("scaleX(0)");

    click<HTMLInputElement>("li input[type=checkbox]:not(.select-item)");
    expect(q("#item-count").textContent).toBe("1 / 2");
    expect(q("#item-count").getAttribute("aria-label")).toBe("1 of 2 items in cart");
    expect(bar().getAttribute("aria-valuenow")).toBe("1");
    expect(bar().firstElementChild!.getAttribute("style")).toContain("scaleX(0.5)");

    click<HTMLInputElement>("#check-all");
    expect(q("#item-count").textContent).toBe("2 / 2");
    expect(bar().firstElementChild!.getAttribute("style")).toContain("scaleX(1)");
  });

  it("keeps the progress count and bar on both tabs and with an empty list", () => {
    const { q, click } = setup([{ ...rice, checked: true }, eggs]);
    click<HTMLButtonElement>("#cart-tab");
    expect(q("#item-count").textContent).toBe("1 / 2");
    click<HTMLButtonElement>("#needed-tab");
    expect(q("#item-count").textContent).toBe("1 / 2");

    const empty = setup();
    expect(empty.q("#item-count").textContent).toBe("0 / 0");
    expect(empty.q("[role=progressbar]").firstElementChild!.getAttribute("style")).toContain("scaleX(0)");
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
    expect(q("#empty-state").textContent).toBe("Everything is in your cart.");
    click<HTMLButtonElement>("#cart-tab");
    expect(q("#list").textContent).toContain("Rice");
    expect(q("#list").textContent).toContain("Eggs");
  });

  it("flags the cart card when over budget", () => {
    const { q } = setup([{ ...rice, checked: true }], 80);
    expect(q("#cart-card").getAttribute("aria-label")).toContain("over today's budget");
    expect(q("#budget-status").textContent).toContain("Over by");
  });

  it("saves a new budget from the form", () => {
    const { q, submit, storage } = setup();
    q<HTMLInputElement>("#budget-input").value = "500";
    submit("#budget-form");
    expect(storage.saveDailyBudget).toHaveBeenCalledWith(500);
    expect(q("#budget-status").textContent).toContain("Remaining");
    expect(q("#budget-status").textContent).toContain("PHP\u00a0500");
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

  it("shows the title, the settings button and the spending totals", () => {
    const { q } = setup([rice]);
    expect(q("header h1").textContent).toBe("Shopping list");
    expect(q("#open-settings")).not.toBeNull();
    expect(q("#collapse-header")).toBeNull();
    expect(q("#cart-card strong").textContent).toBe("PHP\u00a00");
    expect(q(".totals .total-card:nth-child(2) strong").textContent).toBe("PHP\u00a0100");
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
    expect(q(".item-subtotal").textContent).toContain("PHP\u00a060");

    click<HTMLButtonElement>('[aria-label="Decrease quantity of Eggs"]');
    click<HTMLButtonElement>('[aria-label="Decrease quantity of Eggs"]');
    expect(qty.value).toBe("0");
    expect(q(".item-subtotal").textContent).toContain("PHP\u00a00");
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
    expect(q(".item-title-row .item-subtotal").textContent).toContain("PHP\u00a090");
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
    expect(q("#finish-trip").textContent).toContain("PHP\u00a0100");

    click<HTMLButtonElement>("#finish-trip");
    expect(storage.saveReceipts).toHaveBeenCalledTimes(1);
    expect(q("#cart-card strong").textContent).toBe("PHP\u00a00");
    expect(q<HTMLElement>("#notice-banner").hidden).toBe(false);
    expect(q("#needed-tab").getAttribute("aria-selected")).toBe("true");

    click<HTMLButtonElement>("#open-settings");
    expect(q("#receipts-count").textContent).toBe("1");
    click<HTMLButtonElement>("#open-receipts");
    expect(q("#settings-title").textContent).toBe("Receipts");
    expect(q("#receipts-list").textContent).toContain("1 item");
    expect(q("#receipts-list").textContent).toContain("PHP\u00a0100");

    click<HTMLButtonElement>("#receipts-list button");
    expect(q("#settings-title").textContent).toBe("Receipt");
    expect(q("#receipt-detail").textContent).toContain("Rice");
    expect(q("#receipt-detail").textContent).toContain("2 × ");
    expect(q("#receipt-detail").textContent).not.toContain("Eggs");
    expect(q("#receipt-total").textContent).toContain("PHP\u00a0100");
    expect(q("#receipt-budget").textContent).toContain("PHP\u00a050 left");

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
    expect(q("#budget-row").textContent).toContain("PHP\u00a0500");
    expect(q("#budget-status").textContent).toContain("Remaining");
    expect(q("#budget-status").textContent).toContain("PHP\u00a0400");
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(false);

    click<HTMLButtonElement>("#budget-row");
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(true);
    expect(q<HTMLInputElement>("#budget-input").value).toBe("500");
    q<HTMLInputElement>("#budget-input").value = "300";
    submit("#budget-form");
    expect(storage.saveDailyBudget).toHaveBeenLastCalledWith(300);
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(false);
    expect(q("#budget-status").textContent).toContain("PHP\u00a0200");

    click<HTMLButtonElement>("#budget-row");
    expect(q<HTMLInputElement>("#budget-input").value).toBe("300"); // reopened with the saved value
    click<HTMLButtonElement>("#clear-budget");
    expect(storage.saveDailyBudget).toHaveBeenLastCalledWith(null);
    expect(q("#budget-row").textContent).toContain("Not set");
    expect(q("#budget-status").textContent).toBe("Set budget");
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
    expect(q("#budget-preview").textContent).toBe("Over byPHP\u00a020");
  });

  it("shows the summary card: cart, planned, today's budget and what is left", () => {
    const { q } = setup([{ ...rice, checked: true }, eggs], 500);
    const card = q("section[aria-label='Spending summary']");
    expect(card.contains(q("#cart-card"))).toBe(true);
    expect(card.contains(q("#budget-row"))).toBe(true);
    expect(q("#cart-card").textContent).toContain("In your cart");
    expect(q("#cart-card strong").textContent).toBe("PHP\u00a0100");
    expect(q(".totals .total-card:nth-child(2)").textContent).toContain("Planned total");
    expect(q(".totals .total-card:nth-child(2) strong").textContent).toBe("PHP\u00a0130");
    expect(q("#budget-row").textContent).toContain("Today’s budget");
    expect(q("#budget-row").textContent).toContain("PHP\u00a0500");
    expect(q("#budget-status").textContent).toBe("RemainingPHP\u00a0400");
  });

  it("labels the budget by state: Over by, exactly on budget, and not set", () => {
    const over = setup([{ ...rice, checked: true }], 80);
    expect(over.q("#budget-status").textContent).toBe("Over byPHP\u00a020");
    expect(over.q("#budget-status span:last-child").className).toContain("--color-danger"); // destructive text, not orange

    const exact = setup([{ ...rice, checked: true }], 100);
    expect(exact.q("#budget-status").textContent).toBe("RemainingPHP\u00a00");

    const none = setup([rice]);
    expect(none.q("#budget-row").textContent).toContain("Not set");
    expect(none.q("#budget-status").textContent).toBe("Set budget");
  });

  it("opens the budget sheet from the whole budget row", () => {
    const { q, click } = setup([], 100);
    click<HTMLButtonElement>("#budget-row");
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(true);
  });

  it("is flat: no green header, no gradient, and the cards use the surface color", () => {
    const { q } = setup([rice], 100);
    expect(document.querySelector(".hero")).toBeNull();
    expect(q("#app-header").className).not.toMatch(/hero|gradient|green/);
    expect(q("#app-bar").outerHTML).not.toMatch(/gradient/);
    expect(q("section[aria-label='Spending summary']").className).toContain("bg-[var(--color-surface)]");
  });

  it("gives every control on the Home top a 48dp touch target", () => {
    const { q } = setup([rice], 100);
    for (const sel of ["#open-settings", "#budget-row", "#add-form button", "#needed-tab", "#cart-tab"]) {
      expect(q(sel).className, sel).toMatch(/(^|\s)tap(\s|$)/);
    }
    expect(q("#new-name").className).not.toMatch(/\bh-\d|\bmin-h-\[?\d/); // the base input style already gives it 48px
  });

  it("has the new add form: an 'Add an item' field and a '+ Add' button", () => {
    const { q } = setup();
    expect(q<HTMLInputElement>("#new-name").placeholder).toBe("Add an item");
    expect(q("#add-form button").textContent?.trim()).toBe("Add");
    expect(q("#add-form button svg")).not.toBeNull(); // the plus icon
  });

  it("lets the add form wrap, so the button drops below the field when it can't fit", () => {
    const { q } = setup();
    expect(q("#add-form").className).toContain("flex-wrap");
  });

  it("shows tab counts as plain numbers after the label, and lets the tabs grow with the text", () => {
    const { q } = setup([rice, eggs]);
    expect(q("#needed-tab").textContent).toBe("Still needed 2");
    expect(q("#cart-tab").textContent).toBe("In cart 0");
    expect(q("#needed-tab").className).not.toContain("whitespace-nowrap");
    expect(q("#needed-tab span.rounded-full, #needed-tab span[class*='rounded-[10px]']")).toBeNull(); // no count pill
  });

  it("scales the progress bar instead of resizing it, so it never triggers layout", () => {
    const { q } = setup([{ ...rice, checked: true }, eggs]);
    const fill = q<HTMLElement>("[role=progressbar] > span");
    expect(fill.className).toContain("transition-transform");
    expect(fill.className).not.toMatch(/transition-\[?width/);
    expect(fill.getAttribute("style")).not.toContain("width");
  });

  it("lays a row out as checkbox, name and Line total, then labeled editors, then remove", () => {
    const { q } = setup([rice]);
    const li = q("#list li");
    expect(li.querySelector(".item-title-row .name")!.textContent).toBe("Rice");
    expect(li.querySelector(".item-title-row .item-subtotal")!.textContent).toBe("Line totalPHP\u00a0100");
    const editors = li.querySelector(".item-details-row")!;
    expect(editors.textContent).toContain("Quantity");
    expect(editors.textContent).toContain("Unit price · PHP");
    expect(editors.querySelector(".quantity-control .qty")).not.toBeNull();
    expect(editors.querySelector(".price")).not.toBeNull();
    expect(editors.querySelector(".del")).not.toBeNull(); // remove has its own area, last in the row
    expect(editors.lastElementChild).toBe(editors.querySelector(".del"));
  });

  it("puts the rows in one card with dividers, not separate cards", () => {
    const { q } = setup([rice, eggs]);
    expect(q("#list").className).toContain("rounded-2xl");
    expect(q("#list").className).toContain("bg-[var(--color-surface)]");
    const row = q("#list li").className;
    expect(row).toContain("border-b");
    expect(row).not.toMatch(/\bmb-|rounded-\[|shadow-|\bborder\b(?!-)/); // no gap, own radius, shadow or full border
  });

  it("gives every row control a 48dp target: checkbox, the three quantity areas, price and remove", () => {
    const { q } = setup([rice]);
    expect(q(".item-check").closest("label")!.className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q(".select-item").closest("label")!.className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q(".quantity-control").className).toContain("w-[144px]"); // 48 + 48 + 48
    expect(q(".quantity-control").className).toContain("h-[48px]");
    for (const step of document.querySelectorAll(".qty-step")) expect(step.className).toContain("h-[48px] w-[48px]");
    expect(q(".qty").className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q(".qty").className).toContain("w-[48px]");
    expect(q(".del").className).toMatch(/(^|\s)tap(\s|$)/);
  });

  it("lets the editors wrap so they stack at 320dp or large text, with remove staying in its own area", () => {
    const { q } = setup([rice]);
    expect(q(".item-details-row").className).toContain("flex-wrap");
    expect(q(".price").parentElement!.className).toContain("min-w-[128px]");
    expect(q(".price").parentElement!.className).toContain("flex-1");
    expect(q(".del").className).toContain("shrink-0");
  });

  it("uses a numeric keypad for quantity and a decimal one for price, and right-aligns the numbers", () => {
    const { q } = setup([rice]);
    expect(q<HTMLInputElement>(".qty").inputMode).toBe("numeric");
    expect(q<HTMLInputElement>(".price").inputMode).toBe("decimal");
    expect(q(".price").className).toContain("text-right");
    expect(q(".item-subtotal").className).toContain("text-right");
    expect(q(".item-subtotal strong, .item-subtotal span:last-child").className).toContain("num");
  });

  it("strikes through the name of a checked item and fades nothing else", () => {
    const unchecked = setup([rice]);
    const uncheckedEditors = unchecked.q(".item-details-row").outerHTML;
    const uncheckedTotal = unchecked.q(".item-subtotal").outerHTML;
    expect(unchecked.q(".name").className).not.toContain("line-through");

    const checked = setup([{ ...rice, checked: true }]);
    checked.click<HTMLButtonElement>("#cart-tab");
    expect(checked.q("#list li").className).toContain("done");
    expect(checked.q("#list li").className).not.toMatch(/opacity/);
    expect(checked.q(".name").className).toContain("line-through");
    expect(checked.q(".name").className).not.toMatch(/opacity|muted/);
    expect(checked.q(".item-details-row").outerHTML).toBe(uncheckedEditors); // quantity, price and remove look identical
    expect(checked.q(".item-subtotal").outerHTML).toBe(uncheckedTotal);
  });

  it("keeps Mark all in cart and Select as 48dp targets", () => {
    const { q } = setup([rice]);
    expect(q("#check-all").closest("label")!.className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q("#check-all").closest("label")!.textContent).toContain("Mark all in cart"); // the whole label is the target
    expect(q("#toggle-select").className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q("#toggle-select").textContent).toBe("Select");
  });

  it("says why the list is empty: no items, everything in the cart, or nothing in the cart yet", () => {
    const none = setup();
    expect(none.q("#empty-state").textContent).toBe("Your list is empty.");
    none.click<HTMLButtonElement>("#cart-tab");
    expect(none.q("#empty-state").textContent).toBe("Your list is empty.");
    expect(none.q("#needed-tab").textContent).toBe("Still needed 0"); // honest counts, and both tabs stay

    const some = setup([rice]);
    some.click<HTMLButtonElement>("#cart-tab");
    expect(some.q<HTMLElement>("#empty-state").hidden).toBe(false);
    expect(some.q("#empty-state").textContent).toBe("No items in your cart yet.");

    const allIn = setup([{ ...rice, checked: true }]);
    expect(allIn.q("#empty-state").textContent).toBe("Everything is in your cart.");
  });

  it("pins Finish trip in a footer, only on In cart, so the list scrolls above it", () => {
    const { q, click } = setup([{ ...rice, checked: true }, eggs]);
    expect(document.querySelector("footer")).toBeNull(); // Still needed: no footer at all
    click<HTMLButtonElement>("#cart-tab");
    const footer = q("footer");
    expect(footer.contains(q("#finish-trip"))).toBe(true);
    expect(q("#home-page main").contains(footer)).toBe(false); // outside the scroller, so it never covers the last row
    expect(q("#finish-trip").textContent).toBe("Finish trip · PHP\u00a0100"); // the total stays in the label
    expect(q("#finish-trip").className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q("#finish-trip").className).toContain("w-full");
    expect(footer.className).toContain("env(safe-area-inset-bottom");
    click<HTMLButtonElement>("#needed-tab");
    expect(document.querySelector("footer")).toBeNull();
  });

  it("shows plain 'Finish trip' and disables it while the cart is empty", () => {
    const { q, click } = setup([rice]);
    click<HTMLButtonElement>("#cart-tab");
    expect(q("#finish-trip").textContent).toBe("Finish trip");
    expect(q<HTMLButtonElement>("#finish-trip").disabled).toBe(true);
  });
});

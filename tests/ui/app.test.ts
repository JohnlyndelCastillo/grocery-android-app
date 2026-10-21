import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item } from "../../src/domain/types";
import type { GroceryStorage } from "../../src/storage/storage";
import { mountApp } from "../../src/ui/app";

// jsdom has no <dialog>.showModal(), so give it a tiny stand-in.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const rice: Item = { id: "1", name: "Rice", qty: 2, price: 50, checked: false };
const eggs: Item = { id: "2", name: "Eggs", qty: 1, price: 30, checked: false };

function setup(items: Item[] = [], budget: number | null = null) {
  const storage: GroceryStorage = {
    loadItems: () => items,
    saveItems: vi.fn(),
    loadDailyBudget: () => budget,
    saveDailyBudget: vi.fn(),
  };
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  mountApp(root, storage);
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const submit = (sel: string) => q(sel).dispatchEvent(new Event("submit", { cancelable: true }));
  return { root, storage, q, submit };
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
    const { q } = setup([rice, eggs]);
    expect(q("#cart-total").textContent).toContain("0.00");
    q<HTMLInputElement>("li input[type=checkbox]:not(.select-item)").click();
    expect(q("#cart-total").textContent).toContain("100.00");
    expect(q("#planned-total").textContent).toContain("130.00");
    expect(q("#item-count").textContent).toBe("1 / 2");
  });

  it("filters items into Still needed and In cart tabs as their checked state changes", () => {
    const { q } = setup([rice, eggs]);
    expect(q("#needed-count").textContent).toBe("2");
    expect(q("#cart-count").textContent).toBe("0");
    expect(q("#list").textContent).toContain("Rice");

    q<HTMLInputElement>('li input[type="checkbox"]:not(.select-item)').click();
    expect(q("#list").textContent).not.toContain("Rice");
    expect(q("#needed-count").textContent).toBe("1");
    expect(q("#cart-count").textContent).toBe("1");

    q<HTMLButtonElement>("#cart-tab").click();
    expect(q("#list").textContent).toContain("Rice");
    q<HTMLInputElement>('li input[type="checkbox"]:not(.select-item)').click();
    expect(q("#needed-tab").getAttribute("aria-selected")).toBe("false");
    q<HTMLButtonElement>("#needed-tab").click();
    expect(q("#list").textContent).toContain("Rice");
  });

  it("shows a tab-specific empty state after marking every item in cart", () => {
    const { q } = setup([rice, eggs]);
    q<HTMLInputElement>("#check-all").click();
    expect(q("#needed-count").textContent).toBe("0");
    expect(q<HTMLElement>("#empty-state").hidden).toBe(false);
    expect(q("#empty-state").textContent).toContain("Nothing left to shop for");
    q<HTMLButtonElement>("#cart-tab").click();
    expect(q("#list").textContent).toContain("Rice");
    expect(q("#list").textContent).toContain("Eggs");
  });

  it("flags the cart card when over budget", () => {
    const { q } = setup([{ ...rice, checked: true }], 80);
    expect(q("#cart-card").classList.contains("over-budget")).toBe(true);
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
    const { q } = setup([rice, eggs]);
    q<HTMLButtonElement>("#toggle-select").click();
    q<HTMLInputElement>(".select-item").click();
    q<HTMLButtonElement>("#delete-selected").click();
    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(true);
    q<HTMLButtonElement>("#confirm-delete").click();
    expect(q("#list").textContent).not.toContain("Rice");
    expect(q("#list").textContent).toContain("Eggs");
  });

  it("selects all for bulk deletion only in the active tab", () => {
    const { q } = setup([{ ...rice, checked: true }, eggs]);
    q<HTMLButtonElement>("#toggle-select").click();
    q<HTMLInputElement>("#select-all").click();
    expect(q<HTMLInputElement>('.select-item[aria-label="Select Eggs for deletion"]').checked).toBe(true);
    q<HTMLButtonElement>("#cart-tab").click();
    expect(q<HTMLInputElement>("#select-all").checked).toBe(false);
    q<HTMLInputElement>("#select-all").click();
    q<HTMLButtonElement>("#delete-selected").click();
    q<HTMLButtonElement>("#confirm-delete").click();
    q<HTMLButtonElement>("#needed-tab").click();
    expect(q("#list").textContent).toContain("Eggs");
    q<HTMLButtonElement>("#cart-tab").click();
    expect(q("#list").textContent).not.toContain("Rice");
  });

  it("collapses the title and description while retaining the spending summary", () => {
    const { q } = setup([rice]);
    const toggle = q<HTMLButtonElement>("#collapse-header");
    toggle.click();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(q<HTMLElement>("#hero-title").getAttribute("aria-hidden")).toBe("true");
    expect(q<HTMLElement>(".hero").classList.contains("collapsed")).toBe(true);
    expect(q<HTMLElement>(".totals").hidden).toBe(false);
    expect(q("#cart-total").textContent).toContain("0.00");
    toggle.click();
    expect(q<HTMLElement>("#hero-title").getAttribute("aria-hidden")).toBe("false");
  });

  it("opens the settings list, shows the app version on About, and returns", () => {
    const { q } = setup();
    q<HTMLButtonElement>("#open-settings").click();
    expect(q<HTMLElement>("#home-page").hidden).toBe(true);
    expect(q<HTMLElement>("#settings-page").hidden).toBe(false);
    expect(q<HTMLElement>("#settings-home").textContent).toContain("About");
    expect(q("#settings-home a")).toBeNull();
    q<HTMLButtonElement>("#open-about").click();
    expect(q("#settings-title").textContent).toBe("About");
    expect(q("#about-page").textContent).toContain("v1.1.1");
    expect(q<HTMLButtonElement>("#close-settings").textContent).toContain("Settings");
    expect(q<HTMLAnchorElement>("#about-page a").href).toBe("https://github.com/JohnlyndelCastillo/grocery-android-app/releases#release-v1.1.1");
    q<HTMLButtonElement>("#close-settings").click();
    expect(q<HTMLElement>("#settings-home").hidden).toBe(false);
    expect(q("#settings-title").textContent).toBe("Settings");
    q<HTMLButtonElement>("#close-settings").click();
    expect(q<HTMLElement>("#home-page").hidden).toBe(false);
  });

  it("increments and decrements quantity without going below zero", () => {
    const { q, storage } = setup([eggs]);
    const qty = q<HTMLInputElement>(".qty");

    q<HTMLButtonElement>('[aria-label="Increase quantity of Eggs"]').click();
    expect(qty.value).toBe("2");
    expect(q(".item-subtotal").textContent).toContain("60.00");

    q<HTMLButtonElement>('[aria-label="Decrease quantity of Eggs"]').click();
    q<HTMLButtonElement>('[aria-label="Decrease quantity of Eggs"]').click();
    expect(qty.value).toBe("0");
    expect(q(".item-subtotal").textContent).toContain("0.00");
    expect(storage.saveItems).toHaveBeenLastCalledWith([{ ...eggs, qty: 0 }]);
  });

  it("keeps typed quantity edits and shows the item name in the title row", () => {
    const longNameItem = { ...eggs, name: "A very long grocery item name" };
    const { q, storage } = setup([longNameItem]);
    const qty = q<HTMLInputElement>(".qty");
    qty.value = "3";
    qty.dispatchEvent(new Event("input", { bubbles: true }));

    expect(q(".item-title-row .name").textContent).toBe(longNameItem.name);
    expect(q(".item-details-row .item-subtotal").textContent).toContain("90.00");
    expect(storage.saveItems).toHaveBeenLastCalledWith([{ ...longNameItem, qty: 3 }]);
  });

  it("reveals and confirms single-item deletion from the swipe action", () => {
    const { q, storage } = setup([rice, eggs]);
    const swipeDelete = q<HTMLButtonElement>('[aria-label="Delete Rice"]');
    swipeDelete.click();

    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(true);
    expect(q("#delete-confirm-message").textContent).toContain("Rice");
    q<HTMLButtonElement>("#confirm-delete").click();

    expect(q("#list").textContent).not.toContain("Rice");
    expect(q("#list").textContent).toContain("Eggs");
    expect(storage.saveItems).toHaveBeenLastCalledWith([eggs]);
  });

  it("deletes immediately when the per-item x button is clicked", () => {
    const { q, storage } = setup([rice, eggs]);
    q<HTMLButtonElement>('.del[aria-label="Delete Rice"]').click();

    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(false);
    expect(q("#list").textContent).not.toContain("Rice");
    expect(q("#list").textContent).toContain("Eggs");
    expect(storage.saveItems).toHaveBeenLastCalledWith([eggs]);
    expect(q<HTMLElement>("#undo-banner").hidden).toBe(false);
    q<HTMLButtonElement>("#undo-delete").click();
    expect(q("#list").textContent).toContain("Rice");
    expect(q<HTMLElement>("#undo-banner").hidden).toBe(true);
  });
});

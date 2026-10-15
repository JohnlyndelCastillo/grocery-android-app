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
});

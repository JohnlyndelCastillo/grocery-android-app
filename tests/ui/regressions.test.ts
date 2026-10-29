import { act } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item } from "../../src/domain/types";
import type { GroceryStorage } from "../../src/storage/storage";
import { mountApp } from "../../src/ui/app";

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

function setup(items: Item[]) {
  const storage: GroceryStorage = {
    loadItems: () => items,
    saveItems: vi.fn(),
    loadDailyBudget: () => null,
    saveDailyBudget: vi.fn(),
  };
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, storage); });
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const click = <T extends HTMLElement>(sel: string) => act(() => q<T>(sel).click());
  return { q, click };
}

describe("regressions", () => {
  beforeEach(() => localStorage.clear());

  it("keeps a quantity of zero visible after the list redraws", () => {
    const { q } = setup([{ ...rice, qty: 0 }, eggs]);
    expect(q<HTMLInputElement>('input[aria-label="Quantity of Rice"]').value).toBe("0");
  });

  it("leaves select mode right after a bulk delete", () => {
    const { q, click } = setup([rice, eggs]);
    click<HTMLButtonElement>("#toggle-select");
    click<HTMLInputElement>(".select-item");
    click<HTMLButtonElement>("#delete-selected");
    click<HTMLButtonElement>("#confirm-delete");
    expect(q<HTMLElement>("#bulk-actions").hidden).toBe(true);
    expect(q("#toggle-select").textContent).toBe("Select Items");
  });

  it("says '1 item deleted' (singular) for a one-item bulk delete", () => {
    const { q, click } = setup([rice, eggs]);
    click<HTMLButtonElement>("#toggle-select");
    click<HTMLInputElement>(".select-item");
    click<HTMLButtonElement>("#delete-selected");
    click<HTMLButtonElement>("#confirm-delete");
    expect(q("#undo-message").textContent).toBe("1 item deleted.");
  });

  it("brings deleted items back with Undo", () => {
    const { q, click } = setup([rice, eggs]);
    click<HTMLButtonElement>(".del");
    expect(q("#list").textContent).not.toContain("Rice");
    click<HTMLButtonElement>("#undo-delete");
    expect(q("#list").textContent).toContain("Rice");
  });
});

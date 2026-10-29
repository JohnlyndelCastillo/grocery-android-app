import { act } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Item } from "../../src/domain/types";
import type { GroceryStorage } from "../../src/storage/storage";
import { mountApp } from "../helpers/mountApp";

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});

const rice: Item = { id: "1", name: "Rice", qty: 2, price: 50, checked: false };
const eggs: Item = { id: "2", name: "Eggs", qty: 1, price: 30, checked: false };

let unmount = () => {};
afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
});

function setup(items: Item[]) {
  const storage: GroceryStorage = { loadItems: () => items, saveItems: vi.fn(), loadDailyBudget: () => null, saveDailyBudget: vi.fn() };
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, storage); });
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const qa = <T extends Element>(sel: string) => [...root.querySelectorAll<T>(sel)];
  const click = (sel: string) => act(() => q<HTMLElement>(sel).click());
  return { q, qa, click, storage };
}

function touch(el: Element, type: "touchstart" | "touchmove" | "touchend", x: number, y = 0) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: x, clientY: y };
  Object.assign(event, { touches: type === "touchend" ? [] : [point], changedTouches: [point] });
  act(() => { el.dispatchEvent(event); });
  return event;
}
const swipe = (el: Element, from: number, to: number) => {
  touch(el, "touchstart", from);
  touch(el, "touchmove", to);
  touch(el, "touchend", to);
};
const isSwiped = (li: Element) => li.getAttribute("data-swiped") === "true";

describe("swipe", () => {
  it("opens on a left swipe, closes on a right swipe or a tap on the row", () => {
    const { q } = setup([rice]);
    const li = q<HTMLLIElement>("#list li");
    swipe(li, 200, 120);
    expect(isSwiped(li)).toBe(true);
    swipe(li, 120, 200);
    expect(isSwiped(li)).toBe(false);
    swipe(li, 200, 120);
    act(() => li.querySelector<HTMLElement>(".name")!.click());
    expect(isSwiped(li)).toBe(false);
  });

  it("only one row is open at a time", () => {
    const { qa } = setup([rice, eggs]);
    const [first, second] = qa<HTMLLIElement>("#list li");
    swipe(first, 200, 120);
    swipe(second, 200, 120);
    expect(isSwiped(first)).toBe(false);
    expect(isSwiped(second)).toBe(true);
  });

  it("stays open while the row re-renders from a quantity edit", () => {
    const { q } = setup([rice]);
    swipe(q("#list li"), 200, 120);
    act(() => {
      const qty = q<HTMLInputElement>(".qty");
      qty.value = "5";
      qty.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(isSwiped(q("#list li"))).toBe(true);
  });

  it("ignores swipes in select mode", () => {
    const { q, click } = setup([rice]);
    click("#toggle-select");
    swipe(q("#list li"), 200, 100);
    expect(isSwiped(q("#list li"))).toBe(false);
  });

  it("takes its touch listeners off when the row goes away", () => {
    const { q, click } = setup([rice, eggs]);
    const li = q<HTMLLIElement>("#list li");
    const remove = vi.spyOn(li, "removeEventListener");
    click('.del[aria-label="Delete Rice"]');
    expect(remove.mock.calls.map(([type]) => type).sort()).toEqual(["touchend", "touchmove", "touchstart"]);
  });
});

describe("delete dialog + selection", () => {
  it("Esc on the dialog closes it and forgets the pending single delete", () => {
    const { q, click } = setup([rice, eggs]);
    act(() => q<HTMLButtonElement>('.swipe-delete[aria-label="Delete Rice"]').click());
    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(true);
    act(() => { q("#confirm-delete-dialog").dispatchEvent(new Event("cancel", { cancelable: true })); });
    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(false);

    click("#toggle-select");
    act(() => q<HTMLInputElement>('.select-item[aria-label="Select Eggs for deletion"]').click());
    click("#delete-selected");
    click("#confirm-delete");
    expect(q("#list").textContent).toContain("Rice");
    expect(q("#list").textContent).not.toContain("Eggs");
  });

  it("checking an item in select mode drops it from the selection", () => {
    const { q, click } = setup([rice, eggs]);
    click("#toggle-select");
    act(() => q<HTMLInputElement>('.select-item[aria-label="Select Rice for deletion"]').click());
    expect(q("#delete-selected").textContent).toContain("(1)");
    act(() => q<HTMLInputElement>('input[aria-label="Mark Rice as in cart"]').click());
    expect(q("#delete-selected").textContent).toBe("Delete selected");
    expect(q<HTMLButtonElement>("#delete-selected").disabled).toBe(true);
  });
});

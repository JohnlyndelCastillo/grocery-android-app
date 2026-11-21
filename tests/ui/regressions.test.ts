import { act } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Item } from "../../src/domain/types";
import { makeItem, makeList, makeState, makeStorage } from "../helpers/appState";
import { mountApp } from "../helpers/mountApp";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

const rice: Item = makeItem({ id: "1", name: "Rice", qty: 2, price: 50, checked: false });
const eggs: Item = makeItem({ id: "2", name: "Eggs", qty: 1, price: 30, checked: false });
let unmount = () => {};

afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
  window.location.hash = "";
});

function setup(items: Item[]) {
  const test = makeStorage(makeState({ lists: [makeList("My list", items)], activeListId: "list-1" }));
  window.location.hash = "#/lists/list-1";
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, test.storage); });
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const click = <T extends HTMLElement>(sel: string) => act(() => q<T>(sel).click());
  return { q, click, storage: test.storage, saved: test.saved };
}

describe("regressions", () => {
  beforeEach(() => localStorage.clear());

  it("keeps a quantity of zero visible after the list redraws", () => {
    const { q } = setup([{ ...rice, qty: 0 }, eggs]);
    expect(q<HTMLInputElement>('input[aria-label="Quantity of Rice"]').value).toBe("0");
  });

  it("leaves select mode right after a bulk delete", () => {
    const { q, click } = setup([rice, eggs]);
    click("#toggle-select");
    click(".select-item");
    click("#delete-selected");
    click("#confirm-delete");
    expect(q<HTMLElement>("#bulk-actions").hidden).toBe(true);
    expect(q("#toggle-select").textContent).toBe("Select");
  });

  it("says '1 item deleted' (singular) for a one-item bulk delete", () => {
    const { q, click } = setup([rice, eggs]);
    click("#toggle-select");
    click(".select-item");
    click("#delete-selected");
    click("#confirm-delete");
    expect(q("#undo-message").textContent).toBe("1 item deleted.");
  });

  it("brings deleted items back with Undo", () => {
    const { q, click } = setup([rice, eggs]);
    click(".del");
    expect(q("#list").textContent).not.toContain("Rice");
    click("#undo-delete");
    expect(q("#list").textContent).toContain("Rice");
  });
});

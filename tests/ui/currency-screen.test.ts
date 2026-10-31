import { act } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { GroceryStorage } from "../../src/storage/storage";
import { mountApp } from "../helpers/mountApp";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

let unmount = () => {};
afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
});
beforeEach(() => localStorage.clear());

function setup() {
  const storage: GroceryStorage = {
    loadItems: () => [{ id: "1", name: "Rice", qty: 2, price: 50, checked: true }],
    saveItems: vi.fn(),
    loadDailyBudget: () => null,
    saveDailyBudget: vi.fn(),
    loadReceipts: () => [],
    saveReceipts: vi.fn(),
  };
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, storage); });
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const click = <T extends HTMLElement>(sel: string) => act(() => q<T>(sel).click());
  return { q, click };
}

describe("currency in Settings", () => {
  it("is no longer on the home screen", () => {
    const { q } = setup();
    expect(q("#home-page #currency-select")).toBeNull();
    expect(q("#currency-tooltip")).toBeNull();
  });

  it("shows the formatting-only note as visible text and changes the currency", () => {
    const { q, click } = setup();
    click<HTMLButtonElement>("#open-settings");
    expect(q("#currency-value").textContent).toContain("PHP");

    click<HTMLButtonElement>("#open-currency");
    expect(q("#settings-title").textContent).toBe("Currency");
    expect(q<HTMLElement>("#currency-note").hidden).toBe(false);
    expect(q("#currency-note").textContent).toContain("doesn’t convert");
    expect(q("#currency-option-PHP").getAttribute("aria-checked")).toBe("true");

    click<HTMLButtonElement>("#currency-option-USD");
    expect(q("#currency-option-USD").getAttribute("aria-checked")).toBe("true");
    expect(q("#currency-option-PHP").getAttribute("aria-checked")).toBe("false");
    expect(q("#settings-title").textContent).toBe("Currency"); // stays on the screen
    expect(localStorage.getItem("grocery-currency-v1")).toBe("USD");

    click<HTMLButtonElement>("#close-settings");
    expect(q("#settings-title").textContent).toBe("Settings");
    expect(q("#currency-value").textContent).toContain("USD ($)");
    click<HTMLButtonElement>("#close-settings");
    expect(q("#cart-card strong").textContent).toBe("$100.00");
  });
});

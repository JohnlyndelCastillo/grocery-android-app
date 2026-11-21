import { act } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeItem, makeList, makeState, makeStorage } from "../helpers/appState";
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
  window.location.hash = "";
});
beforeEach(() => localStorage.clear());

function setup() {
  const test = makeStorage(makeState({
    lists: [makeList("My list", [makeItem({ id: "1", name: "Rice", qty: 2, price: 50, checked: true })])],
    activeListId: "list-1",
  }));
  window.location.hash = "#/";
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, test.storage); });
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
    click("#nav-settings");
    expect(q("#currency-value").textContent).toContain("PHP");

    click("#open-currency");
    expect(q("#settings-title").textContent).toBe("Currency");
    expect(q<HTMLElement>("#currency-note").hidden).toBe(false);
    expect(q("#currency-note").textContent).toContain("doesn’t convert");
    expect(q("#currency-option-PHP").getAttribute("aria-checked")).toBe("true");

    click("#currency-option-USD");
    expect(q("#currency-option-USD").getAttribute("aria-checked")).toBe("true");
    expect(q("#currency-option-PHP").getAttribute("aria-checked")).toBe("false");
    expect(q("#settings-title").textContent).toBe("Currency"); // stays on the screen
    expect(localStorage.getItem("grocery-currency-v1")).toBe("USD");

    click("#close-settings");
    expect(q("#settings-title").textContent).toBe("Settings");
    expect(q("#currency-value").textContent).toBe("USD");
    click("#close-settings");
    expect(q("#home-page")).not.toBeNull();

    // Open the list from Home to see the new formatting.
    click(".active-list button");
    expect(q("#cart-card strong").textContent).toBe("USD\u00a0100");
  });
});

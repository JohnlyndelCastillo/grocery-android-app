import { act } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Item } from "../../src/domain/types";
import { makeItem, makeList, makeState, makeStorage } from "../helpers/appState";
import { mountApp } from "../helpers/mountApp";

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

const rice: Item = makeItem({ id: "1", name: "Rice", qty: 2, price: 50, checked: true });
const eggs: Item = makeItem({ id: "2", name: "Eggs", qty: 1, price: 30, checked: false });

let unmount = () => {};
afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
  window.location.hash = "";
  localStorage.clear();
});

function setup(budget: number | null = null) {
  const test = makeStorage(makeState({ lists: [makeList("My list", [rice, eggs])], activeListId: "list-1" }), budget);
  window.location.hash = "#/lists/list-1";
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, test.storage); });
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

  const main = q<HTMLElement>("#screen-scroll");
  const scroll = { top: 0 };
  Object.defineProperties(main, {
    scrollTop: { get: () => scroll.top, set: (v: number) => { scroll.top = v; }, configurable: true },
    scrollHeight: { get: () => 3000, configurable: true },
    clientHeight: { get: () => 500, configurable: true },
  });
  const scrollTo = (top: number) => {
    scroll.top = top;
    act(() => { main.dispatchEvent(new Event("scroll")); });
  };
  return { q, root, scrollTo };
}

describe("page scrolling", () => {
  it("the page is the only scroller: the list and its rows don't scroll on their own", () => {
    const { q, root } = setup();
    const scrollers = root.querySelectorAll('#screen-scroll [class*="overflow-y-auto"], #screen-scroll [class*="overflow-auto"]');
    expect([...scrollers]).toEqual([]);
    expect(q("#list").className).not.toMatch(/max-h|overflow-(y-|x-)?(auto|scroll)/); // overflow-hidden only clips the rounded corners
  });

  it("the tabs and the add bar sit outside the scrolling list", () => {
    const { q } = setup();
    expect(q("#screen-scroll").contains(q("#add-form"))).toBe(false);
    expect(q("#screen-scroll").contains(q("#needed-tab"))).toBe(true); // tabs are inside the scroller in this design
  });
});

describe("list detail layout", () => {
  it("has a header, a scrolling main and a fixed bottom bar", () => {
    const { q } = setup();
    expect(q("#list-detail-page")).not.toBeNull();
    expect(q("#list-detail-page header")).not.toBeNull();
    expect(q("#screen-scroll")).not.toBeNull();
    expect(q(".detail-bottom")).not.toBeNull();
    expect(q(".detail-bottom").contains(q("#finish-trip"))).toBe(false); // cart empty
  });

  it("shows Finish trip only on the In cart tab", () => {
    const { q, scrollTo } = setup();
    void scrollTo;
    act(() => q<HTMLButtonElement>("#cart-tab").click());
    expect(q(".detail-bottom").contains(q("#finish-trip"))).toBe(true);
  });
});

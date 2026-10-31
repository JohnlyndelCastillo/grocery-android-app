import { act } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Item } from "../../src/domain/types";
import type { GroceryStorage } from "../../src/storage/storage";
import { mountApp } from "../helpers/mountApp";

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

const rice: Item = { id: "1", name: "Rice", qty: 2, price: 50, checked: true }; // 100, in the cart
const eggs: Item = { id: "2", name: "Eggs", qty: 1, price: 30, checked: false };

let unmount = () => {};
afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
  localStorage.clear();
});

function setup(budget: number | null = null) {
  const storage = {
    loadItems: () => [rice, eggs],
    saveItems: vi.fn(),
    loadDailyBudget: () => budget,
    saveDailyBudget: vi.fn(),
    loadReceipts: () => [],
    saveReceipts: vi.fn(),
  } as unknown as GroceryStorage;
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, storage); });
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;

  // jsdom has no layout: give the page scroller a size and a scroll position we control.
  const main = q<HTMLElement>("#home-page main");
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
    const scrollers = root.querySelectorAll('#home-page [class*="overflow-y-auto"], #home-page [class*="overflow-auto"]');
    expect([...scrollers]).toEqual([q("#home-page main")]);
    expect(q("#list").className).not.toMatch(/max-h|overflow/);
  });

  it("the tabs sit in a sticky wrapper inside the scrolling page", () => {
    const { q } = setup();
    const sticky = q<HTMLElement>("#needed-tab").closest<HTMLElement>(".sticky")!;
    expect(sticky).not.toBeNull();
    expect(sticky.contains(q("#cart-tab"))).toBe(true);
    expect(q("#home-page main").contains(sticky)).toBe(true);
    expect(sticky.className).toContain("top-0");
    expect(sticky.className).toContain("bg-app"); // opaque, so rows scrolling underneath don't show through
  });
});

describe("collapsing header", () => {
  it("compacts once the page is scrolled and expands again at the top", () => {
    const { q, scrollTo } = setup();
    const header = q<HTMLElement>("#app-header");
    expect(header.dataset.compact).toBe("false");
    expect(q("#compact-summary").getAttribute("aria-hidden")).toBe("true");

    scrollTo(120);
    expect(header.dataset.compact).toBe("true");
    expect(q("#compact-summary").getAttribute("aria-hidden")).toBe("false");
    expect(q("#compact-summary").textContent).toContain("100.00"); // the cart total, in one line
    expect(q("#cart-card").closest('[aria-hidden="true"]')).not.toBeNull(); // the big cards are hidden from screen readers

    scrollTo(30); // part-way up: still compact, so it doesn't flicker
    expect(header.dataset.compact).toBe("true");

    scrollTo(0);
    expect(header.dataset.compact).toBe("false");
    expect(q("#cart-card").closest('[aria-hidden="true"]')).toBeNull();
  });

  it("keeps the settings button and title while compact", () => {
    const { q, scrollTo } = setup();
    scrollTo(120);
    expect(q("#open-settings")).not.toBeNull();
    expect(q("#app-header h1").textContent).toBe("Grocery list");
  });

  it("the compact summary still says when you're over budget", () => {
    const { q, scrollTo } = setup(50); // cart is 100, budget 50
    scrollTo(120);
    expect(q("#compact-summary").textContent).toContain("over today's budget");
  });
});

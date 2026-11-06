import { act } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item } from "../../src/domain/types";
import type { GroceryStorage } from "../../src/storage/storage";
import { mountApp } from "../helpers/mountApp";

// jsdom has no <dialog>.showModal(), so give it a tiny stand-in.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

const rice: Item = { id: "1", name: "Rice", qty: 2, price: 50, checked: false };
let unmount = () => {};

afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
});

function setup(items: Item[] = [], budget: number | null = null) {
  const storage: GroceryStorage = {
    loadItems: () => items,
    saveItems: vi.fn(),
    loadDailyBudget: () => budget,
    loadReceipts: () => [],
    saveReceipts: vi.fn(),
    saveDailyBudget: vi.fn(),
  };
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, storage); });
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const click = <T extends HTMLElement>(sel: string) => act(() => q<T>(sel).click());
  return { root, storage, q, click };
}

describe("budget sheet", () => {
  beforeEach(() => localStorage.clear());

  it("builds the budget sheet from the design: handle, title and close, the explanation, a labeled field", () => {
    const { q } = setup([{ ...rice, checked: true }], 500);
    const sheet = q("#budget-sheet");
    expect(q("#budget-sheet-title").textContent).toBe("Today’s budget");
    expect(q("#budget-sheet-title").className).toContain("text-sheet");
    expect(sheet.textContent).toContain("Resets every day. Leave empty for no limit.");
    expect(sheet.querySelector("label[for=budget-input]")!.textContent).toBe("Spending limit");
    expect(sheet.textContent).toContain("PHP"); // the currency prefix inside the field
    expect(q<HTMLInputElement>("#budget-input").inputMode).toBe("decimal");
    expect(q("#budget-input").className).toContain("min-h-[56px]"); // 56dp field
    expect(q("#budget-input").className).toContain("text-right"); // amount is right-aligned
    expect(q("#budget-input").className).toMatch(/(^|\s)num(\s|$)/);
    expect(sheet.className).toContain("rounded-t-3xl"); // 24dp top corners
    expect(sheet.className).toContain("max-w-[600px]");
    expect(sheet.className).toContain("bg-[var(--color-surface)]");
    expect(sheet.className).not.toMatch(/shadow|blur/); // flat
  });

  it("has a 48dp Close that dismisses the sheet without saving", () => {
    const { q, click, storage } = setup([], 100);
    click<HTMLButtonElement>("#budget-row");
    expect(q("#close-budget").className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q("#close-budget").getAttribute("aria-label")).toBe("Close");
    q<HTMLInputElement>("#budget-input").value = "999";
    click<HTMLButtonElement>("#close-budget");
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(false);
    expect(storage.saveDailyBudget).not.toHaveBeenCalled();
  });

  it("shows what Save would leave in a Remaining row, for every state", () => {
    const { q, click } = setup([{ ...rice, checked: true }], 500);
    const type = (value: string) => act(() => {
      const input = q<HTMLInputElement>("#budget-input");
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    click<HTMLButtonElement>("#budget-row");
    expect(q("#budget-preview").textContent).toBe("RemainingPHP\u00a0400"); // saved budget 500, 100 in the cart
    expect(q("#budget-preview").className).toContain("--color-budget-surface");

    type("100");
    expect(q("#budget-preview").textContent).toBe("RemainingPHP\u00a00"); // exactly on budget

    type("80");
    expect(q("#budget-preview").textContent).toBe("Over byPHP\u00a020");
    expect(q("#budget-preview span:last-child").className).toContain("--color-danger"); // destructive text, not orange

    type("");
    expect(q("#budget-preview").textContent).toBe("RemainingNo limit");

    type("-5");
    expect(q("#budget-preview").textContent).toBe("Enter a valid amount.");
    expect(q("#budget-preview").className).toContain("--color-danger-soft"); // destructive surface
    expect(q("#budget-input").getAttribute("aria-invalid")).toBe("true");
    expect(q("#budget-preview").getAttribute("aria-live")).toBe("polite");
  });

  it("has a full-width Save and a quiet Clear budget that is not red, shown only when a budget exists", () => {
    const withBudget = setup([], 100);
    withBudget.click<HTMLButtonElement>("#budget-row");
    const save = withBudget.q("#budget-form button[type=submit]");
    expect(save.textContent).toBe("Save");
    expect(save.className).toMatch(/(^|\s)tap(\s|$)/);
    expect(save.className).toContain("w-full");
    expect(save.className).toContain("bg-green-fill");
    expect(save.className).toContain("text-on-action");
    const clear = withBudget.q("#clear-budget");
    expect(clear.className).toMatch(/(^|\s)tap(\s|$)/);
    expect(clear.className).toContain("text-muted");
    expect(clear.className).not.toMatch(/danger|warn|red/);

    const none = setup();
    expect(none.q("#clear-budget")).toBeNull();
  });

  it("keeps the whole sheet reachable with the keyboard open: it scrolls, and the field is brought into view", () => {
    vi.useFakeTimers();
    try {
      const { q, click } = setup([], 100);
      const sheet = q("#budget-sheet");
      expect(sheet.className).toContain("max-h-[100dvh]"); // the visible area, which the keyboard shrinks
      expect(sheet.className).toContain("overflow-y-auto");
      expect(sheet.className).toContain("overscroll-behavior:contain");
      click<HTMLButtonElement>("#budget-row");
      const scrollIntoView = vi.fn();
      const input = q<HTMLInputElement>("#budget-input");
      input.scrollIntoView = scrollIntoView;
      act(() => input.focus());
      expect(scrollIntoView).not.toHaveBeenCalled(); // waits for the keyboard to finish opening
      act(() => { vi.advanceTimersByTime(250); });
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });
    } finally {
      vi.useRealTimers();
    }
  });
});

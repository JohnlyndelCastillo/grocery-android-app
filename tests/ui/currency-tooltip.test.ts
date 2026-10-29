import { act } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { GroceryStorage } from "../../src/storage/storage";
import { mountApp } from "../helpers/mountApp";

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

let unmount = () => {};
afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
});

describe("currency tooltip", () => {
  it("is shown only from the (i) button, never from the currency dropdown", () => {
    const storage: GroceryStorage = { loadItems: () => [], saveItems: vi.fn(), loadDailyBudget: () => null, saveDailyBudget: vi.fn() };
    const root = document.createElement("div");
    document.body.replaceChildren(root);
    act(() => { unmount = mountApp(root, storage); });

    const button = root.querySelector<HTMLElement>('button[aria-label="About currency selection"]')!;
    const tooltip = root.querySelector<HTMLElement>("#currency-tooltip")!;
    const select = root.querySelector<HTMLElement>("#currency-select")!;

    // CSS shows the tooltip through `group-hover` / `group-focus-within`, so the element carrying
    // `.group` must contain the button and the tooltip but NOT the dropdown.
    const group = tooltip.closest<HTMLElement>(".group")!;
    expect(group).not.toBeNull();
    expect(group.contains(button)).toBe(true);
    expect(group.contains(select)).toBe(false);
    expect(select.closest(".group")).toBeNull();
  });
});
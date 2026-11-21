import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Item } from "../../src/domain/types";
import { makeItem, makeList, makeState, makeStorage } from "../helpers/appState";
import { mountApp } from "../helpers/mountApp";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const stylesheet = read("src/styles/style.css");

const rice: Item = makeItem({ id: "1", name: "Rice", qty: 2, price: 50, checked: true });

let unmount = () => {};
afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
  window.location.hash = "";
});

function setup(items: Item[] = [rice], budget: number | null = 500) {
  const test = makeStorage(makeState({ lists: [makeList("My list", items)], activeListId: "list-1" }), budget);
  window.location.hash = "#/lists/list-1";
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, test.storage); });
  return { q: <T extends Element>(sel: string) => root.querySelector<T>(sel)! };
}

describe("gutters and the content column", () => {
  it("uses one 16dp gutter everywhere, including the app padding", () => {
    expect(stylesheet).toMatch(/--gutter:\s*16px/);
    expect(stylesheet).toMatch(/#app \{[^}]*padding:\s*0\s+var\(--gutter\)/);
    expect(stylesheet).not.toMatch(/clamp\(\.8125rem/); // the old 13-18px gutter is gone
  });

  it("limits the content to 600dp, centered, with the gutter on both sides", () => {
    expect(stylesheet).toMatch(/#app \{[^}]*width:\s*min\(100%,\s*calc\(600px \+ 2 \* var\(--gutter\)\)\)/);
    expect(stylesheet).toMatch(/#app \{[^}]*margin:\s*0 auto/);
    expect(stylesheet).not.toContain("620px");
  });

  it("has no narrow-screen overrides left that shrink the gutter or the Add button", () => {
    expect(stylesheet).not.toMatch(/max-width:\s*380px/);
    expect(stylesheet).not.toMatch(/#add-form button\s*\{/);
  });

  it("keeps the Settings pages and Home on the same column", () => {
    expect(read("src/ui/components/SettingsPage.tsx")).not.toMatch(/max-w-\[(584|620)px\]/);
    expect(read("src/ui/components/HomePage.tsx")).not.toMatch(/max-w-\[(584|620)px\]/);
  });
});

describe("reflow at 320dp and large text", () => {
  it("lets the summary card stack: the totals wrap, and so does the budget row", () => {
    const { q } = setup();
    expect(q(".totals").className).toContain("flex-wrap");
    expect(q("#budget-row").className).toContain("flex-wrap");
    expect(q("#budget-row > span:last-child").className).toContain("ml-auto"); // stays right-aligned when it drops down
  });

  it("keeps the add form and tabs accessible at small widths", () => {
    const { q } = setup();
    expect(q("#add-form").className).toContain("flex");
    expect(q("#needed-tab").className).not.toContain("whitespace-nowrap");
    expect(q("#add-form button").className).toContain("whitespace-nowrap"); // "Add" is one short word; the field wraps instead
  });

  it("uses no fixed heights that could clip text in the screens", () => {
    for (const file of ["SummaryCard.tsx", "ShoppingList.tsx", "ReceiptDetail.tsx", "SettingsPage.tsx", "HomePage.tsx", "ListsPage.tsx"]) {
      const source = read(`src/ui/components/${file}`);
      expect(source, file).not.toMatch(/\bh-\[\d+px\]/); // hard pixel heights; controls use min-heights (the .tap utility)
    }
  });
});

describe("cleanup", () => {
  it("has removed the old one-line budget helpers", () => {
    for (const file of ["src/ui/format.ts", "src/ui/hooks/useGroceryList.ts"]) {
      expect(read(file), file).not.toContain("budgetShort");
    }
  });

  it("has removed the tokens nothing uses", () => {
    for (const token of ["green-dark", "focus", "danger-border", "budget-muted", "selection-hover", "icon-subtle"]) {
      expect(stylesheet, token).not.toMatch(new RegExp(`--color-${token}:`));
    }
  });

  it("has no filled button with hardcoded white text; filled buttons use the On action / On danger roles", () => {
    for (const file of ["AddItemForm.tsx", "BudgetSheet.tsx", "DeleteDialog.tsx", "ReceiptDetail.tsx", "ShoppingList.tsx", "GroceryRow.tsx", "SettingsGroup.tsx"]) {
      expect(read(`src/ui/components/${file}`), file).not.toContain("text-white");
    }
    expect(read("src/ui/App.tsx")).not.toContain("text-white"); // the Finish trip footer button
  });
});

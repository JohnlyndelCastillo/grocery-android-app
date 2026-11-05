import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Receipt } from "../../src/domain/types";
import type { GroceryStorage } from "../../src/storage/storage";
import { mountApp } from "../helpers/mountApp";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

const NBSP = "\u00A0";
const trip: Receipt = {
  id: "r1",
  finishedAt: "2026-11-01T14:12:00.000Z",
  currency: "PHP",
  lines: [
    { name: "test 1", qty: 1, price: 100 },
    { name: "test 2", qty: 0, price: 1200 },
    { name: "A very long item name that has to wrap instead of being cut off", qty: 2, price: 1200 },
  ],
  total: 2500,
  budget: 12000,
};

let unmount = () => {};
afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
});

function setup(receipts: Receipt[] = [trip]) {
  const storage: GroceryStorage = {
    loadItems: () => [],
    saveItems: vi.fn(),
    loadDailyBudget: () => null,
    saveDailyBudget: vi.fn(),
    loadReceipts: () => receipts,
    saveReceipts: vi.fn(),
  };
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, storage); });
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const click = <T extends HTMLElement>(sel: string) => act(() => q<T>(sel).click());
  const openReceipt = () => {
    click("#open-settings");
    click("#open-receipts");
    click("#receipts-list button");
  };
  return { q, click, openReceipt, storage };
}
const tapClass = /(^|\s)tap(\s|$)/;

describe("Settings header", () => {
  it("is one row on every screen: a 48dp icon-only back button, then the title", () => {
    const { q, click } = setup();
    const check = (title: string, label: string) => {
      const header = q("#settings-page header");
      expect(q("#settings-title").textContent).toBe(title);
      expect(header.contains(q("#close-settings"))).toBe(true);
      expect(header.contains(q("#settings-title"))).toBe(true);
      expect(header.className).toContain("items-center"); // button and title share a row
      expect(q("#close-settings").className).toMatch(tapClass);
      expect(q("#close-settings").textContent!.trim()).toBe(""); // an arrow, no text
      expect(q("#close-settings svg")).not.toBeNull();
      expect(q("#close-settings").getAttribute("aria-label")).toBe(label);
      expect(q("#settings-title").className).toContain("text-title");
    };
    click("#open-settings");
    check("Settings", "Back to grocery list");
    click("#open-currency");
    check("Currency", "Back to Settings");
    click("#close-settings");
    click("#open-about");
    check("About", "Back to Settings");
    click("#close-settings");
    click("#open-receipts");
    check("Receipts", "Back to Settings");
    click("#receipts-list button");
    check("Receipt", "Back to Receipts");
  });

  it("uses 16dp page gutters and a content column of at most 600", () => {
    const { q } = setup();
    expect(q("#settings-page").className).toContain("px-4");
    for (const id of ["#settings-home", "#currency-page", "#receipts-page", "#receipt-page", "#about-page"]) {
      expect(q(id).className, id).toContain("max-w-[600px]");
    }
  });
});

describe("Settings groups", () => {
  it("is one flat inset group: Surface, 16 radius, no border or shadow, and 48dp rows with chevrons", () => {
    const { q, click } = setup();
    click("#open-settings");
    const group = q("#settings-home .settings-group");
    expect(group.className).toContain("rounded-2xl");
    expect(group.className).toContain("bg-[var(--color-surface)]");
    expect(group.className).not.toMatch(/shadow|\bborder\b/);
    for (const id of ["#open-receipts", "#open-currency", "#open-about"]) {
      expect(q(id).className, id).toMatch(tapClass);
      expect(q(id).querySelector("svg"), id).not.toBeNull(); // trailing chevron
    }
    expect(q("#receipts-count").textContent).toBe("1");
    expect(q("#currency-value").textContent).toBe("PHP");
  });

  it("shows the Currency options as 48dp rows in a group, with the note as visible text", () => {
    const { q, click } = setup();
    click("#open-settings");
    click("#open-currency");
    for (const code of ["PHP", "VND", "USD"]) expect(q(`#currency-option-${code}`).className).toMatch(tapClass);
    expect(q("#currency-page .settings-group")).not.toBeNull();
    expect(q("#currency-note").className).toContain("text-label");
    expect(q("#currency-note").className).toContain("text-muted");
  });

  it("makes both About rows 48dp", () => {
    const { click } = setup();
    click("#open-settings");
    click("#open-about");
    const rows = [...document.querySelectorAll("#about-page .settings-row")];
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row.className).toMatch(tapClass);
  });
});

describe("Receipts list", () => {
  it("shows date and time, the item count, the total and a chevron on each row", () => {
    const { q, click } = setup();
    click("#open-settings");
    click("#open-receipts");
    const row = q("#receipts-list .receipt-row");
    expect(row.className).toMatch(tapClass);
    expect(row.textContent).toContain("2026");
    expect(row.textContent).toContain("3 items");
    expect(row.querySelector("strong")!.textContent).toBe(`PHP${NBSP}2,500`);
    expect(row.querySelector("strong")!.className).toContain("num"); // tabular numerals
    expect(row.querySelector("svg")).not.toBeNull();
  });

  it("says 'No receipts yet.' when there are none", () => {
    const { q, click } = setup([]);
    click("#open-settings");
    click("#open-receipts");
    expect(q("#receipts-empty").textContent).toBe("No receipts yet.");
  });
});

describe("Receipt detail", () => {
  it("is laid out like the design: date, Total card, Items and Line total, the lines, the budget card, Delete", () => {
    const { q, openReceipt } = setup();
    openReceipt();
    const detail = q("#receipt-detail");
    expect(q("#receipt-date").textContent).toContain("2026");
    expect(q("#receipt-total").textContent).toBe(`PHP${NBSP}2,500`);
    expect(q("#receipt-total").className).toContain("text-total");
    expect(q("#receipt-total").className).toContain("text-green");
    expect(q("#receipt-total").closest("section")!.textContent).toContain("Total");
    expect(detail.textContent).toContain("Items");
    expect(detail.textContent).toContain("Line total");

    const lines = [...detail.querySelectorAll(".receipt-line")];
    expect(lines).toHaveLength(3);
    expect(lines[0].textContent).toContain("test 1");
    expect(lines[0].textContent).toContain(`1 × PHP${NBSP}100`);
    expect(lines[0].textContent).toContain(`PHP${NBSP}100`);
    expect(lines[1].textContent).toContain(`0 × PHP${NBSP}1,200`); // a zero quantity is valid
    expect(lines[1].lastElementChild!.textContent).toBe(`PHP${NBSP}0`);
    expect(lines[2].lastElementChild!.textContent).toBe(`PHP${NBSP}2,400`);
    for (const line of lines) {
      expect(line.lastElementChild!.className).toContain("num"); // line totals are tabular and right-hand
      expect(line.lastElementChild!.className).toContain("shrink-0");
    }
    expect(lines[2].querySelector(".block")!.className).toContain("[overflow-wrap:anywhere]"); // long names wrap

    expect(q("#delete-receipt").className).toMatch(tapClass);
  });

  it("shows the budget card on the Budget surface with what was left", () => {
    const { q, openReceipt } = setup();
    openReceipt();
    const card = q("#receipt-budget");
    expect(card.className).toContain("--color-budget-surface");
    expect(card.textContent).toContain(`Today’s budgetPHP${NBSP}12,000`);
    expect(card.textContent).toContain(`Left for todayPHP${NBSP}9,500`);
    const left = q("#receipt-budget div:last-child span:last-child"); // anchored on the card, so it can't match an outer element
    expect(left.textContent).toBe(`PHP${NBSP}9,500`);
    expect(left.className).toContain("text-green");
  });

  it("shows 'Over by' in destructive text when that trip went over its budget", () => {
    const { q, openReceipt } = setup([{ ...trip, budget: 2000 }]);
    openReceipt();
    expect(q("#receipt-budget").textContent).toContain(`Over byPHP${NBSP}500`);
    expect(q("#receipt-budget div:last-child span:last-child").className).toContain("--color-danger");
  });

  it("hides the budget card when no budget was set that day", () => {
    const { q, openReceipt } = setup([{ ...trip, budget: null }]);
    openReceipt();
    expect(q("#receipt-budget")).toBeNull();
  });

  it("styles Delete receipt with the destructive surface and text, full width", () => {
    const { q, openReceipt } = setup();
    openReceipt();
    const del = q("#delete-receipt").className;
    expect(del).toContain("bg-[var(--color-danger-soft)]");
    expect(del).toContain("text-[var(--color-danger)]");
    expect(del).toContain("w-full");
    expect(del).toContain("rounded-xl");
  });
});

describe("Delete dialogs", () => {
  it("are flat, put Cancel first, and make both buttons 48dp", () => {
    const { q, click, openReceipt } = setup();
    openReceipt();
    click("#delete-receipt");
    const dialog = q<HTMLDialogElement>("#receipt-confirm-delete-dialog");
    expect(dialog.open).toBe(true);
    expect(dialog.className).toContain("bg-[var(--color-surface)]");
    expect(dialog.className).toContain("rounded-2xl");
    expect(dialog.outerHTML).not.toMatch(/shadow|blur/);
    expect(q("#receipt-delete-dialog-title").textContent).toBe("Delete this receipt?");
    expect(q("#receipt-delete-dialog-title").className).toContain("text-sheet");

    const buttons = [...dialog.querySelectorAll("button")];
    expect(buttons.map((b) => b.id)).toEqual(["receipt-cancel-delete", "receipt-confirm-delete"]); // Cancel is first, so it gets focus
    expect(buttons.map((b) => b.textContent)).toEqual(["Cancel", "Delete receipt"]);
    for (const b of buttons) expect(b.className).toMatch(tapClass);
    expect(buttons[1].className).toContain("--color-danger-fill"); // the destructive action is explicit
    expect(dialog.querySelector("[autofocus]")).toBeNull(); // never focuses Delete for you
  });
});

describe("Settings and Receipts are flat", () => {
  it("have no shadows, and no leftover bordered cards, in their components", () => {
    for (const file of ["SettingsGroup.tsx", "SettingsPage.tsx", "ReceiptsList.tsx", "ReceiptDetail.tsx", "DeleteDialog.tsx"]) {
      const source = readFileSync(resolve(process.cwd(), "src/ui/components", file), "utf8");
      expect(source, file).not.toMatch(/shadow-\[/);
      expect(source, file).not.toContain("--color-card-shadow");
      expect(source, file).not.toMatch(/rounded-\[(15|18)px\]/); // the old odd radii
    }
  });

  it("presses link rows with an opacity overlay, never color-mix (the build turns that into a solid fallback)", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles/style.css"), "utf8");
    expect(css).toMatch(/a\.settings-row::after \{[^}]*background: currentColor;[^}]*opacity: 0;/);
    expect(css).toMatch(/a\.settings-row:active::after \{ opacity: \.08; \}/);
    expect(css).not.toMatch(/color-mix\(/);
    for (const file of ["SettingsGroup.tsx", "SettingsPage.tsx", "ReceiptsList.tsx", "ReceiptDetail.tsx", "DeleteDialog.tsx"]) {
      expect(readFileSync(resolve(process.cwd(), "src/ui/components", file), "utf8"), file).not.toContain("color-mix");
    }
  });
});

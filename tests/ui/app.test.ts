import { act } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppStateV2, Item } from "../../src/domain/types";
import { version } from "../../package.json";
import { makeItem, makeList, makeReceipt, makeState, makeStorage, makeStore } from "../helpers/appState";
import { mountApp } from "../helpers/mountApp";

// jsdom has no <dialog>.showModal(), so give it a tiny stand-in.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

const rice: Item = makeItem({ id: "1", name: "Rice", qty: 2, price: 50, checked: false }); // 100 planned
const eggs: Item = makeItem({ id: "2", name: "Eggs", qty: 1, price: 30, checked: false }); // 30 planned
let unmount = () => {};

afterEach(() => {
  act(() => unmount());
  document.body.replaceChildren();
  window.location.hash = "";
});

beforeEach(() => localStorage.clear());

function setup({ state = makeState(), budget = null, hash = "#/" }: { state?: AppStateV2; budget?: number | null; hash?: string } = {}) {
  const test = makeStorage(state, budget);
  window.location.hash = hash;
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  act(() => { unmount = mountApp(root, test.storage); });
  const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
  const qa = <T extends Element>(sel: string) => [...root.querySelectorAll<T>(sel)];
  const click = <T extends HTMLElement>(sel: string) => act(() => q<T>(sel).click());
  const submit = (sel: string) => act(() => q(sel).dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  const type = (sel: string, value: string) => act(() => {
    const input = q<HTMLInputElement>(sel);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  return { root, q, qa, click, submit, type, ...test };
}

const stateWith = (items: Item[] = [rice, eggs], overrides: Partial<AppStateV2> = {}) =>
  makeState({ lists: [makeList("My list", items)], activeListId: "list-1", ...overrides });

describe("Home", () => {
  it("offers a clear first step when there are no lists", () => {
    const { q, click } = setup();
    expect(q("#home-page")).not.toBeNull();
    expect(q("#home-budget-amount").textContent).toBe("No limit");
    expect(q("#home-page").textContent).toContain("No lists yet");
    click("#home-create-first-list");
    expect(q<HTMLDialogElement>("#list-dialog").open).toBe(true);
  });

  it("creates the first list from the dialog and opens it", () => {
    const { q, click, type, submit, saved } = setup();
    click("#home-create-first-list");
    type("#list-name", "Weekly shop");
    submit("#list-dialog form");

    expect(q("#list-detail-page")).not.toBeNull();
    expect(q("#list-detail-title").textContent).toBe("Weekly shop");
    expect(q("#list-detail-store").textContent).toBe("No store");
    expect(saved().lists.map((list) => list.name)).toEqual(["Weekly shop"]);
    expect(window.location.hash).toContain("#/lists/");
  });

  it("summarizes today's budget from receipts plus the active cart", () => {
    const today = new Date().toISOString();
    const state = stateWith([{ ...rice, checked: true }, eggs], {
      receipts: [makeReceipt({ id: "r1", finishedAt: today, total: 50 })],
    });
    const { q } = setup({ state, budget: 500 });
    expect(q("#home-budget-amount").textContent).toBe("PHP\u00a0350");
    expect(q("#home-page").textContent).toContain("left of PHP\u00a0500");
    expect(q("#home-page").textContent).toContain("Spent PHP\u00a0150");
    expect(q("#home-page").textContent).toContain("30% used");
    expect(q("[role=progressbar]").getAttribute("aria-valuenow")).toBe("30");
  });

  it("flags an over-budget day and caps the progress bar at 100%", () => {
    const { q } = setup({ state: stateWith([{ ...rice, checked: true }]), budget: 50 });
    expect(q("#home-budget-amount").textContent).toBe("PHP\u00a050");
    expect(q("#home-budget-amount").className).toContain("is-over");
    expect(q("#home-page").textContent).toContain("over of PHP\u00a050");
    expect(q("[role=progressbar]").getAttribute("aria-valuenow")).toBe("100");
  });

  it("opens the budget sheet from the whole budget card", () => {
    const { q, click } = setup({ budget: 100 });
    click("#home-budget-card");
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(true);
  });

  it("offers the list with work in progress, and opens it", () => {
    const { q, click } = setup({ state: stateWith([{ ...rice, checked: true }, eggs]) });
    const card = q("section[aria-label='Current shopping list']");
    expect(card.textContent).toContain("My list");
    expect(card.textContent).toContain("1 of 2 in cart");
    expect(card.querySelector("[role=progressbar]")!.getAttribute("aria-valuenow")).toBe("50");
    click(".active-list button");
    expect(q("#list-detail-page")).not.toBeNull();
  });

  it("shows recent receipts and opens one", () => {
    const receipt = makeReceipt({ id: "r1", storeName: "Market", finishedAt: "2026-11-20T10:00:00.000Z" });
    const { q, click } = setup({ state: makeState({ receipts: [receipt] }) });
    expect(q("#home-recent-receipts").textContent).toContain("Market");
    expect(q("#home-recent-receipts").textContent).toContain("PHP\u00a0100");
    click("#home-recent-receipts button");
    expect(q("#receipt-detail-page")).not.toBeNull();
    expect(q("#receipt-total").textContent).toBe("PHP\u00a0100");
  });

  it("goes to History from See all", () => {
    const { q, click } = setup({ state: makeState({ receipts: [makeReceipt()] }) });
    click("#home-see-all-receipts");
    expect(q("#history-page")).not.toBeNull();
  });

  it("repeats a trip from a receipt", () => {
    const { q, click, saved } = setup({ state: makeState({ receipts: [makeReceipt({ id: "r1", listName: "Weekly" })] }) });
    click("#home-repeat-trip");
    expect(q<HTMLDialogElement>("#repeat-trip-dialog").open).toBe(true);
    click("#repeat-receipt-r1");
    expect(q("#list-detail-title").textContent).toBe("Repeat of Weekly");
    expect(saved().lists[0].items[0]).toMatchObject({ name: "Rice", checked: false });
  });
});

describe("Lists", () => {
  const state = () => makeState({
    lists: [
      makeList("Market run", [rice], { id: "market-list", storeId: "market" }),
      makeList("Bakery run", [], { id: "bakery-list", storeId: "bakery" }),
      makeList("Loose list", [eggs], { id: "loose" }),
    ],
    stores: [makeStore({ id: "market", name: "Market" }), makeStore({ id: "bakery", name: "Bakery", color: "#c08819" })],
    activeListId: "market-list",
  });

  it("groups lists by store and shows their totals and progress", () => {
    const { q, qa } = setup({ state: state(), hash: "#/lists" });
    expect(q("#lists-page")).not.toBeNull();
    const groups = qa(".store-group");
    expect(groups[0].textContent).toContain("Market");
    expect(groups[0].textContent).toContain("Market run");
    expect(groups[0].textContent).toContain("PHP\u00a0100");
    expect(groups[1].textContent).toContain("Bakery run");
    expect(groups[2].textContent).toContain("No store");
    expect(groups[2].textContent).toContain("Loose list");
  });

  it("opens a list card", () => {
    const { q, click } = setup({ state: state(), hash: "#/lists" });
    click(".list-open");
    expect(q("#list-detail-title").textContent).toBe("Market run");
  });

  it("creates a list from the Lists page", () => {
    const { q, click, type, submit } = setup({ hash: "#/lists" });
    click("#new-list");
    type("#list-name", "Monthly shop");
    submit("#list-dialog form");
    expect(q("#list-detail-title").textContent).toBe("Monthly shop");
  });

  it("renames, duplicates, archives, restores and deletes a list from its options", () => {
    const { q, qa, click, type, submit, saved } = setup({ state: state(), hash: "#/lists" });

    click(".list-options");
    expect(q<HTMLDialogElement>("#list-actions-dialog").open).toBe(true);
    click("#list-action-rename");
    type("#list-name", "Renamed");
    submit("#list-dialog form");
    expect(q("#lists-page").textContent).toContain("Renamed");

    click(".list-options");
    click("#list-action-duplicate");
    expect(q("#list-detail-title").textContent).toBe("Renamed copy");
    expect(saved().lists).toHaveLength(4);

    window.location.hash = "#/lists";
    act(() => { window.dispatchEvent(new HashChangeEvent("hashchange")); });
    const archivedName = q(".list-name").textContent;
    click(".list-options");
    click("#list-action-archive");
    expect(q("#lists-page").textContent).toContain("Archived");
    expect(q("#lists-page").textContent).toContain(archivedName);

    const archivedCard = qa(".list-card.archived")[0];
    act(() => archivedCard.querySelector<HTMLButtonElement>(".list-open")!.click());
    expect(q<HTMLDialogElement>("#list-actions-dialog").open).toBe(true);
    click("#list-action-restore");
    expect(qa(".list-card.archived")).toHaveLength(0);

    click(".list-options");
    click("#list-action-delete");
    expect(q<HTMLDialogElement>("#list-confirm-delete-dialog").open).toBe(true);
    click("#list-confirm-delete");
    expect(q("#lists-page")).not.toBeNull();
  });

  it("manages stores: add, recolor, rename and delete", () => {
    const { q, click, type, submit, saved } = setup({ state: state(), hash: "#/lists" });
    click("#open-store-manager");
    expect(q<HTMLDialogElement>("#store-manager").open).toBe(true);

    type("#new-store-name", "Corner shop");
    submit(".add-store-row");
    expect(saved().stores.map((store) => store.name)).toContain("Corner shop");

    const store = saved().stores.find((entry) => entry.name === "Corner shop")!;
    click(`#store-color-${store.id}-c08819`);
    expect(saved().stores.find((entry) => entry.id === store.id)?.color).toBe("#c08819");

    act(() => {
      const input = q<HTMLInputElement>(`#store-name-${store.id}`);
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "Corner store");
      input.focus();
      input.blur();
    });
    expect(saved().stores.find((entry) => entry.id === store.id)?.name).toBe("Corner store");

    click(`#store-delete-${store.id}`);
    expect(saved().stores.map((entry) => entry.id)).not.toContain(store.id);
  });
});

describe("List detail", () => {
  const detail = (items: Item[] = [rice, eggs], overrides: Partial<AppStateV2> = {}) =>
    setup({ state: stateWith(items, overrides), hash: "#/lists/list-1" });

  it("shows the list name, store, totals and progress", () => {
    const { q } = setup({
      state: makeState({ lists: [makeList("Weekly", [rice, eggs], { storeId: "s1" })], stores: [makeStore({ id: "s1", name: "Market" })], activeListId: "list-1" }),
      hash: "#/lists/list-1",
    });
    expect(q("#list-detail-title").textContent).toBe("Weekly");
    expect(q("#list-detail-store").textContent).toBe("Market");
    expect(q("#cart-card strong").textContent).toBe("PHP\u00a00");
    expect(q(".totals .total-card:nth-child(2) strong").textContent).toBe("PHP\u00a0130");
    expect(q("#item-count").textContent).toBe("0 / 2");
    expect(q("#item-count").getAttribute("aria-label")).toBe("0 of 2 items in cart");
  });

  it("adds an item and saves it", () => {
    const { q, submit, saved } = detail([]);
    expect(q<HTMLElement>("#empty-state")!.hidden).toBe(false);
    q<HTMLInputElement>("#new-name").value = "Soap";
    submit("#add-form");
    expect(q("#list").textContent).toContain("Soap");
    expect(saved().lists[0].items.map((item) => item.name)).toEqual(["Soap"]);
  });

  it("moves the cart total when an item is checked and updates the tabs", () => {
    const { q, click } = detail();
    click<HTMLInputElement>("li input[type=checkbox]:not(.select-item)");
    expect(q("#cart-card strong").textContent).toBe("PHP\u00a0100");
    expect(q("#cart-tab").textContent).toContain("In cart 1");
    expect(q("#needed-tab").textContent).toContain("Still needed 1");
    expect(q("#item-count").textContent).toBe("1 / 2");
    expect(q("[role=progressbar]").getAttribute("aria-valuenow")).toBe("1");
    expect(q("#list").textContent).not.toContain("Rice");
  });

  it("filters the tabs and shows a tab-specific empty state", () => {
    const { q, click } = detail();
    click("#check-all");
    expect(q("#needed-tab").textContent).toContain("Still needed 0");
    expect(q("#empty-state").textContent).toBe("Everything is in your cart.");
    click("#cart-tab");
    expect(q("#list").textContent).toContain("Rice");
    expect(q("#list").textContent).toContain("Eggs");
    expect(q("#finish-trip")).not.toBeNull();
  });

  it("says why the list is empty on both tabs", () => {
    const none = detail([]);
    expect(none.q("#empty-state").textContent).toBe("Your list is empty.");
    none.click("#cart-tab");
    expect(none.q("#empty-state").textContent).toBe("Your list is empty.");

    const some = detail([rice]);
    some.click("#cart-tab");
    expect(some.q("#empty-state").textContent).toBe("No items in your cart yet.");
  });

  it("edits quantity and price without leaving the row", () => {
    const { q, click, type } = detail([eggs]);
    click('[aria-label="Increase quantity of Eggs"]');
    expect(q<HTMLInputElement>(".qty").value).toBe("2");
    expect(q(".item-subtotal").textContent).toContain("PHP\u00a060");

    click('[aria-label="Decrease quantity of Eggs"]');
    click('[aria-label="Decrease quantity of Eggs"]');
    expect(q<HTMLInputElement>(".qty").value).toBe("0");
    expect(q(".item-subtotal").textContent).toContain("PHP\u00a00");

    type(".price", "12.5");
    expect(q(".item-subtotal").textContent).toContain("PHP\u00a00"); // qty is still 0
  });

  it("keeps typed quantity edits and uses a numeric keypad", () => {
    const { q, type } = detail([eggs]);
    type(".qty", "3");
    expect(q<HTMLInputElement>(".qty").value).toBe("3");
    expect(q(".item-subtotal").textContent).toContain("PHP\u00a090");
    expect(q<HTMLInputElement>(".qty").inputMode).toBe("numeric");
    expect(q<HTMLInputElement>(".price").inputMode).toBe("decimal");
    expect(q(".price").className).toContain("text-right");
  });

  it("deletes immediately with the x button and offers Undo", () => {
    const { q, click } = detail();
    click('.del[aria-label="Delete Rice"]');
    expect(q("#list").textContent).not.toContain("Rice");
    expect(q<HTMLElement>("#undo-banner")!.hidden).toBe(false);
    expect(q("#undo-message").textContent).toBe("Rice deleted.");
    click("#undo-delete");
    expect(q("#list").textContent).toContain("Rice");
    expect(q<HTMLElement>("#undo-banner")!.hidden).toBe(true);
  });

  it("asks before deleting from the swipe action", () => {
    const { q, click } = detail();
    act(() => q<HTMLButtonElement>('.swipe-delete[aria-label="Delete Rice"]').click());
    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(true);
    expect(q("#delete-confirm-message").textContent).toContain("Rice");
    click("#confirm-delete");
    expect(q("#list").textContent).not.toContain("Rice");
  });

  it("selects all visible items for bulk deletion", () => {
    const { q, click } = detail();
    click("#toggle-select");
    click("#select-all");
    click("#delete-selected");
    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(true);
    click("#confirm-delete");
    expect(q("#list").textContent).not.toContain("Rice");
    expect(q<HTMLElement>("#bulk-actions")!.hidden).toBe(true);
    expect(q("#toggle-select").textContent).toBe("Select");
  });

  it("finishes a trip, resets the list, and shows the receipt in History", () => {
    const { q, click, saved } = detail([{ ...rice, checked: true }, eggs], {});
    expect(document.querySelector("#finish-trip")).toBeNull(); // only on the In cart tab
    click("#cart-tab");
    expect(q("#finish-trip").textContent).toContain("PHP\u00a0100");
    click("#finish-trip");

    expect(saved().receipts).toHaveLength(1);
    expect(saved().receipts[0]).toMatchObject({ total: 100, listName: "My list", lines: [{ name: "Rice", qty: 2, price: 50 }] });
    expect(q("#cart-card strong").textContent).toBe("PHP\u00a00");
    expect(q<HTMLElement>("#notice-banner")!.hidden).toBe(false);
    expect(q("#notice-message").textContent).toContain("Receipt saved");
    expect(q("#needed-tab").getAttribute("aria-selected")).toBe("true");

    click("#nav-history");
    expect(q("#history-page")).not.toBeNull();
    expect(q("#receipts-list").textContent).toContain("My list");
    click("#receipts-list button");
    expect(q("#receipt-detail").textContent).toContain("Rice");
    expect(q("#receipt-detail").textContent).not.toContain("Eggs");
    expect(q("#receipt-total").textContent).toContain("PHP\u00a0100");
  });

  it("disables Finish trip while the cart is empty", () => {
    const { q, click } = detail([rice]);
    click("#cart-tab");
    expect(q<HTMLButtonElement>("#finish-trip").disabled).toBe(true);
    expect(q("#finish-trip").textContent).toBe("Finish trip");
  });

  it("keeps Finish trip and the add bar outside the scrolling list", () => {
    const { q, click } = detail([{ ...rice, checked: true }, eggs]);
    click("#cart-tab");
    expect(q("#list-detail-page main").contains(q("#finish-trip"))).toBe(false);
    expect(q("#list-detail-page main").contains(q("#add-form"))).toBe(false);
    expect(q(".detail-bottom").contains(q("#finish-trip"))).toBe(true);
    expect(q(".detail-bottom").contains(q("#add-form"))).toBe(true);
  });

  it("lays out each row as checkbox, name and line total, labeled editors, then remove", () => {
    const { q } = detail([rice]);
    const li = q("#list li");
    expect(li.querySelector(".item-title-row .name")!.textContent).toBe("Rice");
    expect(li.querySelector(".item-title-row .item-subtotal")!.textContent).toBe("Line totalPHP\u00a0100");
    const editors = li.querySelector(".item-details-row")!;
    expect(editors.textContent).toContain("Quantity");
    expect(editors.textContent).toContain("Unit price · PHP");
    expect(editors.querySelector(".quantity-control .qty")).not.toBeNull();
    expect(editors.querySelector(".price")).not.toBeNull();
    expect(editors.lastElementChild).toBe(editors.querySelector(".del"));
  });

  it("gives every row control a 48dp target", () => {
    const { q, qa } = detail([rice]);
    expect(q(".item-check").closest("label")!.className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q(".quantity-control").className).toContain("w-[144px]");
    expect(q(".quantity-control").className).toContain("h-[48px]");
    for (const step of qa(".qty-step")) expect(step.className).toContain("h-[48px] w-[48px]");
    expect(q(".qty").className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q(".del").className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q("#check-all").closest("label")!.className).toMatch(/(^|\s)tap(\s|$)/);
    expect(q("#toggle-select").className).toMatch(/(^|\s)tap(\s|$)/);
  });

  it("puts the rows in one card with dividers and strikes through checked names only", () => {
    const { q, click } = detail([{ ...rice, checked: true }]);
    expect(q("#list").className).toContain("item-list");
    click("#cart-tab");
    expect(q("#list li").className).toContain("done");
    expect(q(".name").className).toContain("line-through");
    expect(q(".item-details-row").outerHTML).not.toMatch(/line-through|opacity/);
  });

  it("shows the budget row and opens the sheet from it", () => {
    const { q, click } = setup({ state: stateWith([{ ...rice, checked: true }]), budget: 500, hash: "#/lists/list-1" });
    expect(q("#budget-row").textContent).toContain("PHP\u00a0500");
    expect(q("#budget-status").textContent).toBe("PHP\u00a0400 left");
    click("#budget-row");
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(true);
  });
});

describe("Settings and routing", () => {
  it("navigates with the bottom bar and marks the current tab", () => {
    const { q, click } = setup();
    expect(q("#nav-home").getAttribute("aria-current")).toBe("page");
    click("#nav-lists");
    expect(q("#lists-page")).not.toBeNull();
    expect(q("#nav-lists").getAttribute("aria-current")).toBe("page");
    click("#nav-history");
    expect(q("#history-page")).not.toBeNull();
    click("#nav-settings");
    expect(q("#settings-page")).not.toBeNull();
    expect(q("#nav-settings").getAttribute("aria-current")).toBe("page");
  });

  it("shows only Currency and About in Settings", () => {
    const { q, click } = setup();
    click("#nav-settings");
    expect(q("#settings-home").textContent).toContain("Currency");
    expect(q("#settings-home").textContent).toContain("About");
    expect(q("#open-receipts")).toBeNull();
    expect(q("#currency-value").textContent).toBe("PHP");
  });

  it("opens About, shows the version and links to the release", () => {
    const { q, click } = setup();
    click("#nav-settings");
    click("#open-about");
    expect(q("#settings-title").textContent).toBe("About");
    expect(q("#about-page").textContent).toContain(`v${version}`);
    expect(q<HTMLAnchorElement>("#about-page a").href).toBe(`https://github.com/JohnlyndelCastillo/grocery-android-app/releases#release-v${version}`);
    click("#close-settings");
    expect(q("#settings-title").textContent).toBe("Settings");
    click("#close-settings");
    expect(q("#home-page")).not.toBeNull();
  });

  it("returns to Home from Settings with Back", () => {
    const { q, click } = setup({ hash: "#/settings" });
    click("#close-settings");
    expect(q("#home-page")).not.toBeNull();
  });

  it("redirects an unknown list to Lists with a notice", () => {
    const { q } = setup({ hash: "#/lists/missing" });
    expect(q("#lists-page")).not.toBeNull();
    expect(q<HTMLElement>("#notice-banner")!.hidden).toBe(false);
    expect(q("#notice-message").textContent).toContain("couldn’t be found");
  });

  it("redirects an unknown receipt to History with a notice", () => {
    const { q } = setup({ hash: "#/history/missing" });
    expect(q("#history-page")).not.toBeNull();
    expect(q("#notice-message").textContent).toContain("couldn’t be found");
  });

  it("supports a deep link straight to a list", () => {
    const { q } = setup({ state: stateWith(), hash: "#/lists/list-1" });
    expect(q("#list-detail-page")).not.toBeNull();
    expect(q("#list-detail-title").textContent).toBe("My list");
  });

  it("keeps the add form and tabs accessible at the designed sizes", () => {
    const { q } = setup({ state: stateWith(), hash: "#/lists/list-1" });
    expect(q<HTMLInputElement>("#new-name").placeholder).toBe("Add an item");
    expect(q("#add-form button").textContent?.trim()).toBe("Add");
    expect(q("#add-form button svg")).not.toBeNull();
    expect(q("#needed-tab").textContent).toBe("Still needed 2");
    expect(q("#cart-tab").textContent).toBe("In cart 0");
    expect(q("#needed-tab span.rounded-full")).toBeNull();
  });
});

describe("History", () => {
  const receipts = [
    makeReceipt({ id: "r1", storeName: "Market", finishedAt: "2026-11-20T10:00:00.000Z", total: 250, budget: 500, lines: [{ name: "Rice", qty: 2, price: 50 }, { name: "Milk", qty: 1, price: 150 }] }),
    makeReceipt({ id: "r2", listName: "Bakery run", finishedAt: "2026-11-02T10:00:00.000Z", total: 100 }),
    makeReceipt({ id: "r3", finishedAt: "2026-10-15T10:00:00.000Z", total: 75 }),
  ];

  it("groups receipts by month with a monthly summary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 22, 12, 0, 0));
    try {
      const { q } = setup({ state: makeState({ receipts }), hash: "#/history" });
      expect(q("#history-page").textContent).toContain("History");
      expect(q("#receipts-list").textContent).toContain("Market");
      expect(q("#receipts-list").textContent).toContain("Bakery run");
      expect(q("#history-page").textContent).toContain("2 trips");
      expect(q("#history-page").textContent).toContain("PHP\u00a0350");
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows an empty state with a way to start", () => {
    const { q, click } = setup({ hash: "#/history" });
    expect(q("#receipts-empty").textContent).toBe("No receipts yet.");
    click("#history-page .new-list");
    expect(q("#lists-page")).not.toBeNull();
  });

  it("opens a receipt and shows its lines and budget comparison", () => {
    const { q, click } = setup({ state: makeState({ receipts }), hash: "#/history" });
    click("#receipts-list button");
    expect(q("#receipt-detail-page")).not.toBeNull();
    expect(q("#receipt-total").textContent).toBe("PHP\u00a0250");
    expect(q("#receipt-detail").textContent).toContain("2 × PHP\u00a050");
    expect(q("#receipt-budget").textContent).toContain("PHP\u00a0500");
    expect(q("#receipt-budget").textContent).toContain("PHP\u00a0250");
  });

  it("deletes a receipt only after confirming", () => {
    const { q, click, saved } = setup({ state: makeState({ receipts }), hash: "#/history" });
    click("#receipts-list button");
    click("#delete-receipt");
    expect(q<HTMLDialogElement>("#receipt-confirm-delete-dialog").open).toBe(true);
    click("#receipt-cancel-delete");
    expect(q("#receipt-detail")).not.toBeNull();
    expect(saved().receipts).toHaveLength(3);

    click("#delete-receipt");
    click("#receipt-confirm-delete");
    expect(saved().receipts.map((receipt) => receipt.id)).not.toContain("r1");
    expect(q("#history-page")).not.toBeNull();
  });
});

import { act, useState } from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item, Receipt } from "../../src/domain/types";
import type { GroceryStorage } from "../../src/storage/storage";
import { useBackButton } from "../../src/ui/hooks/useBackButton";
import { mountApp } from "../helpers/mountApp";
import { renderHook } from "../helpers/renderHook";

// A stand-in for the Capacitor App plugin that remembers which listeners are still registered.
const plugin = vi.hoisted(() => ({
  listeners: [] as { callback: () => void; removed: boolean }[],
  addListener: vi.fn(),
  minimizeApp: vi.fn(),
}));
vi.mock("@capacitor/app", () => ({ App: { addListener: plugin.addListener, minimizeApp: plugin.minimizeApp } }));

const active = () => plugin.listeners.filter((l) => !l.removed);
/** Press the system Back button: every listener that is still registered is told. */
const pressBack = () => act(() => { for (const l of active()) l.callback(); });
const registered = () => vi.waitFor(() => expect(active()).toHaveLength(1));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

beforeEach(() => {
  plugin.listeners.length = 0;
  plugin.addListener.mockReset().mockImplementation(async (_event: string, callback: () => void) => {
    const entry = { callback, removed: false };
    plugin.listeners.push(entry);
    return { remove: async () => { entry.removed = true; } };
  });
  plugin.minimizeApp.mockReset().mockResolvedValue(undefined);
  localStorage.clear();
});

describe("useBackButton", () => {
  it("registers one backButton listener and removes it when unmounted", async () => {
    const { unmount } = renderHook(() => useBackButton(() => true));
    await registered();
    expect(plugin.addListener).toHaveBeenCalledWith("backButton", expect.any(Function));
    unmount();
    await vi.waitFor(() => expect(active()).toHaveLength(0));
  });

  it("does nothing more when the press was handled, and sends the app to the background when it was not", async () => {
    let handled = true;
    const { unmount } = renderHook(() => useBackButton(() => handled));
    await registered();
    pressBack();
    expect(plugin.minimizeApp).not.toHaveBeenCalled();
    handled = false;
    pressBack();
    expect(plugin.minimizeApp).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("always uses the handler from the latest render, never a stale one", async () => {
    const seen: number[] = [];
    let bump: (n: number) => void = () => {};
    const { unmount } = renderHook(() => {
      const [count, setCount] = useState(0);
      bump = setCount;
      useBackButton(() => { seen.push(count); return true; });
    });
    await registered();
    act(() => bump(7));
    pressBack();
    expect(seen).toEqual([7]);
    expect(plugin.addListener).toHaveBeenCalledTimes(1); // re-rendering does not re-register
    unmount();
  });

  it("stays quiet when the native bridge is missing, as in an ordinary browser", async () => {
    plugin.addListener.mockReset().mockRejectedValue(new Error("not implemented on web"));
    const { unmount } = renderHook(() => useBackButton(() => false));
    await vi.waitFor(() => expect(plugin.addListener).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });
    unmount(); // no throw, no unhandled rejection
  });

  it("ignores a failure to minimize (not running on Android)", async () => {
    plugin.minimizeApp.mockReset().mockRejectedValue(new Error("unimplemented"));
    const { unmount } = renderHook(() => useBackButton(() => false));
    await registered();
    pressBack();
    await act(async () => { await Promise.resolve(); });
    expect(plugin.minimizeApp).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe("Back button in the app", () => {
  const rice: Item = { id: "1", name: "Rice", qty: 2, price: 50, checked: false };
  const trip: Receipt = { id: "r1", finishedAt: "2026-11-01T14:12:00.000Z", currency: "PHP", lines: [{ name: "test 1", qty: 1, price: 100 }], total: 100, budget: 500 };
  let unmount = () => {};

  afterEach(() => {
    act(() => unmount());
    document.body.replaceChildren();
  });

  async function setup() {
    const storage: GroceryStorage = {
      loadItems: () => [rice],
      saveItems: vi.fn(),
      loadDailyBudget: () => null,
      saveDailyBudget: vi.fn(),
      loadReceipts: () => [trip],
      saveReceipts: vi.fn(),
    };
    const root = document.createElement("div");
    document.body.replaceChildren(root);
    act(() => { unmount = mountApp(root, storage); });
    await registered(); // StrictMode mounts twice; only the last listener is left
    const q = <T extends Element>(sel: string) => root.querySelector<T>(sel)!;
    const click = <T extends HTMLElement>(sel: string) => act(() => q<T>(sel).click());
    return { q, click };
  }

  it("goes up one screen at a time in Settings: Receipt, Receipts, Settings, Home, then leaves the app", async () => {
    const { q, click } = await setup();
    click("#open-settings");
    click("#open-receipts");
    click("#receipts-list button");
    expect(q("#settings-title").textContent).toBe("Receipt");

    pressBack();
    expect(q("#settings-title").textContent).toBe("Receipts");
    pressBack();
    expect(q("#settings-title").textContent).toBe("Settings");
    pressBack();
    expect(q<HTMLElement>("#home-page").hidden).toBe(false);
    expect(q<HTMLElement>("#settings-page").hidden).toBe(true);
    expect(plugin.minimizeApp).not.toHaveBeenCalled();

    pressBack(); // nothing left to go back to
    expect(plugin.minimizeApp).toHaveBeenCalledTimes(1);
  });

  it("goes back from Currency and About to Settings", async () => {
    const { q, click } = await setup();
    click("#open-settings");
    click("#open-currency");
    pressBack();
    expect(q("#settings-title").textContent).toBe("Settings");
    click("#open-about");
    pressBack();
    expect(q("#settings-title").textContent).toBe("Settings");
    expect(plugin.minimizeApp).not.toHaveBeenCalled();
  });

  it("closes the budget sheet first, without leaving the screen", async () => {
    const { q, click } = await setup();
    click("#budget-row");
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(true);
    pressBack();
    expect(q<HTMLDialogElement>("#budget-sheet").open).toBe(false);
    expect(plugin.minimizeApp).not.toHaveBeenCalled();
  });

  it("closes the item delete confirmation, keeping the item", async () => {
    const { q, click } = await setup();
    click(".swipe-delete"); // the × button deletes at once with Undo; swipe-delete asks first
    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(true);
    pressBack();
    expect(q<HTMLDialogElement>("#confirm-delete-dialog").open).toBe(false);
    expect(q(".name").textContent).toBe("Rice");
    expect(plugin.minimizeApp).not.toHaveBeenCalled();
  });

  it("closes the receipt delete confirmation first, staying on that receipt", async () => {
    const { q, click } = await setup();
    click("#open-settings");
    click("#open-receipts");
    click("#receipts-list button");
    click("#delete-receipt");
    expect(q<HTMLDialogElement>("#receipt-confirm-delete-dialog").open).toBe(true);
    pressBack();
    expect(q<HTMLDialogElement>("#receipt-confirm-delete-dialog").open).toBe(false);
    expect(q("#settings-title").textContent).toBe("Receipt");
    expect(q("#receipt-detail")).not.toBeNull();
  });

  it("leaves select mode before leaving the app", async () => {
    const { q, click } = await setup();
    click("#toggle-select");
    expect(q("#toggle-select").textContent).toBe("Cancel");
    pressBack();
    expect(q("#toggle-select").textContent).toBe("Select");
    expect(plugin.minimizeApp).not.toHaveBeenCalled();
    pressBack();
    expect(plugin.minimizeApp).toHaveBeenCalledTimes(1);
  });

  it("closes Settings before it leaves select mode", async () => {
    const { q, click } = await setup();
    click("#toggle-select");
    click("#open-settings");
    pressBack(); // Settings -> Home, still selecting
    expect(q<HTMLElement>("#home-page").hidden).toBe(false);
    expect(q("#toggle-select").textContent).toBe("Cancel");
    pressBack(); // now select mode ends
    expect(q("#toggle-select").textContent).toBe("Select");
    expect(plugin.minimizeApp).not.toHaveBeenCalled();
  });

  it("registers exactly one listener even though StrictMode mounts the app twice", async () => {
    await setup();
    expect(active()).toHaveLength(1);
  });
});

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COMPACT_AT, EXPAND_AT, useCompactHeader } from "../../src/ui/hooks/useCompactHeader";
import { renderHook } from "../helpers/renderHook";

// jsdom has no layout, so build a scroller whose size and position we control.
function fakeScroller(size = { scrollHeight: 2000, clientHeight: 500 }) {
  const state = { top: 0, ...size };
  const el = document.createElement("div");
  Object.defineProperties(el, {
    scrollTop: { get: () => state.top, set: (v: number) => { state.top = v; }, configurable: true },
    scrollHeight: { get: () => state.scrollHeight, configurable: true },
    clientHeight: { get: () => state.clientHeight, configurable: true },
  });
  const scrollTo = (top: number) => {
    state.top = top;
    act(() => { el.dispatchEvent(new Event("scroll")); });
  };
  return { el, state, scrollTo };
}

const SAVED = 100; // pretend compacting gives back 100px of header

afterEach(() => vi.unstubAllGlobals());

describe("useCompactHeader", () => {
  it("starts expanded", () => {
    const { el } = fakeScroller();
    const { result } = renderHook(() => useCompactHeader({ current: el }, () => SAVED));
    expect(result.current).toBe(false);
  });

  it("compacts after COMPACT_AT and only expands again below EXPAND_AT", () => {
    const { el, scrollTo } = fakeScroller();
    const { result } = renderHook(() => useCompactHeader({ current: el }, () => SAVED));

    scrollTo(COMPACT_AT); // exactly at the threshold is not past it
    expect(result.current).toBe(false);
    scrollTo(COMPACT_AT + 1);
    expect(result.current).toBe(true);

    // hysteresis: scrolling back up through the middle must not flip it
    scrollTo(30);
    expect(result.current).toBe(true);
    scrollTo(EXPAND_AT);
    expect(result.current).toBe(true);
    scrollTo(EXPAND_AT - 1);
    expect(result.current).toBe(false);

    // and it doesn't come back until the user scrolls past COMPACT_AT again
    scrollTo(30);
    expect(result.current).toBe(false);
  });

  it("stays expanded when the page would barely scroll once the header shrinks", () => {
    // Compacting gives back SAVED px, so it needs more than SAVED + COMPACT_AT of overflow, otherwise
    // shrinking the header would push scrollTop back under EXPAND_AT and flip it straight back.
    const needed = SAVED + COMPACT_AT;
    const { el, scrollTo, state } = fakeScroller({ scrollHeight: 500 + needed, clientHeight: 500 });
    const { result } = renderHook(() => useCompactHeader({ current: el }, () => SAVED));

    scrollTo(60);
    expect(result.current).toBe(false); // overflow is exactly `needed`: not enough

    state.scrollHeight = 500 + needed + 1;
    scrollTo(61);
    expect(result.current).toBe(true);
  });

  it("re-checks when the scroller resizes, so deleting items can bring the header back", () => {
    const callbacks: Array<() => void> = [];
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: () => void) { callbacks.push(callback); }
      observe() {}
      disconnect() {}
    });
    const { el, state, scrollTo } = fakeScroller();
    const { result } = renderHook(() => useCompactHeader({ current: el }, () => SAVED));
    scrollTo(200);
    expect(result.current).toBe(true);

    // The list got short, so the browser clamps scrollTop to 0 without the user scrolling.
    state.top = 0;
    act(() => callbacks.forEach((callback) => callback()));
    expect(result.current).toBe(false);
  });

  it("removes its scroll listener on unmount", () => {
    const { el } = fakeScroller();
    const remove = vi.spyOn(el, "removeEventListener");
    const { unmount } = renderHook(() => useCompactHeader({ current: el }, () => SAVED));
    unmount();
    expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});

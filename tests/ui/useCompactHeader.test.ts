import { act } from "react";
import { describe, expect, it } from "vitest";
import { COMPACT_AT, EXPAND_AT, useCompactHeader } from "../../src/ui/hooks/useCompactHeader";
import { renderHook } from "../helpers/renderHook";

// jsdom has no layout, so build a scroller whose scroll position we control.
function fakeScroller() {
  const state = { top: 0 };
  const el = document.createElement("div");
  Object.defineProperty(el, "scrollTop", { get: () => state.top, set: (v: number) => { state.top = v; }, configurable: true });
  const scrollTo = (top: number) => {
    state.top = top;
    act(() => { el.dispatchEvent(new Event("scroll")); });
  };
  return { el, scrollTo };
}

describe("useCompactHeader", () => {
  it("starts expanded", () => {
    const { el } = fakeScroller();
    const { result } = renderHook(() => useCompactHeader({ current: el }));
    expect(result.current).toBe(false);
  });

  it("compacts once scrolled past COMPACT_AT and expands again at EXPAND_AT or below", () => {
    const { el, scrollTo } = fakeScroller();
    const { result } = renderHook(() => useCompactHeader({ current: el }));

    scrollTo(COMPACT_AT); // exactly at the threshold is not past it
    expect(result.current).toBe(false);
    scrollTo(COMPACT_AT + 1);
    expect(result.current).toBe(true);

    scrollTo(EXPAND_AT + 1); // in between: stays compact, so it can't flicker
    expect(result.current).toBe(true);
    scrollTo(EXPAND_AT);
    expect(result.current).toBe(false);

    scrollTo(EXPAND_AT + 1); // and it doesn't come back until the user scrolls past COMPACT_AT again
    expect(result.current).toBe(false);
  });

  it("does not depend on how long the page is, because the header never changes size", () => {
    // The old header shrank, which could shorten the page and push it back under the threshold.
    // Now only the scroll position matters, even on a page that barely scrolls.
    const { el, scrollTo } = fakeScroller();
    Object.defineProperties(el, {
      scrollHeight: { get: () => 520, configurable: true },
      clientHeight: { get: () => 500, configurable: true },
    });
    const { result } = renderHook(() => useCompactHeader({ current: el }));
    scrollTo(COMPACT_AT + 1);
    expect(result.current).toBe(true);
  });

  it("stops listening when unmounted", () => {
    const { el, scrollTo } = fakeScroller();
    const { result, unmount } = renderHook(() => useCompactHeader({ current: el }));
    unmount();
    scrollTo(100);
    expect(result.current).toBe(false);
  });

  it("does nothing when there is no scroller yet", () => {
    const { result } = renderHook(() => useCompactHeader({ current: null }));
    expect(result.current).toBe(false);
  });
});

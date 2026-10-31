import { useEffect, useRef, useState, type RefObject } from "react";

/** Scroll distance (px) past which the header compacts. */
export const COMPACT_AT = 48;
/** Scroll distance (px) below which it expands again. Lower than COMPACT_AT so it can't flicker at the threshold. */
export const EXPAND_AT = 8;

/**
 * Tells the header when to shrink into a compact bar, based on how far `scroller` has been scrolled.
 *
 * The header sits above the scroller, so shrinking it makes the scroller taller and shortens how far
 * it can scroll. Two rules stop that from toggling the header back and forth:
 *  - hysteresis: compact after COMPACT_AT, expand again only below EXPAND_AT;
 *  - the header only compacts when the page will still be scrollable past COMPACT_AT *after* it has
 *    shrunk, i.e. when the content overflows by more than `getHeightSaved()` (how much height the
 *    header gives back when compact).
 */
export function useCompactHeader(
  scrollerRef: RefObject<HTMLElement | null>,
  getHeightSaved: () => number,
): boolean {
  const [compact, setCompact] = useState(false);
  const compactRef = useRef(false);
  const heightSaved = useRef(getHeightSaved);
  useEffect(() => {
    heightSaved.current = getHeightSaved;
  });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const decide = (): boolean => {
      const top = scroller.scrollTop;
      if (compactRef.current) return top >= EXPAND_AT;
      if (top <= COMPACT_AT) return false;
      const overflow = scroller.scrollHeight - scroller.clientHeight;
      return overflow > heightSaved.current() + COMPACT_AT;
    };
    const update = (): void => {
      const next = decide();
      if (next === compactRef.current) return;
      compactRef.current = next;
      setCompact(next);
    };

    scroller.addEventListener("scroll", update, { passive: true });
    // Also re-check when the scroller changes size (list edited, keyboard opened, page shown again).
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(scroller);
    update();
    return () => {
      scroller.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [scrollerRef]);

  return compact;
}

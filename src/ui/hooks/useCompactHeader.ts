import { useEffect, useState, type RefObject } from "react";

/** Scroll distance (px) past which the compact bar takes over from the large header. */
export const COMPACT_AT = 8;
/** Scroll distance (px) at or below which the large header is shown again. Slightly lower, so it can't flicker. */
export const EXPAND_AT = 2;

/**
 * True once `scroller` has been scrolled a little. The header no longer changes size: the large header
 * scrolls away with the page and a fixed-height bar stays on top, so this only decides when the bar
 * fades in its title and cart total. Nothing is re-laid-out, so there is nothing to animate or flicker.
 */
export function useCompactHeader(scrollerRef: RefObject<HTMLElement | null>): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let current = false;
    const update = (): void => {
      const top = scroller.scrollTop;
      const next = current ? top > EXPAND_AT : top > COMPACT_AT;
      if (next === current) return;
      current = next;
      setCompact(next);
    };

    scroller.addEventListener("scroll", update, { passive: true });
    update();
    return () => scroller.removeEventListener("scroll", update);
  }, [scrollerRef]);

  return compact;
}

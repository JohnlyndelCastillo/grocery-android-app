import { useEffect, useRef, type RefObject } from "react";

interface SwipeOptions {
  disabled: boolean;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

// Swipe left / right on an element. The listeners are attached natively because React's own
// touchmove listener is passive, and a passive listener can't call preventDefault().
export function useSwipe(ref: RefObject<HTMLElement | null>, options: SwipeOptions): void {
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startX = 0;
    let startY = 0;
    let swiping = false;

    const onStart = (event: TouchEvent): void => {
      if (latest.current.disabled || event.touches.length !== 1) return;
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
      swiping = false;
    };
    const onMove = (event: TouchEvent): void => {
      if (latest.current.disabled || event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - startX;
      const dy = event.touches[0].clientY - startY;
      if (!swiping && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) swiping = true;
      if (swiping) event.preventDefault();
    };
    const onEnd = (event: TouchEvent): void => {
      if (latest.current.disabled || !swiping) return;
      const dx = event.changedTouches[0].clientX - startX;
      if (dx < -48) latest.current.onSwipeLeft();
      else if (dx > 48) latest.current.onSwipeRight();
      swiping = false;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [ref]);
}

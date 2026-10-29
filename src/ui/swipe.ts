// Swipe left to reveal Delete; swipe right or tap the row to hide it.
export function attachSwipe(row: HTMLElement, isDisabled: () => boolean): () => void {
  let startX = 0;
  let startY = 0;
  let swiping = false;

  function onTouchStart(event: TouchEvent) {
    if (isDisabled() || event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    swiping = false;
  }

  function onTouchMove(event: TouchEvent) {
    if (isDisabled() || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - startX;
    const dy = event.touches[0].clientY - startY;
    if (!swiping && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) swiping = true;
    if (swiping) event.preventDefault();
  }

  function onTouchEnd(event: TouchEvent) {
    if (isDisabled() || !swiping) return;
    const dx = event.changedTouches[0].clientX - startX;
    if (dx < -48) {
      row.parentElement?.querySelectorAll(".is-swiped").forEach((otherRow) => otherRow.classList.remove("is-swiped"));
      row.classList.add("is-swiped");
    } else if (dx > 48) {
      row.classList.remove("is-swiped");
    }
    swiping = false;
  }

  function onClick(event: MouseEvent) {
    if (!(event.target as HTMLElement).closest("button, input")) row.classList.remove("is-swiped");
  }

  row.addEventListener("touchstart", onTouchStart, { passive: true });
  row.addEventListener("touchmove", onTouchMove, { passive: false });
  row.addEventListener("touchend", onTouchEnd);
  row.addEventListener("click", onClick);

  return () => {
    row.removeEventListener("touchstart", onTouchStart);
    row.removeEventListener("touchmove", onTouchMove);
    row.removeEventListener("touchend", onTouchEnd);
    row.removeEventListener("click", onClick);
  };
}

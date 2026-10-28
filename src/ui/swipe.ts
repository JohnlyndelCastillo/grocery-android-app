// Swipe left to reveal the Delete button, swipe right (or tap the row) to hide it.
export function attachSwipe(li: HTMLElement, isDisabled: () => boolean): void {
  let startX = 0;
  let startY = 0;
  let swiping = false;

  li.addEventListener("touchstart", (event) => {
    if (isDisabled() || event.touches.length !== 1) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    swiping = false;
  }, { passive: true });

  li.addEventListener("touchmove", (event) => {
    if (isDisabled() || event.touches.length !== 1) return;
    const dx = event.touches[0].clientX - startX;
    const dy = event.touches[0].clientY - startY;
    if (!swiping && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) swiping = true;
    if (swiping) event.preventDefault();
  }, { passive: false });

  li.addEventListener("touchend", (event) => {
    if (isDisabled() || !swiping) return;
    const dx = event.changedTouches[0].clientX - startX;
    if (dx < -48) {
      li.parentElement?.querySelectorAll(".is-swiped").forEach((row) => row.classList.remove("is-swiped"));
      li.classList.add("is-swiped");
    } else if (dx > 48) {
      li.classList.remove("is-swiped");
    }
    swiping = false;
  });

  li.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("button, input")) return;
    li.classList.remove("is-swiped");
  });
}

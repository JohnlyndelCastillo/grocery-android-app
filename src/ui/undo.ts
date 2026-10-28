import type { Item } from "../domain/types";
import type { Elements } from "./elements";

const UNDO_MS = 6000;

// The "Item deleted. Undo" banner. It remembers what was just deleted
// and hands it back through `restore` if the user taps Undo.
export function createUndo(
  els: Pick<Elements, "undoBanner" | "undoMessage" | "undoDeleteBtn">,
  restore: (items: Item[]) => void,
) {
  let snapshot: Item[] | null = null;
  let timer = 0;

  function hide(): void {
    window.clearTimeout(timer);
    els.undoBanner.hidden = true;
    snapshot = null;
  }

  els.undoDeleteBtn.addEventListener("click", () => {
    const deleted = snapshot;
    if (!deleted) return;
    hide();
    restore(deleted);
  });

  return {
    show(deleted: Item[], message: string): void {
      snapshot = deleted;
      els.undoMessage.textContent = message;
      els.undoBanner.hidden = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(hide, UNDO_MS);
    },
  };
}

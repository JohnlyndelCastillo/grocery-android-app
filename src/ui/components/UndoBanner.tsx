import type { UndoAction } from "../types";

interface UndoBannerProps {
  undo: UndoAction | null;
  onUndo(): void;
}

export function UndoBanner({ undo, onUndo }: UndoBannerProps) {
  return (
    <div id="undo-banner" className="undo-banner fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] left-4 right-4 z-[5] mx-auto flex max-w-[584px] items-center justify-between rounded-[13px] bg-ink px-4 py-3 text-white shadow-[0_8px_28px_#0003]" role="status" aria-live="polite" hidden={!undo}>
      <span id="undo-message">{undo?.message ?? "Item deleted."}</span>
      <button className="rounded-lg bg-transparent px-[10px] py-[6px] font-bold text-[#d5f0b4]" id="undo-delete" type="button" onClick={onUndo}>Undo</button>
    </div>
  );
}

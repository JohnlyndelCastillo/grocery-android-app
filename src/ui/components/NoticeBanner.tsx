interface NoticeBannerProps {
  message: string | null;
  onDismiss(): void;
}

// A short confirmation, like "Receipt saved". Sits where the undo banner does.
export function NoticeBanner({ message, onDismiss }: NoticeBannerProps) {
  return (
    <div id="notice-banner" className="fixed bottom-[calc(16px+env(safe-area-inset-bottom,0px))] left-4 right-4 z-[25] mx-auto flex max-w-[584px] items-center justify-between rounded-[13px] bg-[var(--color-toast)] px-4 py-3 text-white shadow-[0_8px_28px_var(--color-black-20)]" role="status" aria-live="polite" hidden={!message}>
      <span id="notice-message">{message ?? ""}</span>
      <button className="rounded-lg bg-transparent px-[10px] py-[6px] font-bold text-[var(--color-action-accent)]" id="dismiss-notice" type="button" onClick={onDismiss}>OK</button>
    </div>
  );
}

import type { RefObject } from "react";
import { useCompactHeader } from "../hooks/useCompactHeader";

interface HeaderProps {
  cartTotal: string;
  overBudget: boolean;
  /** The page scroller the header lives in; it decides when the compact bar fades in. */
  scrollerRef: RefObject<HTMLElement | null>;
  onOpenSettings(): void;
}

const fade = "transition-opacity duration-150 motion-reduce:transition-none";

// Two pieces, and neither ever changes size:
//  - the large title scrolls away with the page;
//  - a fixed-height bar stays on top. At the top of the page it is transparent and only holds the Settings
//    button; once you scroll it fades in a canvas background, a hairline and "In your cart · PHP 0".
// Only opacity animates, so collapsing never causes layout work while you scroll.
export function Header({ cartTotal, overBudget, scrollerRef, onOpenSettings }: HeaderProps) {
  const compact = useCompactHeader(scrollerRef);

  return (
    <>
      <div id="app-bar" data-compact={compact} className="sticky top-0 z-20 -mx-[var(--gutter)] h-[var(--bar-h)] pt-[env(safe-area-inset-top,0px)] text-ink">
        <div
          aria-hidden="true"
          className={`absolute inset-0 border-b border-[var(--color-line)] bg-app ${fade} ${compact ? "opacity-100" : "opacity-0"}`}
        />
        <div className="relative flex h-full items-center gap-3 px-[var(--gutter)]">
          <p
            id="compact-summary"
            className={`num m-0 min-w-0 flex-1 truncate text-body font-semibold transition-[opacity,visibility] duration-150 motion-reduce:transition-none ${compact ? `visible opacity-100 ${overBudget ? "text-[var(--color-danger)]" : "text-ink"}` : "invisible opacity-0"}`}
            aria-hidden={!compact}
          >
            <span className="font-normal text-muted">In your cart · </span>
            {cartTotal}
            {overBudget && <span className="sr-only"> (over today's budget)</span>}
          </p>
          <button
            id="open-settings"
            className="settings-button tap ml-auto grid shrink-0 place-items-center rounded-xl bg-[var(--color-surface)] text-ink"
            type="button"
            aria-label="Open settings"
            onClick={onOpenSettings}
          >
            <svg className="size-[1.375rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.73v.51a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.51a2 2 0 0 1 1-1.73l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Sits under the bar, in the same 64px band as the Settings button. */}
      <header
        id="app-header"
        data-compact={compact}
        className="-mt-[var(--bar-h)] pb-2"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex min-h-16 items-center pr-14">
          <h1 className="m-0 text-title font-bold text-ink">Shopping list</h1>
        </div>
      </header>
    </>
  );
}

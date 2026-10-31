import type { RefObject } from "react";
import { useCompactHeader } from "../hooks/useCompactHeader";

interface HeaderProps {
  cartTotal: string;
  plannedTotal: string;
  overBudget: boolean;
  /** The page scroller the header lives in; it decides when the compact bar fades in. */
  scrollerRef: RefObject<HTMLElement | null>;
  onOpenSettings(): void;
}

const fade = "transition-opacity duration-150 motion-reduce:transition-none";

// Two pieces, neither of which ever changes size:
//  - the large header scrolls away with the page;
//  - a fixed-height bar sticks to the top and only fades its background, title and cart total in.
// Animating only opacity keeps the collapse on the GPU, so there is no layout work while scrolling.
export function Header({ cartTotal, plannedTotal, overBudget, scrollerRef, onOpenSettings }: HeaderProps) {
  const compact = useCompactHeader(scrollerRef);
  const gutter = "px-6 max-[380px]:px-[1.125rem]";

  return (
    <>
      <div id="app-bar" data-compact={compact} className="sticky top-0 z-20 -mx-[var(--gutter)] h-[var(--bar-h)] pt-[env(safe-area-inset-top,0px)] text-white">
        <div
          aria-hidden="true"
          className={`absolute inset-0 rounded-b-[20px] bg-[linear-gradient(90deg,var(--color-hero-start),var(--color-hero-end))] shadow-[0_8px_20px_var(--color-hero-shadow)] ${fade} ${compact ? "opacity-100" : "opacity-0"}`}
        />
        <div className={`relative flex h-full items-center gap-3 ${gutter}`}>
          <p aria-hidden="true" className={`m-0 shrink-0 text-[1.25rem] font-bold leading-[1.15] tracking-[-.03em] ${fade} ${compact ? "opacity-100" : "opacity-0"}`}>Grocery list</p>
          <p
            id="compact-summary"
            className={`m-0 ml-auto min-w-0 truncate text-[.92rem] font-bold transition-[opacity,visibility] duration-150 motion-reduce:transition-none ${compact ? `visible opacity-100 ${overBudget ? "text-[var(--color-over-budget-accent)]" : "text-white"}` : "invisible opacity-0"}`}
            aria-hidden={!compact}
          >
            <span className="font-medium opacity-80">In cart </span>
            {cartTotal}
            {overBudget && <span className="sr-only"> (over today's budget)</span>}
          </p>
          <button
            id="open-settings"
            className="settings-button grid size-11 shrink-0 place-items-center rounded-full bg-white/[.12] text-white focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            type="button"
            aria-label="Open settings"
            onClick={onOpenSettings}
          >
            <svg className="size-[1.3125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.73v.51a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.51a2 2 0 0 1 1-1.73l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          </svg>
          </button>
        </div>
      </div>

      <header
        id="app-header"
        data-compact={compact}
        className={`hero relative -mx-[var(--gutter)] -mt-[var(--bar-h)] overflow-hidden pb-6 text-white shadow-[0_12px_28px_var(--color-hero-shadow)] ${gutter}`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", borderRadius: "0 0 26px 26px" }}
      >
        <div className="relative z-[1] flex min-h-[3.75rem] items-center pr-14">
          <h1 className="m-0 text-[clamp(1.75rem,8vw,2rem)] font-bold leading-[1.15] tracking-[-.03em]">Grocery list</h1>
        </div>

        <div className="totals relative z-[1] mt-1 grid grid-cols-2 gap-[10px]" aria-label="Spending summary" aria-hidden={compact}>
          <div
            id="cart-card"
            className={`total-card flex min-w-0 flex-col gap-1 rounded-[14px] border px-[14px] py-3 ${overBudget ? "border-[var(--color-budget-border)] bg-[var(--color-budget-surface)] text-[var(--color-budget-ink)]" : "border-white bg-[var(--color-surface)] text-green-dark"}`}
            aria-label={`In your cart ${cartTotal}${overBudget ? ", over today's budget" : ""}`}
          >
            <span className={`text-[.75rem] font-medium ${overBudget ? "text-[var(--color-budget-warning)]" : "text-muted"}`}>In your cart</span>
            <strong className="whitespace-nowrap text-[clamp(1.1rem,5vw,1.4rem)] font-bold tracking-[-.035em]">{cartTotal}</strong>
          </div>
          <div className="total-card flex min-w-0 flex-col gap-1 rounded-[14px] border border-white/15 bg-white/[.07] px-[14px] py-3">
            <span className="text-[.75rem] font-medium text-[var(--color-hero-muted)]">Planned total</span>
            <strong className="whitespace-nowrap text-[clamp(1.1rem,5vw,1.4rem)] font-bold tracking-[-.035em]">{plannedTotal}</strong>
          </div>
        </div>
      </header>
    </>
  );
}

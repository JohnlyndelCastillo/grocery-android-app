import type { Ref } from "react";

interface HeaderProps {
  cartTotal: string;
  plannedTotal: string;
  overBudget: boolean;
  /** Scrolled down: hide the total cards and show a one-line summary instead. */
  compact: boolean;
  /** Lets the page measure how tall the total cards are (to know how much height compacting saves). */
  totalsRef?: Ref<HTMLDivElement>;
  onOpenSettings(): void;
}

export function Header({ cartTotal, plannedTotal, overBudget, compact, totalsRef, onOpenSettings }: HeaderProps) {
  return (
    <header
      id="app-header"
      data-compact={compact}
      className="hero relative shrink-0 overflow-hidden px-6 text-white shadow-[0_12px_28px_var(--color-hero-shadow)] transition-[padding,border-radius] duration-[250ms] motion-reduce:transition-none max-[380px]:px-[1.125rem]"
      style={{
        paddingTop: `calc(${compact ? "0.625rem" : "2.125rem"} + env(safe-area-inset-top, 0px))`,
        paddingBottom: compact ? "0.875rem" : "1.875rem",
        borderRadius: compact ? "0 0 20px 20px" : "0 0 26px 26px",
      }}
    >
      <div className="relative z-[1] flex items-center justify-between gap-3">
        <h1 className={`m-0 shrink-0 font-bold leading-[1.15] tracking-[-.03em] transition-[font-size] duration-[250ms] motion-reduce:transition-none ${compact ? "text-[1.25rem]" : "text-[clamp(1.75rem,8vw,2rem)]"}`}>Grocery list</h1>
        <p
          id="compact-summary"
          className={`m-0 ml-auto min-w-0 truncate text-[.92rem] font-bold transition-opacity duration-200 motion-reduce:transition-none ${compact ? (overBudget ? "text-[var(--color-over-budget-accent)]" : "text-white") : "pointer-events-none opacity-0"}`}
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

      <div
        className={`grid transition-[grid-template-rows,margin] duration-[250ms] motion-reduce:transition-none ${compact ? "mt-0 grid-rows-[0fr]" : "mt-[14px] grid-rows-[1fr]"}`}
        aria-hidden={compact}
      >
        <div className="min-h-0 overflow-hidden">
          <div ref={totalsRef} className="totals relative z-[1] grid grid-cols-2 gap-[10px]" aria-label="Spending summary">
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
        </div>
      </div>
    </header>
  );
}

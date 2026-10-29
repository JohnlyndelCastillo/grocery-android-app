import { useState } from "react";

interface HeaderProps {
  cartTotal: string;
  plannedTotal: string;
  overBudget: boolean;
  onOpenSettings(): void;
}

export function Header({ cartTotal, plannedTotal, overBudget, onOpenSettings }: HeaderProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <header
      className="hero relative shrink-0 overflow-hidden px-6 text-white shadow-[0_12px_28px_#1d583622] transition-[padding,border-radius] duration-300 max-[380px]:px-[18px]"
      style={{
        paddingTop: `calc(${collapsed ? 14 : 34}px + env(safe-area-inset-top, 0px))`,
        paddingBottom: collapsed ? 16 : 24,
        borderRadius: collapsed ? "0 0 18px 18px" : "0 0 28px 28px",
      }}
    >
      <button
        id="open-settings"
        className="settings-button absolute right-4 top-[calc(env(safe-area-inset-top,0px)+12px)] z-[3] grid size-[38px] place-items-center bg-transparent text-white focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
        type="button"
        aria-label="Open settings"
        onClick={onOpenSettings}
      >
        <svg className="size-[21px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.73v.51a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.51a2 2 0 0 1 1-1.73l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        </svg>
      </button>

      <div
        id="hero-title"
        aria-hidden={collapsed}
        className="relative z-[1] overflow-hidden transition-[max-height,opacity] duration-300"
        style={{ maxHeight: collapsed ? 0 : 180, opacity: collapsed ? 0 : 1 }}
      >
        <div className="text-[.68rem] font-bold tracking-[.16em] opacity-[.78]">YOUR MARKET RUN</div>
        <h1 className="relative z-[1] mb-[3px] mt-[7px] text-[clamp(1.75rem,7vw,2.2rem)] font-bold leading-[1.15] tracking-[-.045em]">
          Grocery list<span className="ml-[7px] align-top text-[1.15rem] text-[#c3e78d]" aria-hidden="true">✳</span>
        </h1>
        <p className="m-0 text-[.9rem] text-[#e0eee3]">Keep track of what you need and what’s in your cart.</p>
      </div>

      <button
        id="collapse-header"
        className="hero-toggle relative z-[3] mx-auto flex min-h-[30px] w-[120px] items-center justify-center rounded-full bg-transparent px-[14px] text-white"
        style={{ marginTop: collapsed ? 0 : 10, marginBottom: collapsed ? 8 : 0 }}
        type="button"
        aria-expanded={!collapsed}
        aria-controls="hero-title"
        aria-label={collapsed ? "Expand header" : "Collapse header"}
        onClick={() => setCollapsed((value) => !value)}
      >
        <svg className={`header-chevron block h-6 w-[30px] scale-x-[1.7] transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 15 6-6 6 6" />
        </svg>
      </button>

      <div className="totals grid grid-cols-2 gap-[10px] transition-[margin] duration-300" style={{ marginTop: collapsed ? 0 : 22 }} aria-label="Spending summary">
        <div
          id="cart-card"
          className={`total-card flex min-w-0 flex-col gap-1 rounded-[14px] border px-[14px] py-[13px] ${overBudget ? "border-[#f4c2ab] bg-[#fff0e8] text-[#923d27]" : "border-white bg-white text-green-dark"}`}
          aria-label={`In your cart ${cartTotal}${overBudget ? ", over today's budget" : ""}`}
        >
          <span className={`text-[.75rem] font-medium ${overBudget ? "text-[#a04e35]" : "text-[#66786a]"}`}>In your cart</span>
          <strong className="whitespace-nowrap text-[clamp(1.1rem,5vw,1.4rem)] font-bold tracking-[-.035em]">{cartTotal}</strong>
        </div>
        <div className="total-card flex min-w-0 flex-col gap-1 rounded-[14px] border border-white/15 bg-white/[.07] px-[14px] py-[13px]">
          <span className="text-[.75rem] font-medium text-[#e0eee3]">Planned total</span>
          <strong className="whitespace-nowrap text-[clamp(1.1rem,5vw,1.4rem)] font-bold tracking-[-.035em]">{plannedTotal}</strong>
        </div>
      </div>
    </header>
  );
}

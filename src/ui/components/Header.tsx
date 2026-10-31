interface HeaderProps {
  cartTotal: string;
  plannedTotal: string;
  overBudget: boolean;
  onOpenSettings(): void;
}

export function Header({ cartTotal, plannedTotal, overBudget, onOpenSettings }: HeaderProps) {
  return (
    <header
      className="hero relative shrink-0 overflow-hidden px-6 pb-[30px] text-white shadow-[0_12px_28px_#1d583622] max-[380px]:px-[18px]"
      style={{ paddingTop: "calc(34px + env(safe-area-inset-top, 0px))", borderRadius: "0 0 26px 26px" }}
    >
      <div className="relative z-[1] flex items-center justify-between gap-3">
        <h1 className="m-0 text-[clamp(1.75rem,8vw,2rem)] font-bold leading-[1.15] tracking-[-.03em]">Grocery list</h1>
        <button
          id="open-settings"
          className="settings-button grid size-11 shrink-0 place-items-center rounded-full bg-white/[.12] text-white focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          type="button"
          aria-label="Open settings"
          onClick={onOpenSettings}
        >
          <svg className="size-[21px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.73v.51a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.51a2 2 0 0 1 1-1.73l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          </svg>
        </button>
      </div>

      <div className="totals relative z-[1] mt-[14px] grid grid-cols-2 gap-[10px]" aria-label="Spending summary">
        <div
          id="cart-card"
          className={`total-card flex min-w-0 flex-col gap-1 rounded-[14px] border px-[14px] py-3 ${overBudget ? "border-[#f4c2ab] bg-[#fff0e8] text-[#923d27]" : "border-white bg-white text-green-dark"}`}
          aria-label={`In your cart ${cartTotal}${overBudget ? ", over today's budget" : ""}`}
        >
          <span className={`text-[.75rem] font-medium ${overBudget ? "text-[#a04e35]" : "text-muted"}`}>In your cart</span>
          <strong className="whitespace-nowrap text-[clamp(1.1rem,5vw,1.4rem)] font-bold tracking-[-.035em]">{cartTotal}</strong>
        </div>
        <div className="total-card flex min-w-0 flex-col gap-1 rounded-[14px] border border-white/15 bg-white/[.07] px-[14px] py-3">
          <span className="text-[.75rem] font-medium text-[#e0eee3]">Planned total</span>
          <strong className="whitespace-nowrap text-[clamp(1.1rem,5vw,1.4rem)] font-bold tracking-[-.035em]">{plannedTotal}</strong>
        </div>
      </div>
    </header>
  );
}

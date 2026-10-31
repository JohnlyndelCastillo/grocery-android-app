import { useLayoutEffect, useRef } from "react";
import { version } from "../../../package.json";
import type { CurrencyCode, Receipt } from "../../domain/types";
import { currencyFormatter, currencySymbol } from "../format";
import type { SettingsView } from "../types";
import { ReceiptDetail } from "./ReceiptDetail";
import { ReceiptsList } from "./ReceiptsList";
import { SettingsGroup, SettingsRow } from "./SettingsGroup";

interface SettingsPageProps {
  view: SettingsView;
  receipts: Receipt[];
  selectedReceipt: Receipt | null;
  currency: CurrencyCode;
  onCurrencyChange(currency: CurrencyCode): void;
  onOpenCurrency(): void;
  onOpenAbout(): void;
  onOpenReceipts(): void;
  onOpenReceipt(id: string): void;
  onDeleteReceipt(): void;
  onClose(): void;
  onHomeEnter(): void;
}

// How deep each screen is. Going deeper slides forward, going shallower slides back.
const releaseUrl = `https://github.com/JohnlyndelCastillo/grocery-android-app/releases#release-v${version}`;
const depth: Record<SettingsView, number> = { closed: 0, settings: 1, about: 2, receipts: 2, currency: 2, receipt: 3 };
const titles: Record<SettingsView, string> = { closed: "Settings", settings: "Settings", about: "About", receipts: "Receipts", receipt: "Receipt", currency: "Currency" };
const backLabels: Record<SettingsView, string> = { closed: "Back", settings: "Back", about: "Settings", receipts: "Settings", receipt: "Receipts", currency: "Settings" };
const currencyOptions: { code: CurrencyCode; label: string }[] = [
  { code: "PHP", label: "Philippine peso (PHP)" },
  { code: "VND", label: "Vietnamese đồng (VND)" },
  { code: "USD", label: "US dollar (USD)" },
];
const chevron = <svg className="size-5 text-[#879489]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>;

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function animateIn(element: HTMLElement | null, direction: "forward" | "back") {
  if (!element || prefersReducedMotion() || typeof element.animate !== "function") return;
  element.animate(
    [
      { opacity: 0, transform: `translateX(${direction === "forward" ? "12px" : "-12px"})` },
      { opacity: 1, transform: "translateX(0)" },
    ],
    { duration: 260, easing: "cubic-bezier(.2,.75,.25,1)" },
  );
}

function animateOut(element: HTMLElement | null, direction: "forward" | "back", done: () => void) {
  if (!element || prefersReducedMotion() || typeof element.animate !== "function") {
    done();
    return;
  }
  const animation = element.animate(
    [
      { opacity: 1, transform: "translateX(0)" },
      { opacity: 0, transform: `translateX(${direction === "forward" ? "-12px" : "12px"})` },
    ],
    { duration: 180, easing: "ease-in", fill: "forwards" },
  );
  animation.onfinish = () => {
    animation.cancel();
    done();
  };
}

export function SettingsPage({ view, receipts, selectedReceipt, currency, onCurrencyChange, onOpenCurrency, onOpenAbout, onOpenReceipts, onOpenReceipt, onDeleteReceipt, onClose, onHomeEnter }: SettingsPageProps) {
  const previousView = useRef(view);
  const pageRef = useRef<HTMLElement>(null);
  const settingsHomeRef = useRef<HTMLDivElement>(null);
  const aboutPageRef = useRef<HTMLDivElement>(null);
  const receiptsPageRef = useRef<HTMLDivElement>(null);
  const receiptPageRef = useRef<HTMLDivElement>(null);
  const currencyPageRef = useRef<HTMLDivElement>(null);

  // Read refs when called, not at render, so the element is always the current one.
  function screenElement(v: SettingsView): HTMLElement | null {
    switch (v) {
      case "settings": return settingsHomeRef.current;
      case "about": return aboutPageRef.current;
      case "receipts": return receiptsPageRef.current;
      case "receipt": return receiptPageRef.current;
      case "currency": return currencyPageRef.current;
      default: return null;
    }
  }

  useLayoutEffect(() => {
    const previous = previousView.current;
    previousView.current = view;
    if (previous === view) return;

    if (previous === "closed" && view === "settings") {
      animateIn(pageRef.current, "forward");
      document.getElementById("close-settings")?.focus();
    } else if (view === "closed") {
      onHomeEnter();
      document.getElementById("open-settings")?.focus();
    } else if (depth[view] > depth[previous]) {
      animateIn(screenElement(view), "forward");
      document.getElementById("close-settings")?.focus();
    } else {
      animateIn(screenElement(view), "back");
      // Return focus to the row that opened the screen we just left.
      const opener = previous === "about" ? "open-about" : previous === "receipts" ? "open-receipts" : previous === "currency" ? "open-currency" : "close-settings";
      document.getElementById(opener)?.focus();
    }
  }, [view, onHomeEnter]);

  // Slide the current screen out, then switch.
  function leaveForward(then: () => void) {
    animateOut(screenElement(view), "forward", then);
  }

  function handleClose() {
    // Closing the whole page animates the page itself; going back one level animates just that screen.
    animateOut(view === "settings" ? pageRef.current : screenElement(view), "back", onClose);
  }

  return (
    <section
      ref={pageRef}
      id="settings-page"
      className="settings-page fixed inset-0 z-20 h-[100vh] h-[100dvh] min-h-0 overflow-y-auto bg-app px-5 pb-[calc(28px+env(safe-area-inset-bottom,0px))] pt-[env(safe-area-inset-top,0px)] [overscroll-behavior:contain]"
      aria-labelledby="settings-title"
      hidden={view === "closed"}
    >
      <header className="mx-auto flex w-full max-w-[584px] flex-col items-start border-b border-[#e1e8df] py-3 pb-4">
        <button
          id="close-settings"
          className="inline-flex items-center gap-1 rounded-lg bg-transparent py-[7px] pl-1 pr-[10px] text-[.85rem] font-bold text-green"
          type="button"
          aria-label={view === "settings" ? "Back to grocery list" : `Back to ${backLabels[view]}`}
          onClick={handleClose}
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>{backLabels[view]}</span>
        </button>
        <h1 id="settings-title" className="mb-0 ml-1 mt-[30px] text-2xl font-bold text-ink">{titles[view]}</h1>
      </header>
      <div ref={settingsHomeRef} id="settings-home" className="mx-auto w-full max-w-[584px] pt-5" hidden={view !== "settings"}>
        <SettingsGroup>
          <SettingsRow id="open-receipts" onClick={() => leaveForward(onOpenReceipts)}>
            <span>Receipts</span>
            <span className="flex items-center gap-2">
              {receipts.length > 0 && <span id="receipts-count" className="text-[.8rem] text-muted">{receipts.length}</span>}
              {chevron}
            </span>
          </SettingsRow>
          <SettingsRow id="open-currency" onClick={() => leaveForward(onOpenCurrency)}>
            <span>Currency</span>
            <span className="flex items-center gap-2">
              <span id="currency-value" className="text-[.88rem] text-muted">{currency} ({currencySymbol(currencyFormatter(currency)) || currency})</span>
              {chevron}
            </span>
          </SettingsRow>
          <SettingsRow id="open-about" onClick={() => leaveForward(onOpenAbout)}>
            <span>About</span>{chevron}
          </SettingsRow>
        </SettingsGroup>
      </div>
      <div ref={currencyPageRef} id="currency-page" className="mx-auto w-full max-w-[584px] pt-5" hidden={view !== "currency"}>
        <div role="radiogroup" aria-label="Currency">
          <SettingsGroup>
            {currencyOptions.map(({ code, label }) => (
              <SettingsRow key={code} id={`currency-option-${code}`} role="radio" checked={currency === code} onClick={() => onCurrencyChange(code)}>
                <span>{label}</span>
                {currency === code && (
                  <svg className="size-5 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                )}
              </SettingsRow>
            ))}
          </SettingsGroup>
        </div>
        <p id="currency-note" className="mx-1 mt-3 text-[.82rem] leading-[1.4] text-muted">Changing currency updates formatting only. It doesn’t convert your amounts.</p>
      </div>
      <div ref={receiptsPageRef} id="receipts-page" className="mx-auto w-full max-w-[584px]" hidden={view !== "receipts"}>
        <ReceiptsList receipts={receipts} onOpen={(id) => leaveForward(() => onOpenReceipt(id))} />
      </div>
      <div ref={receiptPageRef} id="receipt-page" className="mx-auto w-full max-w-[584px]" hidden={view !== "receipt"}>
        <ReceiptDetail receipt={selectedReceipt} onDelete={onDeleteReceipt} />
      </div>
      <div ref={aboutPageRef} id="about-page" className="about-page mx-auto w-full max-w-[584px] pt-5" hidden={view !== "about"}>
        <SettingsGroup>
          <SettingsRow>
            <span>Version</span>
            <strong className="text-[.9rem] font-semibold text-[#6d7a70]">v{version}</strong>
          </SettingsRow>
          <SettingsRow href={releaseUrl}>
            <span>What’s new</span>
            <svg className="size-5 text-[#879489]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
          </SettingsRow>
        </SettingsGroup>
      </div>
    </section>
  );
}

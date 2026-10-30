import { useLayoutEffect, useRef } from "react";
import type { Receipt } from "../../domain/types";
import type { SettingsView } from "../types";
import { ReceiptDetail } from "./ReceiptDetail";
import { ReceiptsList } from "./ReceiptsList";

interface SettingsPageProps {
  view: SettingsView;
  receipts: Receipt[];
  selectedReceipt: Receipt | null;
  onOpenAbout(): void;
  onOpenReceipts(): void;
  onOpenReceipt(id: string): void;
  onDeleteReceipt(): void;
  onClose(): void;
  onHomeEnter(): void;
}

// How deep each screen is. Going deeper slides forward, going shallower slides back.
const depth: Record<SettingsView, number> = { closed: 0, settings: 1, about: 2, receipts: 2, receipt: 3 };
const titles: Record<SettingsView, string> = { closed: "Settings", settings: "Settings", about: "About", receipts: "Receipts", receipt: "Receipt" };
const backLabels: Record<SettingsView, string> = { closed: "Back", settings: "Back", about: "Settings", receipts: "Settings", receipt: "Receipts" };
const chevron = <svg className="size-5 text-[#879489]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>;
const rowClass = "settings-row flex min-h-[58px] w-full items-center justify-between border-b border-[#e1e8df] bg-transparent px-1 text-left text-[.98rem] text-[#344a39] hover:bg-[#edf3ea]";

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

export function SettingsPage({ view, receipts, selectedReceipt, onOpenAbout, onOpenReceipts, onOpenReceipt, onDeleteReceipt, onClose, onHomeEnter }: SettingsPageProps) {
  const previousView = useRef(view);
  const pageRef = useRef<HTMLElement>(null);
  const settingsHomeRef = useRef<HTMLDivElement>(null);
  const aboutPageRef = useRef<HTMLDivElement>(null);
  const receiptsPageRef = useRef<HTMLDivElement>(null);
  const receiptPageRef = useRef<HTMLDivElement>(null);

  // Read refs when called, not at render, so the element is always the current one.
  function screenElement(v: SettingsView): HTMLElement | null {
    switch (v) {
      case "settings": return settingsHomeRef.current;
      case "about": return aboutPageRef.current;
      case "receipts": return receiptsPageRef.current;
      case "receipt": return receiptPageRef.current;
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
      const opener = previous === "about" ? "open-about" : previous === "receipts" ? "open-receipts" : "close-settings";
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
      <div ref={settingsHomeRef} id="settings-home" className="mx-auto w-full max-w-[584px]" hidden={view !== "settings"}>
        <button id="open-receipts" className={rowClass} type="button" onClick={() => leaveForward(onOpenReceipts)}>
          <span>Receipts</span>
          <span className="flex items-center gap-2">
            {receipts.length > 0 && <span id="receipts-count" className="text-[.8rem] text-muted">{receipts.length}</span>}
            {chevron}
          </span>
        </button>
        <button id="open-about" className={rowClass} type="button" onClick={() => leaveForward(onOpenAbout)}>
          <span>About</span>
          {chevron}
        </button>
      </div>
      <div ref={receiptsPageRef} id="receipts-page" className="mx-auto w-full max-w-[584px]" hidden={view !== "receipts"}>
        <ReceiptsList receipts={receipts} onOpen={(id) => leaveForward(() => onOpenReceipt(id))} />
      </div>
      <div ref={receiptPageRef} id="receipt-page" className="mx-auto w-full max-w-[584px]" hidden={view !== "receipt"}>
        <ReceiptDetail receipt={selectedReceipt} onDelete={onDeleteReceipt} />
      </div>
      <div ref={aboutPageRef} id="about-page" className="about-page mx-auto w-full max-w-[584px] pt-6" hidden={view !== "about"}>
        <div className="version-row flex items-center justify-between px-[2px] py-[14px] text-[.95rem] text-[#344a39]">
          <span>Version</span>
          <strong className="text-[.9rem] font-semibold text-[#6d7a70]">v1.1.1</strong>
        </div>
        <a className="settings-row flex min-h-[58px] w-full items-center justify-between border-b border-[#e1e8df] bg-transparent px-1 text-left text-[.98rem] text-[#344a39] no-underline hover:bg-[#edf3ea]" href="https://github.com/JohnlyndelCastillo/grocery-android-app/releases#release-v1.1.1" target="_blank" rel="noopener noreferrer">
          <span>What’s new</span>
          <svg className="size-5 text-[#879489]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
        </a>
      </div>
    </section>
  );
}

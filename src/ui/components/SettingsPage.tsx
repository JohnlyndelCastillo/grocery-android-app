import { useLayoutEffect, useRef } from "react";
import type { SettingsView } from "../types";

interface SettingsPageProps {
  view: SettingsView;
  onOpenAbout(): void;
  onClose(): void;
  onHomeEnter(): void;
}

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

export function SettingsPage({ view, onOpenAbout, onClose, onHomeEnter }: SettingsPageProps) {
  const inAbout = view === "about";
  const previousView = useRef(view);
  const pageRef = useRef<HTMLElement>(null);
  const settingsHomeRef = useRef<HTMLDivElement>(null);
  const aboutPageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const previous = previousView.current;
    previousView.current = view;

    if (previous === "closed" && view === "settings") {
      animateIn(pageRef.current, "forward");
      document.getElementById("close-settings")?.focus();
    } else if (previous === "settings" && view === "about") {
      animateIn(aboutPageRef.current, "forward");
      document.getElementById("close-settings")?.focus();
    } else if (previous === "about" && view === "settings") {
      animateIn(settingsHomeRef.current, "back");
      document.getElementById("open-about")?.focus();
    } else if (previous === "settings" && view === "closed") {
      onHomeEnter();
      document.getElementById("open-settings")?.focus();
    }
  }, [view, onHomeEnter]);

  function handleOpenAbout() {
    animateOut(settingsHomeRef.current, "forward", onOpenAbout);
  }

  function handleClose() {
    const outgoing = inAbout ? aboutPageRef.current : pageRef.current;
    animateOut(outgoing, "back", onClose);
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
          aria-label={inAbout ? "Back to Settings" : "Back to grocery list"}
          onClick={handleClose}
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>{inAbout ? "Settings" : "Back"}</span>
        </button>
        <h1 id="settings-title" className="mb-0 ml-1 mt-[30px] text-2xl font-bold text-ink">{inAbout ? "About" : "Settings"}</h1>
      </header>
      <div ref={settingsHomeRef} id="settings-home" className="mx-auto w-full max-w-[584px]" hidden={view !== "settings"}>
        <button id="open-about" className="settings-row flex min-h-[58px] w-full items-center justify-between border-b border-[#e1e8df] bg-transparent px-1 text-left text-[.98rem] text-[#344a39] hover:bg-[#edf3ea]" type="button" onClick={handleOpenAbout}>
          <span>About</span>
          <svg className="size-5 text-[#879489]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
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

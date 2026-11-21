import type { ReactNode } from "react";
import type { AppTab } from "../routes";

interface BottomNavProps {
  active: AppTab;
  onNavigate(tab: AppTab): void;
}

const items: { tab: AppTab; label: string; icon: ReactNode }[] = [
  {
    tab: "home",
    label: "Home",
    icon: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></>,
  },
  {
    tab: "lists",
    label: "Lists",
    icon: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
  },
  {
    tab: "history",
    label: "History",
    icon: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  },
  {
    tab: "settings",
    label: "Settings",
    icon: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" /><circle cx="16" cy="12" r="2" /><circle cx="10" cy="18" r="2" /></>,
  },
];

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav id="bottom-nav" className="bottom-nav" aria-label="Main navigation">
      {items.map(({ tab, label, icon }) => {
        const selected = tab === active;
        return (
          <button
            key={tab}
            id={`nav-${tab}`}
            className={`nav-item${selected ? " active" : ""}`}
            type="button"
            aria-current={selected ? "page" : undefined}
            onClick={() => onNavigate(tab)}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}

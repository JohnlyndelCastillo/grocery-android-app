import type { ReactNode } from "react";

/** The trailing ">" on rows that open another screen. */
export function ChevronIcon() {
  return (
    <svg className="size-5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

interface SettingsGroupProps {
  children: ReactNode;
  className?: string;
}

/** An inset group: Surface card, 16 radius, quiet 1dp dividers between rows, no border or shadow. */
export function SettingsGroup({ children, className = "" }: SettingsGroupProps) {
  return <div className={`settings-group overflow-hidden rounded-2xl bg-[var(--color-surface)] ${className}`}>{children}</div>;
}

interface SettingsRowProps {
  children: ReactNode;
  id?: string;
  className?: string;
  onClick?: () => void;
  href?: string;
  role?: string;
  checked?: boolean;
  type?: "button";
}

/** Every row is at least 48dp tall, with the same padding, alignment and divider. */
export function SettingsRow({ children, id, className = "", onClick, href, role, checked, type = "button" }: SettingsRowProps) {
  // Focus is drawn inside the row, because the group clips anything outside it.
  const shared = `settings-row tap flex w-full items-center justify-between gap-3 border-b border-[var(--color-settings-border)] bg-transparent px-4 py-3 text-left text-body text-[var(--color-settings-ink)] no-underline last:border-b-0 hover:bg-[var(--color-settings-hover)] focus-visible:[outline-offset:-2px] ${className}`;
  if (href) return <a id={id} className={shared} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  if (onClick) return <button id={id} className={shared} type={type} role={role} aria-checked={checked} onClick={onClick}>{children}</button>;
  return <div id={id} className={shared} role={role}>{children}</div>;
}

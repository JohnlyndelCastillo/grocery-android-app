import type { ReactNode } from "react";

interface SettingsGroupProps {
  children: ReactNode;
  className?: string;
}

/** Shared inset-card surface for the Settings subpages. */
export function SettingsGroup({ children, className = "" }: SettingsGroupProps) {
  return <div className={`settings-group overflow-hidden rounded-2xl border border-[#e1e8df] bg-white px-3 shadow-[0_2px_8px_#263d2d08] ${className}`}>{children}</div>;
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

/** Consistent row height, alignment, and inset divider across settings groups. */
export function SettingsRow({ children, id, className = "", onClick, href, role, checked, type = "button" }: SettingsRowProps) {
  const shared = `settings-row flex min-h-[58px] w-full items-center justify-between border-b border-[#e1e8df] bg-transparent px-1 text-left text-[.98rem] text-[#344a39] no-underline last:border-b-0 hover:bg-[#edf3ea] ${className}`;
  if (href) return <a id={id} className={shared} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
  if (onClick) return <button id={id} className={shared} type={type} role={role} aria-checked={checked} onClick={onClick}>{children}</button>;
  return <div id={id} className={shared} role={role}>{children}</div>;
}

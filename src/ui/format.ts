import type { BudgetStatus } from "../domain/budget";
import type { CurrencyCode } from "../domain/types";

export type { CurrencyCode };
const currencyLocales: Record<CurrencyCode, string> = { PHP: "en-PH", VND: "vi-VN", USD: "en-US" };

/** Anything that can turn an amount into text. Components take this, not Intl.NumberFormat. */
export interface Money {
  format(amount: number): string;
}

/**
 * "PHP 8,893": the currency code, a non-breaking space (so the code never wraps away from its number),
 * then the amount with that currency's own digit grouping. Whole amounts show no decimals; anything
 * else shows exactly two ("PHP 1,240.50", never "PHP 1,240.5").
 */
export function makeMoney(currency: CurrencyCode): Money {
  const locale = currencyLocales[currency];
  const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const cents = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    format(amount: number): string {
      const rounded = Math.round(amount * 100) / 100 + 0; // "+ 0" turns -0 into 0
      return `${currency}\u00a0${(Number.isInteger(rounded) ? whole : cents).format(rounded)}`;
    },
  };
}

export function budgetMessage(s: BudgetStatus, format: Money): string {
  switch (s.state) {
    case "none": return "Set a limit to track today’s spending.";
    case "over": return format.format(s.amount) + " over today’s budget";
    case "exact": return "You’re right at today’s budget.";
    case "left": return format.format(s.amount) + " left for today";
  }
}

// "Oct 30, 2026, 3:45 PM" in the phone's own locale.
export function formatReceiptDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/** "Sunday, Nov 22" for the Home eyebrow. */
export function formatToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(now);
}

/** "Nov 1" (or "Nov 1, 2025" when the year differs from now). */
export function formatShortDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const sameYear = date.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) }).format(date);
}

/** "November 2026" from a "2026-11" month key. */
export function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  if (!year || !month) return key;
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

/** "Last shopped 3 days ago", "Last shopped today", or "Never shopped". */
export function lastShoppedLabel(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "Never shopped";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Never shopped";
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const then = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((start - then) / 86_400_000);
  if (days <= 0) return "Last shopped today";
  if (days === 1) return "Last shopped yesterday";
  if (days < 7) return `Last shopped ${days} days ago`;
  return `Last shopped ${formatShortDate(iso, now)}`;
}

export const itemCountLabel = (count: number): string => `${count} ${count === 1 ? "item" : "items"}`;
export const tripCountLabel = (count: number): string => `${count} ${count === 1 ? "trip" : "trips"}`;

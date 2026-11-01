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

// Short form for the one-line budget row: "PHP 400 left", "PHP 20 over", "On budget".
export function budgetShort(s: BudgetStatus, format: Money): string {
  switch (s.state) {
    case "none": return "";
    case "over": return format.format(s.amount) + " over";
    case "exact": return "On budget";
    case "left": return format.format(s.amount) + " left";
  }
}

// "Oct 30, 2026, 3:45 PM" in the phone's own locale.
export function formatReceiptDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

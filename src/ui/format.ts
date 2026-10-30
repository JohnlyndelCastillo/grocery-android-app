import type { BudgetStatus } from "../domain/budget";
import type { CurrencyCode } from "../domain/types";

export type { CurrencyCode };
const currencyLocales: Record<CurrencyCode, string> = { PHP: "en-PH", VND: "vi-VN", USD: "en-US" };

export function currencyFormatter(currency: CurrencyCode): Intl.NumberFormat {
  return new Intl.NumberFormat(currencyLocales[currency], { style: "currency", currency });
}
export function budgetMessage(s: BudgetStatus, format: Intl.NumberFormat): string {
  switch (s.state) {
    case "none": return "Set a limit to track today’s spending.";
    case "over": return format.format(s.amount) + " over today’s budget";
    case "exact": return "You’re right at today’s budget.";
    case "left": return format.format(s.amount) + " left for today";
  }
}

// "₱", "₫" or "$": the symbol for whichever currency the formatter was built with.
export function currencySymbol(format: Intl.NumberFormat): string {
  return format.formatToParts(0).find((part) => part.type === "currency")?.value ?? "";
}

// "Oct 30, 2026, 3:45 PM" in the phone's own locale.
export function formatReceiptDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

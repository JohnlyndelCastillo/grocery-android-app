import type { BudgetStatus } from "../domain/budget";

export type CurrencyCode = "PHP" | "VND" | "USD";
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

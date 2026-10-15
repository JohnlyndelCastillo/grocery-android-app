import type { BudgetStatus } from "../domain/budget";

export const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function budgetMessage(s: BudgetStatus): string {
  switch (s.state) {
    case "none":
      return "Set a limit to track today’s spending.";
    case "over":
      return `${peso.format(s.amount)} over today’s budget`;
    case "exact":
      return "You’re right at today’s budget.";
    case "left":
      return `${peso.format(s.amount)} left for today`;
  }
}

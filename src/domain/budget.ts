import { round2 } from "./totals";

export type BudgetStatus = { state: "none" | "over" | "exact" | "left"; amount: number };

export function budgetStatus(inCart: number, budget: number | null): BudgetStatus {
  if (budget === null) return { state: "none", amount: 0 };
  const diff = round2(inCart - budget);
  if (diff > 0) return { state: "over", amount: diff };
  if (diff === 0) return { state: "exact", amount: 0 };
  return { state: "left", amount: -diff };
}

// "" clears the budget; garbage or negatives are rejected.
export type ParsedBudget = { ok: true; value: number | null } | { ok: false };

export function parseBudget(raw: string): ParsedBudget {
  const text = raw.trim();
  if (text === "") return { ok: true, value: null };
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? { ok: true, value: n } : { ok: false };
}

import type { Item } from "./types";

const KEY = "grocery-items-v1";
const BUDGET_KEY = "grocery-daily-budget-v1";

function localDateKey(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function loadItems(): Item[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Item[]) : [];
  } catch {
    return [];
  }
}

export function saveItems(items: Item[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // storage full or blocked; ignore in the prototype
  }
}

export function loadDailyBudget(): number | null {
  try {
    const raw = localStorage.getItem(BUDGET_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { date?: string; amount?: number };
    return saved.date === localDateKey() && typeof saved.amount === "number" ? saved.amount : null;
  } catch {
    return null;
  }
}

export function saveDailyBudget(amount: number | null): void {
  try {
    if (amount === null) localStorage.removeItem(BUDGET_KEY);
    else localStorage.setItem(BUDGET_KEY, JSON.stringify({ date: localDateKey(), amount }));
  } catch {
    // Storage can be full or unavailable; keep the app usable for this session.
  }
}

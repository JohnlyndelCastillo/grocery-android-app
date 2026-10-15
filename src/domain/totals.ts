import type { Item } from "./types";

// Round to centavos so float noise (0.1 + 0.2) never reaches the screen.
export const round2 = (n: number): number => Math.round(n * 100) / 100;

export const lineTotal = (i: Item): number => round2(i.qty * i.price);

export const plannedTotal = (items: Item[]): number =>
  round2(items.reduce((sum, i) => sum + lineTotal(i), 0));

export const cartTotal = (items: Item[]): number =>
  plannedTotal(items.filter((i) => i.checked));

export const checkedCount = (items: Item[]): number =>
  items.filter((i) => i.checked).length;

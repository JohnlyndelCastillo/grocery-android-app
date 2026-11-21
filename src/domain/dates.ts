/** Local calendar day key, e.g. "2026-11-22". */
export function localDateKey(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Local month key, e.g. "2026-11". */
export function localMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const monthKeyOf = (iso: string): string | null => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : localMonthKey(date);
};

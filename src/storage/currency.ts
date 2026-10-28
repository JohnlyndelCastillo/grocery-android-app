import type { CurrencyCode } from "../domain/types";

// Same key the app always used, so a saved choice survives the refactor.
const KEY = "grocery-currency-v1";

export const isCurrency = (value: unknown): value is CurrencyCode =>
  value === "PHP" || value === "VND" || value === "USD";

export function loadCurrency(store: Pick<Storage, "getItem"> = localStorage): CurrencyCode {
  try {
    const raw = store.getItem(KEY);
    return isCurrency(raw) ? raw : "PHP";
  } catch {
    return "PHP";
  }
}

export function saveCurrency(currency: CurrencyCode, store: Pick<Storage, "setItem"> = localStorage): void {
  try {
    store.setItem(KEY, currency);
  } catch {
    // blocked storage: the choice just won't survive a restart
  }
}

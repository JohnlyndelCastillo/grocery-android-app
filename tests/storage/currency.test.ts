import { describe, expect, it } from "vitest";
import { loadCurrency, saveCurrency } from "../../src/storage/currency";

const fakeStore = (initial: string | null = null) => {
  let value = initial;
  return { getItem: () => value, setItem: (_k: string, v: string) => { value = v; } };
};

describe("currency storage", () => {
  it("defaults to PHP", () => expect(loadCurrency(fakeStore())).toBe("PHP"));
  it("ignores garbage", () => expect(loadCurrency(fakeStore("EUR"))).toBe("PHP"));
  it("round-trips a saved currency", () => {
    const store = fakeStore();
    saveCurrency("VND", store);
    expect(loadCurrency(store)).toBe("VND");
  });
});

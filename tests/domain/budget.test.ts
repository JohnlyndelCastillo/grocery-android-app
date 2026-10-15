import { describe, expect, it } from "vitest";
import { budgetStatus, parseBudget } from "../../src/domain/budget";

describe("budgetStatus", () => {
  it("has no state without a budget", () => {
    expect(budgetStatus(100, null).state).toBe("none");
  });
  it("reports over, exact and left", () => {
    expect(budgetStatus(120, 100)).toEqual({ state: "over", amount: 20 });
    expect(budgetStatus(100, 100)).toEqual({ state: "exact", amount: 0 });
    expect(budgetStatus(60, 100)).toEqual({ state: "left", amount: 40 });
  });
});

describe("parseBudget", () => {
  it("clears on empty input", () => {
    expect(parseBudget("  ")).toEqual({ ok: true, value: null });
  });
  it("accepts valid numbers", () => {
    expect(parseBudget("1500.50")).toEqual({ ok: true, value: 1500.5 });
  });
  it("rejects negatives and garbage", () => {
    expect(parseBudget("-5")).toEqual({ ok: false });
    expect(parseBudget("abc")).toEqual({ ok: false });
  });
});

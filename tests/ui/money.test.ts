import { describe, expect, it } from "vitest";
import { budgetMessage, budgetShort, makeMoney } from "../../src/ui/format";

const NBSP = "\u00a0";

describe("makeMoney", () => {
  it("writes the currency code, a non-breaking space, then the amount", () => {
    expect(makeMoney("PHP").format(8893)).toBe(`PHP${NBSP}8,893`);
    expect(makeMoney("PHP").format(0)).toBe(`PHP${NBSP}0`);
  });

  it("shows no decimals for whole amounts and exactly two for anything else", () => {
    const php = makeMoney("PHP");
    expect(php.format(1240)).toBe(`PHP${NBSP}1,240`);
    expect(php.format(1240.5)).toBe(`PHP${NBSP}1,240.50`);
    expect(php.format(0.99)).toBe(`PHP${NBSP}0.99`);
  });

  it("rounds to cents so floating-point noise never shows", () => {
    const php = makeMoney("PHP");
    expect(php.format(0.1 + 0.2)).toBe(`PHP${NBSP}0.30`);
    expect(php.format(99.999)).toBe(`PHP${NBSP}100`);
    expect(php.format(10 - 9.9999)).toBe(`PHP${NBSP}0`);
  });

  it("never shows a negative zero", () => {
    expect(makeMoney("PHP").format(-0.001)).toBe(`PHP${NBSP}0`);
    expect(makeMoney("PHP").format(-5)).toBe(`PHP${NBSP}-5`);
  });

  it("uses each currency's own digit grouping", () => {
    expect(makeMoney("USD").format(1234567)).toBe(`USD${NBSP}1,234,567`);
    expect(makeMoney("VND").format(1500000)).toBe(`VND${NBSP}1.500.000`);
  });
});

describe("budget messages", () => {
  const php = makeMoney("PHP");
  it("use the same format", () => {
    expect(budgetMessage({ state: "left", amount: 400 }, php)).toBe(`PHP${NBSP}400 left for today`);
    expect(budgetMessage({ state: "over", amount: 20.5 }, php)).toBe(`PHP${NBSP}20.50 over today’s budget`);
    expect(budgetShort({ state: "left", amount: 400 }, php)).toBe(`PHP${NBSP}400 left`);
    expect(budgetShort({ state: "over", amount: 20 }, php)).toBe(`PHP${NBSP}20 over`);
  });
});

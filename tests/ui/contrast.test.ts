import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Reads the real stylesheet, so a palette change that breaks a color pair fails here.
const css = readFileSync(resolve(process.cwd(), "src/styles/style.css"), "utf8");

// The text between the braces of the first block that follows `marker`.
function blockAfter(source: string, marker: string): string {
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`"${marker}" not found in style.css`);
  const open = source.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces after "${marker}"`);
}

function tokens(body: string): Record<string, string> {
  const found: Record<string, string> = {};
  for (const match of body.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) found[match[1]] = match[2].trim();
  return found;
}

const lightTokens = tokens(blockAfter(css, "@theme"));
const darkOverrides = tokens(blockAfter(blockAfter(css, "@media (prefers-color-scheme: dark)"), ":root"));
const palettes = { light: lightTokens, dark: { ...lightTokens, ...darkOverrides } };

// Follows `var(--color-x)` aliases, so a name that points at a role resolves to that role's value in the active mode.
function color(mode: keyof typeof palettes, name: string): string {
  let value = palettes[mode][name];
  for (let hops = 0; value !== undefined && value.startsWith("var("); hops++) {
    if (hops > 5) throw new Error(`--color-${name} points in a circle`);
    value = palettes[mode][value.match(/var\(--color-([a-z0-9-]+)\)/)![1]];
  }
  if (!/^#[0-9a-f]{6}$/i.test(value ?? "")) throw new Error(`--color-${name} is not a plain #rrggbb color in ${mode}: ${value}`);
  return value;
}

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [text or outline, background, minimum ratio, what it is used for]
const pairs: Array<[string, string, number, string]> = [
  ["ink", "app", 4.5, "primary text on the canvas"],
  ["ink", "surface", 4.5, "primary text on cards"],
  ["muted", "app", 4.5, "secondary text on the canvas"],
  ["muted", "surface", 4.5, "secondary text on cards"],
  ["muted", "track", 4.5, "unselected tab labels"],
  ["ink", "track", 4.5, "quantity value, selected tab"],
  ["on-action", "green", 4.5, "text on filled Action buttons and the header"],
  ["green", "app", 4.5, "Select, amounts on the canvas"],
  ["green", "surface", 4.5, "line totals, cart total"],
  ["green", "budget-surface", 4.5, "Remaining amount"],
  ["budget-text", "budget-surface", 4.5, "budget supporting text"],
  ["danger", "danger-soft", 4.5, "Delete receipt"],
  ["danger", "surface", 4.5, "destructive text on cards"],
  ["on-danger", "danger-fill", 4.5, "text on filled destructive buttons"],
  ["warn-label", "app", 4.5, "invalid-amount message in the budget sheet"],
  ["input-border", "app", 3, "field and checkbox outlines on the canvas"],
  ["input-border", "surface", 3, "field and checkbox outlines on cards"],
];

describe.each(["light", "dark"] as const)("color contrast (%s)", (mode) => {
  it.each(pairs)("%s on %s is at least %s:1 (%s)", (fg, bg, min) => {
    expect(contrast(color(mode, fg), color(mode, bg))).toBeGreaterThanOrEqual(min);
  });

  it("snackbars stay readable: white text and the action accent on the toast surface", () => {
    expect(contrast("#ffffff", color(mode, "toast"))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color(mode, "action-accent"), color(mode, "toast"))).toBeGreaterThanOrEqual(4.5);
  });
});

describe("palette structure", () => {
  const roles = ["app", "surface", "ink", "muted", "green", "on-action", "budget-surface", "budget-text", "line",
    "input-border", "track", "danger", "danger-soft", "on-danger"];

  it.each(roles)("%s has its own dark value", (role) => {
    expect(darkOverrides[role], `--color-${role} missing from the dark block`).toBeDefined();
    expect(darkOverrides[role]).not.toBe(lightTokens[role]);
  });

  it("matches the values in the design spec", () => {
    expect(lightTokens).toMatchObject({
      app: "#f4f6f2", surface: "#ffffff", ink: "#202b24", muted: "#536258", green: "#216443", "on-action": "#ffffff",
      "budget-surface": "#edf3ef", "budget-text": "#496258", line: "#dde4dd", "input-border": "#809086", track: "#e9ede7",
      danger: "#b82938", "danger-soft": "#fceeee",
    });
    expect(darkOverrides).toMatchObject({
      app: "#141a16", surface: "#202922", ink: "#eff5ef", muted: "#b8c8bb", green: "#91d5a9", "on-action": "#141a16",
      "budget-surface": "#28352e", "budget-text": "#b0c9bb", line: "#39483d", "input-border": "#85998a", track: "#2c382f",
      danger: "#ff9ca6", "danger-soft": "#42272e",
    });
  });

  it("every alias points at a token that exists", () => {
    for (const [name, value] of Object.entries(lightTokens)) {
      const target = value.match(/^var\(--color-([a-z0-9-]+)\)$/)?.[1];
      if (target) expect(lightTokens[target], `--color-${name} -> --color-${target}`).toBeDefined();
    }
  });
});

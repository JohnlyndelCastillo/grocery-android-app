import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Read from the project root. Vitest may transform import.meta.url into a Vite URL
// that is not a file: URL, so it cannot always be passed to Node filesystem APIs.
const projectRoot = process.cwd();
const stylesheet = readFileSync(
  resolve(projectRoot, "src/styles/style.css"),
  "utf8",
);
const settingsGroup = readFileSync(
  resolve(projectRoot, "src/ui/components/SettingsGroup.tsx"),
  "utf8",
);

describe("theme and responsive scaling foundations", () => {
  it("keeps the app constrained to the intended 320px–620px layout range", () => {
    expect(stylesheet).toMatch(/min-width:\s*320px/);
    expect(stylesheet).toMatch(/width:\s*min\(100%,\s*620px\)/);
  });

  it("uses rem-based root sizing and scalable app gutters", () => {
    expect(stylesheet).toMatch(/font-size:\s*100%/);
    expect(stylesheet).toMatch(/padding:\s*0\s+clamp\(/);
  });

  it("points the repeated settings surfaces at the shared divider and control-track roles", () => {
    expect(stylesheet).toContain("--color-line: #dde4dd");
    expect(stylesheet).toContain("--color-settings-border: var(--color-line)");
    expect(stylesheet).toContain("--color-settings-hover: var(--color-track)");
    expect(settingsGroup).toContain("var(--color-settings-border)");
    expect(settingsGroup).toContain("var(--color-settings-hover)");
  });

  it("keeps the over-budget orange under warn-*, and Budget surface as the neutral tint", () => {
    expect(stylesheet).toContain("--color-warn-surface: #fff0e8");
    expect(stylesheet).toContain("--color-warn-border: #f4c2ab");
    expect(stylesheet).toContain("--color-budget-surface: #edf3ef");
  });

  it("provides a system dark palette and reduced-motion support", () => {
    expect(stylesheet).toContain("@media (prefers-color-scheme: dark)");
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("includes a compact landscape layout rule", () => {
    expect(stylesheet).toContain("@media (orientation: landscape) and (max-height: 500px)");
  });

  it("uses a flat 40% scrim: no blur and no dialog shadows", () => {
    expect(stylesheet).toContain("--color-scrim: #10111c66");
    // Spelled in two pieces so Tailwind, which also scans tests/, does not emit a utility class for it.
    expect(stylesheet).not.toContain(["backdrop", "filter"].join("-"));
    expect(stylesheet).toContain("dialog::backdrop { background: var(--color-scrim); }");
    for (const file of ["BudgetSheet.tsx", "DeleteDialog.tsx"]) {
      expect(readFileSync(resolve(projectRoot, "src/ui/components", file), "utf8")).not.toMatch(/shadow-\[/);
    }
  });

  it("shows presses with an 8% overlay instead of fading the button", () => {
    expect(stylesheet).toMatch(/button:active:not\(:disabled\)::after\s*\{\s*opacity:\s*\.08/);
    expect(stylesheet).not.toMatch(/button:active\s*\{[^}]*opacity/);
  });

  it("has a visible focus outline and readable placeholders", () => {
    expect(stylesheet).toMatch(/:focus-visible\s*\{\s*outline:\s*2px solid var\(--color-green\);\s*outline-offset:\s*2px/);
    expect(stylesheet).toMatch(/input::placeholder\s*\{\s*color:\s*var\(--color-muted\)/);
  });

  it("defines the seven type roles with a 1.3 line height, plus tabular numerals and the 48px target", () => {
    for (const role of ["title", "total", "sheet", "item", "body", "tab", "label"]) {
      expect(stylesheet).toMatch(new RegExp(`--text-${role}:\\s*[\\d.]+rem;\\s*--text-${role}--line-height:\\s*1\\.3;`));
    }
    expect(stylesheet).toMatch(/\.num\s*\{\s*font-variant-numeric:\s*tabular-nums/);
    expect(stylesheet).toMatch(/\.tap\s*\{\s*min-width:\s*48px;\s*min-height:\s*48px/);
  });

  it("leaves no reference to a deleted token anywhere in the source", () => {
    const deleted = ["hero-start", "hero-end", "hero-muted", "hero-shadow", "white-20", "white-06", "white-05", "over-budget-accent",
      "button-shadow", "dialog-shadow", "backdrop", "placeholder", "focus-ring", "danger-ring", "green-fill-hover"];
    const sources = [
      stylesheet,
      ...["Header", "AddItemForm", "BudgetRow", "BudgetSheet", "DeleteDialog", "GroceryRow", "ShoppingList", "SettingsPage"].map((name) =>
        readFileSync(resolve(projectRoot, `src/ui/components/${name}.tsx`), "utf8")),
    ].join("\n");
    for (const token of deleted) expect(sources, `--color-${token}`).not.toContain(`--color-${token}`);
  });

  it("sets the browser chrome colors and lets the viewport resize with the keyboard", () => {
    const html = readFileSync(resolve(projectRoot, "index.html"), "utf8");
    expect(html).toContain('content="#f4f6f2" media="(prefers-color-scheme: light)"');
    expect(html).toContain('content="#141a16" media="(prefers-color-scheme: dark)"');
    expect(html).toContain("interactive-widget=resizes-content");
  });
});

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

  it("defines semantic tokens for repeated grey-green settings surfaces", () => {
    expect(stylesheet).toContain("--color-settings-border: #e1e8df");
    expect(stylesheet).toContain("--color-settings-hover: #edf3ea");
    expect(settingsGroup).toContain("var(--color-settings-border)");
    expect(settingsGroup).toContain("var(--color-settings-hover)");
  });

  it("keeps the over-budget surface orange through its semantic theme token", () => {
    expect(stylesheet).toContain("--color-budget-surface: #fff0e8");
    expect(stylesheet).toContain("--color-budget-border: #f4c2ab");
  });

  it("provides a system dark palette and reduced-motion support", () => {
    expect(stylesheet).toContain("@media (prefers-color-scheme: dark)");
    expect(stylesheet).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("includes a compact landscape layout rule", () => {
    expect(stylesheet).toContain("@media (orientation: landscape) and (max-height: 500px)");
  });
});

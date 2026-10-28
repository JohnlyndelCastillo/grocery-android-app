import { ChevronUp, createElement } from "lucide";
import type { Elements } from "./elements";

// The little chevron that collapses the green header.
export function setupHeaderCollapse(els: Elements): void {
  const icon = createElement(ChevronUp);
  icon.classList.add("header-chevron");
  icon.setAttribute("aria-hidden", "true");
  els.collapseHeaderBtn.append(icon);

  els.collapseHeaderBtn.addEventListener("click", () => {
    const collapsed = els.collapseHeaderBtn.getAttribute("aria-expanded") === "true";
    els.collapseHeaderBtn.setAttribute("aria-expanded", String(!collapsed));
    els.collapseHeaderBtn.setAttribute("aria-label", collapsed ? "Expand header" : "Collapse header");
    els.heroTitle.setAttribute("aria-hidden", String(collapsed));
    els.hero.classList.toggle("collapsed", collapsed);
  });
}

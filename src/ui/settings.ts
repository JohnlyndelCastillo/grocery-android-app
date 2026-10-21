import { createElement, Settings } from "lucide";

const settingsTemplate = `
  <section id="settings-page" class="settings-page" aria-labelledby="settings-title" hidden>
    <header class="settings-page-header">
      <button id="close-settings" class="back-settings" type="button" aria-label="Back to grocery list"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg><span>Back</span></button>
      <h1 id="settings-title">Settings</h1>
    </header>
    <div id="settings-home" class="settings-page-content">
      <button id="open-about" class="settings-row" type="button"><span>About</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>
    </div>
    <div id="about-page" class="settings-page-content about-page" hidden>
      <div class="version-row"><span>Version</span><strong>v1.1.1</strong></div>
      <a class="settings-row" href="https://github.com/JohnlyndelCastillo/grocery-android-app/releases#release-v1.1.1" target="_blank" rel="noopener noreferrer"><span>What’s new</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>
    </div>
  </section>
`;

export function mountSettingsPage(root: HTMLElement): void {
  root.insertAdjacentHTML("beforeend", settingsTemplate);
  const $ = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector)!;
  const homePage = $("#home-page");
  const openSettingsBtn = $<HTMLButtonElement>("#open-settings");
  const settingsIcon = createElement(Settings);
  settingsIcon.classList.add("settings-icon");
  settingsIcon.setAttribute("aria-hidden", "true");
  openSettingsBtn.append(settingsIcon);

  const settingsPage = $("#settings-page");
  const settingsHome = $("#settings-home");
  const aboutPage = $("#about-page");
  const settingsTitle = $("#settings-title");
  const openAboutBtn = $<HTMLButtonElement>("#open-about");
  const closeSettingsBtn = $<HTMLButtonElement>("#close-settings");
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  function animateIn(element: HTMLElement, direction: "forward" | "back"): void {
    if (reduceMotion || typeof element.animate !== "function") return;
    element.animate(
      [
        { opacity: 0, transform: `translateX(${direction === "forward" ? "12px" : "-12px"})` },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 260, easing: "cubic-bezier(.2,.75,.25,1)" },
    );
  }

  function animateOut(element: HTMLElement, direction: "forward" | "back", done: () => void): void {
    if (reduceMotion || typeof element.animate !== "function") { done(); return; }
    const animation = element.animate(
      [
        { opacity: 1, transform: "translateX(0)" },
        { opacity: 0, transform: `translateX(${direction === "forward" ? "-12px" : "12px"})` },
      ],
      { duration: 180, easing: "ease-in", fill: "forwards" },
    );
    animation.onfinish = () => {
      animation.cancel();
      done();
    };
  }

  openSettingsBtn.addEventListener("click", () => {
    homePage.hidden = true;
    settingsHome.hidden = false;
    aboutPage.hidden = true;
    settingsTitle.textContent = "Settings";
    closeSettingsBtn.setAttribute("aria-label", "Back to grocery list");
    closeSettingsBtn.querySelector("span")!.textContent = "Back";
    settingsPage.hidden = false;
    closeSettingsBtn.focus();
    animateIn(settingsPage, "forward");
  });

  openAboutBtn.addEventListener("click", () => {
    animateOut(settingsHome, "forward", () => {
      settingsHome.hidden = true;
      aboutPage.hidden = false;
      settingsTitle.textContent = "About";
      closeSettingsBtn.setAttribute("aria-label", "Back to Settings");
      closeSettingsBtn.querySelector("span")!.textContent = "Settings";
      animateIn(aboutPage, "forward");
    });
  });

  closeSettingsBtn.addEventListener("click", () => {
    if (!aboutPage.hidden) {
      animateOut(aboutPage, "back", () => {
        aboutPage.hidden = true;
        settingsHome.hidden = false;
        settingsTitle.textContent = "Settings";
        closeSettingsBtn.setAttribute("aria-label", "Back to grocery list");
        closeSettingsBtn.querySelector("span")!.textContent = "Back";
        openAboutBtn.focus();
        animateIn(settingsHome, "back");
      });
    } else {
      animateOut(settingsPage, "back", () => {
        settingsPage.hidden = true;
        homePage.hidden = false;
        openSettingsBtn.focus();
        animateIn(homePage, "back");
      });
    }
  });
}

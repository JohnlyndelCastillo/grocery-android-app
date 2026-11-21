import { useState } from "react";
import { version } from "../../../package.json";
import type { CurrencyCode } from "../../domain/types";
import { ChevronIcon, SettingsGroup, SettingsRow } from "./SettingsGroup";

interface SettingsPageProps {
  currency: CurrencyCode;
  onCurrencyChange(currency: CurrencyCode): void;
  onClose(): void;
}

type SettingsView = "settings" | "currency" | "about";

const releaseUrl = `https://github.com/JohnlyndelCastillo/grocery-android-app/releases#release-v${version}`;
const titles: Record<SettingsView, string> = { settings: "Settings", currency: "Currency", about: "About" };
const currencyOptions: { code: CurrencyCode; label: string }[] = [
  { code: "PHP", label: "Philippine peso (PHP)" },
  { code: "VND", label: "Vietnamese đồng (VND)" },
  { code: "USD", label: "US dollar (USD)" },
];

export function SettingsPage({ currency, onCurrencyChange, onClose }: SettingsPageProps) {
  const [view, setView] = useState<SettingsView>("settings");

  function handleBack() {
    if (view === "settings") onClose();
    else setView("settings");
  }

  return (
    <section id="settings-page" className="page settings-page" aria-labelledby="settings-title">
      <header className="settings-header">
        <button id="close-settings" className="tap grid shrink-0 place-items-center rounded-xl bg-transparent p-0 text-ink" type="button" aria-label={view === "settings" ? "Back to home" : `Back to Settings`} onClick={handleBack}>
          <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 id="settings-title" className="m-0 min-w-0 text-title font-medium text-ink">{titles[view]}</h1>
      </header>

      <main id="screen-scroll" className="page-scroll min-h-0 flex-1">
        <div id="settings-home" className="pt-2" hidden={view !== "settings"}>
          <SettingsGroup>
            <SettingsRow id="open-currency" onClick={() => setView("currency")}>
              <span>Currency</span>
              <span className="flex items-center gap-2">
                <span id="currency-value" className="text-body text-muted">{currency}</span>
                <ChevronIcon />
              </span>
            </SettingsRow>
            <SettingsRow id="open-about" onClick={() => setView("about")}>
              <span>About</span><ChevronIcon />
            </SettingsRow>
          </SettingsGroup>
          <p className="mx-4 mt-4 text-label text-muted">Lists, receipts, budget, and currency stay on this device.</p>
        </div>

        <div id="currency-page" className="pt-2" hidden={view !== "currency"}>
          <div role="radiogroup" aria-label="Currency">
            <SettingsGroup>
              {currencyOptions.map(({ code, label }) => (
                <SettingsRow key={code} id={`currency-option-${code}`} role="radio" checked={currency === code} onClick={() => onCurrencyChange(code)}>
                  <span>{label}</span>
                  {currency === code && (
                    <svg className="size-5 text-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                  )}
                </SettingsRow>
              ))}
            </SettingsGroup>
          </div>
          <p id="currency-note" className="mx-4 mt-3 text-label text-muted">Changing currency updates formatting only. It doesn’t convert your amounts.</p>
        </div>

        <div id="about-page" className="pt-2" hidden={view !== "about"}>
          <SettingsGroup>
            <SettingsRow>
              <span>Version</span>
              <strong className="num text-body font-semibold text-muted">v{version}</strong>
            </SettingsRow>
            <SettingsRow href={releaseUrl}>
              <span>What’s new</span>
              <svg className="size-5 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
            </SettingsRow>
          </SettingsGroup>
        </div>
      </main>
    </section>
  );
}

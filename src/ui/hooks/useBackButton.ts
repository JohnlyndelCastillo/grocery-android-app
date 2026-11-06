import { App } from "@capacitor/app";
import { useEffect, useRef } from "react";

/**
 * Handles the Android system Back button.
 *
 * `handleBack` returns true when it used the press (closed a sheet, went up a screen, ...). When it returns
 * false there is nothing left to go back to, so the app is sent to the background, which is what Android
 * does at the top of an app. Without this, registering a listener would trap the user in the app, because
 * Capacitor stops its own Back handling as soon as there is one.
 *
 * The keyboard is dismissed by Android before the app is told about Back, so "keyboard first" needs no code.
 * In a plain browser the plugin never fires and the browser's own Back button is left alone.
 */
export function useBackButton(handleBack: () => boolean): void {
  // The listener is registered once; it reads the latest handler, so it never acts on stale state.
  const latest = useRef(handleBack);
  useEffect(() => {
    latest.current = handleBack;
  });

  useEffect(() => {
    let disposed = false;
    let handle: { remove(): Promise<void> } | undefined;

    try {
      App.addListener("backButton", () => {
        if (latest.current()) return;
        App.minimizeApp().catch(() => {
          // Not on Android (or no native bridge): nothing to minimize.
        });
      })
        .then((added) => {
          // The effect can be cleaned up before the plugin answers (React StrictMode does exactly that).
          if (disposed) void added.remove();
          else handle = added;
        })
        .catch(() => {
          // Native bridge unavailable (an ordinary browser): the page keeps the browser's own Back behavior.
        });
    } catch {
      // Same, if the plugin throws straight away.
    }

    return () => {
      disposed = true;
      void handle?.remove();
    };
  }, []);
}

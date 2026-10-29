import { StrictMode, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { GroceryStorage } from "../../src/storage/storage";
import { App } from "../../src/ui/App";

// Test helper: renders <App /> in StrictMode (like main.tsx) and returns an unmount function.
export function mountApp(element: HTMLElement, storage: GroceryStorage): () => void {
  const root = createRoot(element);
  root.render(createElement(StrictMode, null, createElement(App, { storage })));
  return () => root.unmount();
}

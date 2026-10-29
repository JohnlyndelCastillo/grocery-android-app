import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { GroceryStorage } from "../storage/storage";
import { App } from "./App";

const mountedRoots = new WeakMap<HTMLElement, Root>();

export function mountApp(element: HTMLElement, storage: GroceryStorage): () => void {
  mountedRoots.get(element)?.unmount();
  const root = createRoot(element);
  mountedRoots.set(element, root);
  flushSync(() => root.render(createElement(App, { storage })));

  return () => {
    root.unmount();
    if (mountedRoots.get(element) === root) mountedRoots.delete(element);
  };
}

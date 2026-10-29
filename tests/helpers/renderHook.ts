import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

// Test helper: runs a hook inside a throwaway component and exposes its latest return value.
// Call hook actions inside act(() => ...) and read `result.current` afterwards.
export function renderHook<T>(hook: () => T) {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const result = { current: undefined as unknown as T };
  function Probe() {
    result.current = hook();
    return null;
  }
  const root = createRoot(document.createElement("div"));
  act(() => root.render(createElement(Probe)));
  return { result, unmount: () => act(() => root.unmount()) };
}

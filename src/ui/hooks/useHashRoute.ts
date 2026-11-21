import { useCallback, useEffect, useState } from "react";
import { parseRoute, routeHref, type Route } from "../routes";

/** A tiny hash route layer: works in Vite/PWA and inside the Capacitor WebView. */
export function useHashRoute(): { route: Route; navigate: (route: Route, options?: { replace?: boolean }) => void } {
  const [route, setRoute] = useState<Route>(() => parseRoute());

  useEffect(() => {
    const onChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((next: Route, { replace = false }: { replace?: boolean } = {}) => {
    const href = routeHref(next);
    setRoute(next);
    if (window.location.hash === href) return;
    if (replace) {
      window.history.replaceState(null, "", href);
    } else {
      window.location.hash = href;
    }
  }, []);

  return { route, navigate };
}

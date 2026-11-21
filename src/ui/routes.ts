export type AppTab = "home" | "lists" | "history" | "settings";

export type Route =
  | { name: "home" }
  | { name: "lists" }
  | { name: "list"; listId: string }
  | { name: "history" }
  | { name: "receipt"; receiptId: string }
  | { name: "settings" };

export function parseRoute(hash: string = window.location.hash): Route {
  const path = hash.replace(/^#/, "") || "/";
  const parts = path.split("/").filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  if (parts.length === 0) return { name: "home" };
  if (parts[0] === "lists" && parts[1]) return { name: "list", listId: parts[1] };
  if (parts[0] === "lists") return { name: "lists" };
  if (parts[0] === "history" && parts[1]) return { name: "receipt", receiptId: parts[1] };
  if (parts[0] === "history") return { name: "history" };
  if (parts[0] === "settings") return { name: "settings" };
  return { name: "home" };
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case "home": return "#/";
    case "lists": return "#/lists";
    case "list": return `#/lists/${encodeURIComponent(route.listId)}`;
    case "history": return "#/history";
    case "receipt": return `#/history/${encodeURIComponent(route.receiptId)}`;
    case "settings": return "#/settings";
  }
}

export function tabForRoute(route: Route): AppTab {
  switch (route.name) {
    case "lists":
    case "list": return "lists";
    case "history":
    case "receipt": return "history";
    case "settings": return "settings";
    default: return "home";
  }
}

/** Where Android Back goes from a detail screen. Tabs and Home are handled by the app shell. */
export function parentRoute(route: Route): Route | null {
  switch (route.name) {
    case "list": return { name: "lists" };
    case "receipt": return { name: "history" };
    default: return null;
  }
}

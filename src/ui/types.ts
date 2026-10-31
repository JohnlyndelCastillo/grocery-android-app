import type { Item } from "../domain/types";

export type Tab = "needed" | "cart";
export type SettingsView = "closed" | "settings" | "about" | "receipts" | "receipt";

// Where the back button goes from each screen.
export function parentView(view: SettingsView): SettingsView {
  switch (view) {
    case "receipt": return "receipts";
    case "receipts":
    case "about": return "settings";
    default: return "closed";
  }
}

export interface UndoAction {
  items: Item[];
  message: string;
}

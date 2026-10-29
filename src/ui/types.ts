import type { Item } from "../domain/types";

export type Tab = "needed" | "cart";
export type SettingsView = "closed" | "settings" | "about";

export interface UndoAction {
  items: Item[];
  message: string;
}

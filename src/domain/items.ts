import type { Item } from "./types";

export function createItem(name: string, id: string = crypto.randomUUID()): Item {
  return { id, name: name.trim(), qty: 1, price: 0, checked: false };
}

export const addItem = (items: Item[], name: string): Item[] =>
  name.trim() ? [...items, createItem(name)] : items;

export const removeItem = (items: Item[], id: string): Item[] =>
  items.filter((i) => i.id !== id);

export const removeItems = (items: Item[], ids: ReadonlySet<string>): Item[] =>
  items.filter((i) => !ids.has(i.id));

export const updateItem = (items: Item[], id: string, patch: Partial<Omit<Item, "id">>): Item[] =>
  items.map((i) => (i.id === id ? { ...i, ...patch } : i));

export const setAllChecked = (items: Item[], checked: boolean): Item[] =>
  items.map((i) => ({ ...i, checked }));

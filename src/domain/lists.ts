import type { AppStateV2, Item, ShoppingList, Store } from "./types";

/** The small fixed palette stores can choose from, matching the approved mockup dots. */
export const STORE_COLORS = ["#4d7b66", "#c08819", "#9e9e94", "#6b7fa3", "#a0605a", "#7a6a9b", "#4f7c8a"] as const;

export interface CreateListOptions {
  id?: string;
  storeId?: string | null;
  items?: Item[];
  now?: Date;
}

export function createList(name: string, { id = crypto.randomUUID(), storeId = null, items = [], now = new Date() }: CreateListOptions = {}): ShoppingList {
  const timestamp = now.toISOString();
  return {
    id,
    name: name.trim(),
    storeId,
    items,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastShoppedAt: null,
    archivedAt: null,
  };
}

export const findList = (lists: ShoppingList[], id: string | null | undefined): ShoppingList | null =>
  id ? lists.find((list) => list.id === id) ?? null : null;

/** The active list, falling back to the most recently updated list. */
export function activeListOf(state: AppStateV2): ShoppingList | null {
  const live = liveLists(state.lists);
  const active = findList(live, state.activeListId);
  return active ?? mostRecentList(live);
}

export function mostRecentList(lists: ShoppingList[]): ShoppingList | null {
  return [...lists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export const liveLists = (lists: ShoppingList[]): ShoppingList[] => lists.filter((list) => list.archivedAt === null);

export function touchList(list: ShoppingList, now: Date = new Date()): ShoppingList {
  return { ...list, updatedAt: now.toISOString() };
}

export function replaceList(state: AppStateV2, list: ShoppingList): AppStateV2 {
  return { ...state, lists: state.lists.map((current) => (current.id === list.id ? list : current)) };
}

export function updateListItems(state: AppStateV2, listId: string, items: Item[], now: Date = new Date()): AppStateV2 {
  const list = findList(state.lists, listId);
  if (!list) return state;
  return replaceList(state, { ...list, items, updatedAt: now.toISOString() });
}

export function addList(state: AppStateV2, list: ShoppingList): AppStateV2 {
  return { ...state, lists: [...state.lists, list], activeListId: list.id };
}

export function renameList(state: AppStateV2, listId: string, name: string): AppStateV2 {
  const trimmed = name.trim();
  const list = findList(state.lists, listId);
  if (!list || !trimmed) return state;
  return replaceList(state, { ...list, name: trimmed, updatedAt: new Date().toISOString() });
}

/**
 * Copies a list and its items. Every copy gets a new item id and starts unchecked,
 * so the original trip's state is never carried into the new list.
 */
export function duplicateList(
  state: AppStateV2,
  listId: string,
  { id = crypto.randomUUID(), now = new Date(), itemId = () => crypto.randomUUID() }: { id?: string; now?: Date; itemId?: () => string } = {},
): { state: AppStateV2; list: ShoppingList } | null {
  const source = findList(state.lists, listId);
  if (!source) return null;
  const copy = createList(`${source.name} copy`, {
    id,
    storeId: source.storeId,
    now,
    items: source.items.map((item) => ({ ...item, id: itemId(), checked: false })),
  });
  return { state: addList(state, copy), list: copy };
}

export function archiveList(state: AppStateV2, listId: string, now: Date = new Date()): AppStateV2 {
  const list = findList(state.lists, listId);
  if (!list) return state;
  const next = replaceList(state, { ...list, archivedAt: now.toISOString(), updatedAt: now.toISOString() });
  if (next.activeListId !== listId) return next;
  return { ...next, activeListId: mostRecentList(liveLists(next.lists))?.id ?? null };
}

export function restoreList(state: AppStateV2, listId: string): AppStateV2 {
  const list = findList(state.lists, listId);
  if (!list) return state;
  return replaceList(state, { ...list, archivedAt: null, updatedAt: new Date().toISOString() });
}

/** Deleting a list never touches receipts. The active list moves to the newest remaining list. */
export function deleteList(state: AppStateV2, listId: string): AppStateV2 {
  const lists = state.lists.filter((list) => list.id !== listId);
  if (lists.length === state.lists.length) return state;
  const activeListId = state.activeListId === listId ? mostRecentList(liveLists(lists))?.id ?? null : state.activeListId;
  return { ...state, lists, activeListId };
}

export function setActiveList(state: AppStateV2, listId: string | null): AppStateV2 {
  if (listId !== null && !findList(state.lists, listId)) return state;
  return { ...state, activeListId: listId };
}

export function markListShopped(state: AppStateV2, listId: string, now: Date = new Date()): AppStateV2 {
  const list = findList(state.lists, listId);
  if (!list) return state;
  return replaceList(state, { ...list, lastShoppedAt: now.toISOString(), updatedAt: now.toISOString() });
}

// ---- stores ----

export const storeName = (stores: Store[], storeId: string | null): string | null =>
  storeId ? stores.find((store) => store.id === storeId)?.name ?? null : null;

export function isStoreNameTaken(stores: Store[], name: string, exceptId?: string): boolean {
  const normalized = name.trim().toLocaleLowerCase();
  return stores.some((store) => store.id !== exceptId && store.name.toLocaleLowerCase() === normalized);
}

export function createStore(name: string, { id = crypto.randomUUID(), color = STORE_COLORS[0] }: { id?: string; color?: string } = {}): Store {
  return { id, name: name.trim(), color };
}

export function addStore(state: AppStateV2, store: Store): AppStateV2 {
  if (!store.name || isStoreNameTaken(state.stores, store.name)) return state;
  return { ...state, stores: [...state.stores, store] };
}

export function renameStore(state: AppStateV2, storeId: string, name: string): AppStateV2 {
  const trimmed = name.trim();
  if (!trimmed || isStoreNameTaken(state.stores, trimmed, storeId)) return state;
  return { ...state, stores: state.stores.map((store) => (store.id === storeId ? { ...store, name: trimmed } : store)) };
}

export function recolorStore(state: AppStateV2, storeId: string, color: string): AppStateV2 {
  if (!STORE_COLORS.includes(color as (typeof STORE_COLORS)[number])) return state;
  return { ...state, stores: state.stores.map((store) => (store.id === storeId ? { ...store, color } : store)) };
}

/** Removing a store clears it from lists. Lists and receipt snapshots stay intact. */
export function deleteStore(state: AppStateV2, storeId: string): AppStateV2 {
  if (!state.stores.some((store) => store.id === storeId)) return state;
  return {
    ...state,
    stores: state.stores.filter((store) => store.id !== storeId),
    lists: state.lists.map((list) => (list.storeId === storeId ? { ...list, storeId: null } : list)),
  };
}

// ---- grouping ----

export interface ListGroup {
  key: string;
  name: string;
  color: string | null;
  lists: ShoppingList[];
}

/** Store groups in their own order, with unassigned lists under "No store" last. */
export function groupListsByStore(lists: ShoppingList[], stores: Store[]): ListGroup[] {
  const groups: ListGroup[] = stores
    .map((store) => ({
      key: store.id,
      name: store.name,
      color: store.color,
      lists: lists.filter((list) => list.storeId === store.id),
    }))
    .filter((group) => group.lists.length > 0);
  const unassigned = lists.filter((list) => list.storeId === null || !stores.some((store) => store.id === list.storeId));
  if (unassigned.length > 0) groups.push({ key: "no-store", name: "No store", color: null, lists: unassigned });
  return groups;
}

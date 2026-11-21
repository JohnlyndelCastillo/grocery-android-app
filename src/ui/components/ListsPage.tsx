import { groupListsByStore, liveLists } from "../../domain/lists";
import { listSummary } from "../../domain/selectors";
import type { ShoppingList } from "../../domain/types";
import type { GroceryList } from "../hooks/useGroceryList";
import { itemCountLabel, lastShoppedLabel } from "../format";

interface ListsPageProps {
  app: GroceryList;
  onOpenList(listId: string): void;
  onNewList(): void;
  onManageStores(): void;
  onOpenListActions(list: ShoppingList): void;
}

export function ListsPage({ app, onOpenList, onNewList, onManageStores, onOpenListActions }: ListsPageProps) {
  const live = liveLists(app.lists);
  const groups = groupListsByStore(live, app.stores);
  const archived = app.lists.filter((list) => list.archivedAt !== null);

  return (
    <div id="lists-page" className="page lists-page">
      <main id="screen-scroll" className="page-scroll flex flex-col">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="page-heading">Lists</h1>
          <button id="open-store-manager" className="icon-button" type="button" aria-label="Manage stores" onClick={onManageStores}>
            <svg className="size-[1.125rem]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" />
            </svg>
          </button>
        </div>

        {live.length === 0 ? (
          <p id="lists-empty" className="empty-state">No lists yet. Create one to start planning.</p>
        ) : (
          groups.map((group) => (
            <section key={group.key} className="store-group" aria-label={`${group.name} lists`}>
              <div className="store-label">
                <span className={`store-dot${group.color ? "" : " gray"}`} style={group.color ? { backgroundColor: group.color } : undefined} aria-hidden="true" />
                {group.name}
              </div>
              {group.lists.map((list) => {
                const summary = listSummary(list);
                return (
                  <article key={list.id} className="card list-card">
                    <button className="list-open" type="button" onClick={() => onOpenList(list.id)}>
                      <span className="list-card-top">
                        <span className="list-name truncate">{list.name}</span>
                        <span className="list-total num">{app.money.format(summary.planned)}</span>
                      </span>
                      <span className="list-meta block">{itemCountLabel(summary.itemCount)} · {lastShoppedLabel(list.lastShoppedAt)}</span>
                      <span className="progress block" role="progressbar" aria-label={`${list.name} progress`} aria-valuenow={Math.round(summary.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                        <i className="block" style={{ width: `${summary.progress * 100}%` }} />
                      </span>
                    </button>
                    <button className="list-options" type="button" aria-label={`Options for ${list.name}`} onClick={() => onOpenListActions(list)}>
                      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
                    </button>
                  </article>
                );
              })}
            </section>
          ))
        )}

        {archived.length > 0 && (
          <section className="store-group" aria-label="Archived lists">
            <div className="store-label"><span className="store-dot gray" aria-hidden="true" />Archived</div>
            {archived.map((list) => (
              <article key={list.id} className="card list-card archived">
                <button className="list-open" type="button" onClick={() => onOpenListActions(list)}>
                  <span className="list-card-top">
                    <span className="list-name truncate">{list.name}</span>
                    <span className="list-total num">{app.money.format(listSummary(list).planned)}</span>
                  </span>
                  <span className="list-meta block">{itemCountLabel(list.items.length)} · Archived</span>
                </button>
              </article>
            ))}
          </section>
        )}

        <button id="new-list" className="new-list mt-auto" type="button" onClick={onNewList}>+ New list</button>
      </main>
    </div>
  );
}

# Home, Lists, and History Implementation Approach

## Purpose

Implement the approved Home, Lists, List detail, and History experience in the current Grocery List app. Keep the existing grocery behavior and storage intact for users, while adding named lists and app navigation. Use the iOS-inspired visual direction in the approved page mockup: warm neutral surfaces, forest-green accents, restrained cards, and a lightly frosted floating bottom bar.

This is an implementation handoff for the local coding agent. It describes the intended work; it does not authorize unrelated feature expansion.

The visual reference is the local mockup at `/home/ayaneruu/.codex/visualizations/2026/11/21/01a1fe5f-9cda-70b2-ac58-a5c40d062e68/grocery-phase3-pages.html`. If it is unavailable, follow the visual details in this document and preserve the current app's system light/dark behavior.

## Visual fidelity requirements

Treat the mockup as the target design, not just inspiration. The repository app is rendered with React and CSS inside the Capacitor WebView, so the screen layout, typography, colors, cards, and frosted bottom bar can be reproduced in the app. Match the mockup closely before adding optional polish or changing layout decisions.

### Shared design system

- Use Plus Jakarta Sans with the platform system font as fallback, matching the mockup.
- Light palette: canvas `#F8F8F5`, white panels, ink `#1F2421`, muted text `#6E736E`, fine borders `#E2E2D9`, forest green `#1B382B`, soft green `#DDEBE2`, and restrained gold for budget warnings.
- Dark palette: canvas `#151A17`, panels `#202722`, ink `#EFF3EF`, muted `#A4AEA7`, borders `#384139`, green `#A5CBB7`, and soft green `#2B4034`.
- Keep the mockup's typography hierarchy: large, calm page headings; compact uppercase eyebrow labels; medium-weight card titles; small muted supporting text; tabular numerals for money and counts.
- Reuse the mockup's rounded geometry: approximately 19–21 px for main cards, 13–15 px for controls, and 22 px for the floating bottom bar. Use thin borders and restrained shadows; avoid heavy outlines, saturated fills, or dense dashboard styling.
- Keep green fills for the primary budget card and primary actions. Most content cards stay white/light-panel with a fine border.

### Screen-by-screen match

- **Home:** follow the mockup's order and density: date eyebrow, “Today” heading, strong green budget card, current/continue list card, two compact quick actions, then recent receipts. Preserve generous whitespace and short summaries.
- **Lists:** use the same page heading scale, compact store-group labels with small color dots, white rounded list cards, subtle metadata, and a clear green “New list” action. Keep actions and counts readable without turning each card into a dense control panel.
- **List detail:** use a compact back/title header, outlined summary card, green total, quiet budget chips, segmented Still needed/In cart control, restrained filters, simple divided item rows, and the inset add bar. Keep the Lists destination selected in the bottom bar, as in the mockup.
- **History:** use the same heading scale, a compact summary card, month labels, and quiet receipt rows with soft green receipt icons and right-aligned totals. Avoid introducing a different visual language for receipts.
- **Bottom bar:** reproduce the mockup's inset floating capsule, translucent panel, subtle light edge, soft shadow, backdrop blur, green active icon/label, and unfilled active state. It should not become a solid full-width footer or a filled selected-tab pill.

### Design acceptance check

Before calling the design stage done, capture the four screens at a 390 × 844 CSS-pixel mobile viewport and compare them directly with the reference mockup. Check the content order, relative card sizes, whitespace, type scale, colors, corner radii, and bottom-bar position. Iterate on visible mismatches instead of accepting a generic approximation. Then check 360 px width, dark mode, largest text scale, and safe-area insets for clipping or overlap. Wire the real actions and data after the static layout is visually aligned.

## Repository facts to use

- The app is React + TypeScript + Vite, wrapped for Android with Capacitor.
- The current app stores data synchronously in `localStorage` through `src/storage/storage.ts`; it does not use IndexedDB, Room, or SQLite.
- The current storage keys are `grocery-items-v1`, `grocery-daily-budget-v1`, and `grocery-receipts-v1`. Currency is kept separately as `grocery-currency-v1` in `src/storage/currency.ts`.
- The current item shape is `{ id, name, qty, price, checked }`. A receipt is an immutable trip snapshot with `id`, `finishedAt`, `currency`, `lines`, `total`, and `budget`.
- `useGroceryList` in `src/ui/hooks/useGroceryList.ts` owns list state and actions. Existing presentation components include `ShoppingList`, `SummaryCard`, `ReceiptsList`, `ReceiptDetail`, and `SettingsPage`.
- Preserve the current behavior documented in `README.md` and covered by the existing domain, storage, and UI tests.

The older Phase 3 stages document assumes IndexedDB and includes search, item memory, categories, and other additions. Treat it as background only. First adapt the plan to the repository facts above; do not introduce IndexedDB or those deferred features as part of this screen implementation.

## Included scope

1. Add a four-destination app shell: **Home**, **Lists**, **History**, and **Settings**.
2. Add support for multiple named shopping lists, with an optional store association so Lists can be grouped by store.
3. Reuse the existing grocery-list experience for a selected list, including quantities, prices, needed/in-cart tabs, swipe behavior, selection, undo, budget sheet, and Finish trip.
4. Add Home dashboard content: today's budget, a continue-shopping/open-last-list card, new/repeat trip actions where feasible from existing data, and recent receipts.
5. Move receipt browsing to History and retain receipt detail and confirmed deletion.
6. Add a safe, versioned migration from the current single-list localStorage keys.
7. Apply the accepted iOS-inspired look consistently, including the frosted floating bottom navigation and safe-area spacing.

## Out of scope for this pass

- Search, sorting, filters, categories, bulk moving items, and item memory.
- Cloud sync, accounts, sharing between users, and backend services.
- Replacing localStorage with IndexedDB or changing the Android persistence layer.
- Reworking the existing item editor or receipt calculations beyond what is needed to support multiple lists and an accurate daily budget on Home.

Record any issue that blocks this scope, but keep unrelated Phase 3 ideas for a later handoff.

## Data and migration approach

### Proposed persisted state

Keep the current `Item` shape to reduce risk to existing item components. Add a list record that owns its items:

```ts
interface ShoppingList {
  id: string;
  name: string;
  storeId: string | null;
  items: Item[];
  createdAt: string;
  updatedAt: string;
  lastShoppedAt: string | null;
  archivedAt: string | null;
}

interface Store {
  id: string;
  name: string;
  color: string;
}

interface AppStateV2 {
  schemaVersion: 2;
  lists: ShoppingList[];
  stores: Store[];
  receipts: Receipt[];
  activeListId: string | null;
}
```

The existing daily budget and currency can remain in their existing keys during this pass. Keep receipt fields backward-compatible; add optional `listId`, `listName`, and `storeName` snapshots so receipts retain context after a list or store is renamed/deleted. Existing receipts should continue to display using their saved currency, total, date, and budget.

Add an optional `remainingBudgetAtTime` receipt snapshot when finishing a trip so the receipt detail can show the budget result as it was at that time. Do not recalculate old receipts from the current budget or current list state.

Store associations should be optional. The first list created by migration is named **My list** and has no store. The Lists screen groups associated lists by store and shows unassigned lists under **No store**. A basic create/rename/delete store flow may be included if it is needed to make store grouping usable; deleting a store must leave its lists and receipts intact and set affected lists to no store.

### Migration rules

1. Add one versioned key, for example `grocery-app-state-v2`, and validate its structure when loading.
2. If a valid v2 state exists, load it and do not rerun migration.
3. If it does not exist, read the legacy item and receipt keys. Create one list named **My list**, preserving item IDs, names, quantities, prices, checked flags, and ordering. Preserve all receipts and their original currency/amount/budget; set legacy receipt list context to `listName: "My list"`, `listId: null`, and `storeName: null`.
4. Write the complete v2 record successfully before treating migration as complete. Keep the legacy keys unchanged as a recovery copy for this release; do not delete them during migration.
5. Make migration idempotent. Reopening the app must not duplicate lists or receipts. If input is malformed or storage is unavailable, fail safely without crashing or overwriting the legacy keys.
6. Keep the existing storage abstraction as the only place that touches `localStorage`. Update `GroceryStorage` with the smallest coherent API for loading and saving the versioned state; do not access storage from React components.

This is a localStorage data migration, not a SQL/Room database migration. No Android database migration is needed.

## Navigation and screen behavior

Use a small hash-based route layer (or an equally lightweight route state that works in both Vite/PWA and Capacitor WebView). Avoid adding a routing dependency unless the existing setup proves it is needed.

| Route | Screen | Bottom bar |
| --- | --- | --- |
| `/` | Home | Shown |
| `/lists` | Lists | Shown |
| `/lists/:listId` | Selected grocery list | Shown with Lists active, matching the approved mockup |
| `/history` | Receipt history | Shown |
| `/history/:receiptId` | Receipt detail | Shown with History active, unless the final layout clearly needs the detail to use the full screen |
| `/settings` | Existing settings | Shown |

Invalid list or receipt routes should return to their parent tab with a short notice. Keep tab navigation state separate from grocery domain logic. Preserve scroll position across tab changes where practical.

### Bottom navigation

- Four destinations: Home, Lists, History, Settings, each with an icon and readable label.
- Use the approved inset, rounded, translucent/frosted bar with a subtle border and soft shadow; avoid a full-width solid footer fill and avoid a filled selected-tab pill.
- Tint the active icon and label with the existing green accent. Include `aria-current="page"` and a visible keyboard focus state.
- Keep touch targets at least 48 dp and reserve `env(safe-area-inset-bottom)` so the bar and content are not obscured on Android or iOS-like device frames.
- Support light and dark themes using the existing design tokens. Respect reduced-motion preferences for route transitions.

## Screen implementation sequence

### Stage 1 — State model and migration, no visible redesign

- Extend domain types and pure list/store helpers.
- Extend the storage adapter and implement the v1-to-v2 migration described above.
- Add migration tests for empty storage, populated legacy storage, repeat launch/idempotency, malformed values, and write failure.
- Keep the app rendering the existing single-list experience backed by the first migrated list.

**Ready when:** existing items, budget, currency, and receipts load unchanged after migration, and current regression tests still pass.

### Stage 2 — App shell and route integration

- Add Home/Lists/History/Settings destinations and the bottom bar.
- Adapt existing grocery screen to receive a selected `listId` and operate only on that list.
- Move receipt browsing from Settings to History; keep Settings for its current settings content.
- Update Android Back behavior in this order: dismiss the top sheet/dialog or exit selection mode; leave a detail screen for its parent tab; return a non-Home tab to Home; on Home, use the existing app-background behavior.
- Preserve the existing budget sheet, delete dialog, undo, haptics, and safe-area behavior.

**Ready when:** route changes do not reset or mix list data; deep links and invalid IDs behave safely; existing screens remain reachable.

### Stage 3 — Lists and list management

- Show lists grouped under store headers, with **No store** last. Each card shows list name, item count, planned total, in-cart progress, and last-shopped status.
- Add create/open/rename/duplicate/archive/restore/delete actions. Duplicate copies items with new IDs and all items unchecked. Deleting a list confirms the item count and keeps receipts.
- Add the minimal store create/rename/recolor/delete flow needed for grouping. Store names are unique without regard to letter case. Store colors come from a small fixed palette.
- Track the most recently opened list. On first use, default to the migrated **My list**.
- New list creation should open the new list immediately.

**Ready when:** multiple lists are independent, store grouping works, and list deletion does not delete historical receipts.

### Stage 4 — Home dashboard

- Show a localized date and a compact global budget summary that opens the existing budget sheet. Define `spentToday` in one domain selector: sum today's receipts in the current currency plus the in-cart total of the active shopping list. Exclude receipts in a different currency and show a short note; never convert currencies. Use the same calculation on Home, the list summary, the budget sheet preview, and when saving `remainingBudgetAtTime` on a new receipt.
- Show the most recently updated list with in-cart items as **Continue shopping**; otherwise offer the last-used list. Add a **See all** path to Lists when helpful.
- Provide **New list** and, when receipts exist, **Repeat a trip**. Repeating a receipt creates a new list from its purchased lines with unchecked items and does not mutate the receipt.
- Show up to three recent receipts with a History link. Hide empty sections; on a fresh install show one clear create-list action.
- Derive dashboard content from pure selector functions so date/receipt/list calculations are testable.

**Ready when:** fresh install, active shopping, and post-trip states each show a useful next action and correct totals. Completing two trips on the same day must account for both receipts in the Home budget summary.

### Stage 5 — History and receipt details

- List receipts newest first, grouped by month or date in a way that fits the approved design.
- Reuse current receipt totals and currency snapshots. Each row opens a detail screen with purchased lines and the saved budget/date/total.
- Preserve confirmed receipt deletion and ensure deleting a list does not affect its receipts.
- Add list/store name snapshots when receipts are created so later renames/deletions do not rewrite history.

**Ready when:** legacy and new receipts remain readable, ordered, and independent of current list edits.

### Stage 6 — Finish and release checks

- Review dark mode, text scaling, safe areas, touch targets, screen reader labels, empty states, and scroll behavior.
- Verify app Back from Home, each tab, list detail, receipt detail, and open sheets/dialogs.
- Check offline PWA use and an Android Capacitor build after the web build/sync.
- Confirm migration using a copy of real legacy data and retain a documented recovery path using the untouched legacy keys.

## Regression requirements

All current behaviors continue to work within the selected list: add/edit items; quantities never below zero; needed/in-cart tabs; mark all; totals and budget sheet; swipe and confirmed deletion; undo; selection mode; finish trip; saved receipt currency; receipt detail and confirmed deletion; system theme and text scaling; Android Back; and haptic feedback.

## Verification plan

Add focused tests for pure domain functions, storage migration, list CRUD, selectors, and receipt-to-list repeat behavior using the existing Vitest setup. Include daily-budget cases for multiple same-day receipts, a different-currency receipt, and a current in-cart total. Update UI tests around routing and bottom navigation. Run the existing suite and production build after implementation; do not replace manual Android/PWA checks with unit tests.

Manual scenarios:

1. Upgrade a populated current install and confirm list items, budget, currency, and receipts remain intact.
2. Create two lists, assign stores, edit each list, and confirm changes do not leak between them.
3. Check items, finish a trip, and confirm the receipt appears in History and Home.
4. Delete or rename a list/store and confirm receipt snapshots still show the original trip context.
5. Repeat a trip and confirm the new list is independent and unchecked.
6. Test empty states, dark mode, largest text size, safe-area insets, keyboard-open list editing, and Android Back.

## Handoff instructions for the local agent

Implement one stage at a time in the order above. Before editing, inspect the current repository and treat its code as authoritative if names differ from this document. First build and visually compare the screen layout against the referenced mockup, then wire the real data and interactions. Keep each stage buildable, preserve user data, and report changed files plus test/build/manual verification results. Do not implement deferred Phase 3 features unless requested separately.

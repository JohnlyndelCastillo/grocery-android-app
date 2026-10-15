export const appTemplate = `
  <header class="hero">
    <div class="eyebrow">YOUR MARKET RUN</div>
    <h1>Grocery list<span class="hero-mark" aria-hidden="true">✳</span></h1>
    <p>Keep track of what you need and what’s in your cart.</p>
    <div class="totals" aria-label="Spending summary">
      <div id="cart-card" class="total-card cart-card"><span>In your cart</span><strong id="cart-total"></strong></div>
      <div class="total-card"><span>Planned total</span><strong id="planned-total"></strong></div>
    </div>
  </header>
  <main>
    <form id="budget-form" class="budget-form">
      <label for="budget-input">Today’s budget</label>
      <div class="budget-controls">
        <span aria-hidden="true">₱</span>
        <input id="budget-input" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Set a spending limit" />
        <button type="submit">Save</button>
      </div>
      <p id="budget-status" aria-live="polite"></p>
    </form>
    <form id="add-form">
      <label class="sr-only" for="new-name">New grocery item</label>
      <input id="new-name" placeholder="What do you need?" required autocomplete="off" />
      <button type="submit"><span aria-hidden="true">＋</span> Add item</button>
    </form>
    <section class="list-section" aria-labelledby="list-heading">
      <div class="section-heading">
        <div><h2 id="list-heading">Your list</h2><p>Tap an item when it’s in your cart.</p></div>
        <div class="heading-actions"><span id="item-count" class="item-count"></span><button id="toggle-select" class="text-button" type="button">Select for delete</button></div>
      </div>
      <div class="progress-track" role="progressbar" aria-label="Shopping progress" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0">
        <span id="progress-fill"></span>
      </div>
      <div class="check-all-row"><label><input id="check-all" type="checkbox" /> Mark all in cart</label></div>
      <div id="bulk-actions" class="bulk-actions" hidden>
        <label><input id="select-all" type="checkbox" /> Select all to delete</label>
        <button id="delete-selected" type="button" disabled>Delete selected</button>
      </div>
      <ul id="list"></ul>
      <p id="empty-state" class="empty-state">Your list is looking fresh. Add your first item above.</p>
    </section>
    <button id="uncheck" class="secondary"><span aria-hidden="true">↻</span> Start a new trip</button>
  </main>
  <dialog id="confirm-delete-dialog" aria-labelledby="delete-dialog-title" aria-describedby="delete-confirm-message">
    <div class="dialog-content">
      <h2 id="delete-dialog-title">Delete selected items?</h2>
      <p id="delete-confirm-message"></p>
      <div class="dialog-actions">
        <button id="cancel-delete" type="button" class="dialog-cancel">Cancel</button>
        <button id="confirm-delete" type="button" class="dialog-confirm">Delete items</button>
      </div>
    </div>
  </dialog>
`;

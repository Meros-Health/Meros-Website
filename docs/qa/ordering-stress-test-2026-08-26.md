# Ordering Workflow Stress Test: Findings (2026-08-26)

**Scope:** functional behaviour of the entire ordering workflow: bowl builder, signature menu, cart drawer, edit flow, checkout page and server action, contact form, navigation and page transitions, localStorage persistence, menu-data drift. Not UI polish, layout, or responsiveness.

**Mode:** diagnose and report only. No fixes were made. Each finding carries a one-line "likely fix area" so the remediation session starts from evidence rather than a pre-baked design.

**How to read this:** Section 1 is the summary. Section 2 is the Toast propagation gate (the things that must be true before any POS call exists). Section 3 is every finding by severity. Section 4 is what held up. Section 5 is observations that are not bugs. Section 6 is the coverage table. Section 7 is environment and method.

Severity rubric:

- **P0** data loss, wrong order contents, or anything that would submit an incorrect order server-side.
- **P1** dead-end or misleading state the user cannot recover from without a reload, or a defect that becomes P0 the day payment or Toast lands.
- **P2** silent wrong behaviour with a recovery path.
- **P3** rough edge or missing feedback.

---

## 1. Summary

- 87 cases planned, 81 executed (3 not applicable to current menu data, 3 skipped, see Section 6).
- **0 P0, 9 P1, 12 P2, 8 P3**, plus 9 confirmed-correct behaviours and 8 non-bug observations.
- **Can any of this reach Toast today?** No, because there is no Toast integration: `submitCheckout` ends at a `console.log`. But five of the P1s are exactly the class that would put a wrong or duplicate order into Toast once it exists (Section 2). Fix those before wiring a POS.

The five that matter most:

1. **A1 (your reported bug, confirmed):** removing the line you are editing leaves the editor live; Save shows "Saved", redirects to `/order`, and the bowl is gone. Root cause is a one-shot guard in the edit page plus a silent no-op in the store.
2. **F4 (class bug):** any exception inside `submitCheckout` or `submitContactForm` leaves the button stuck on "Placing Order..." / "Sending..." forever with no message. Triggered today by a malformed field; tomorrow by a Toast or Stripe network error.
3. **F2:** a double submit (double click, double Enter) creates two server-side orders with two order refs; the user sees one confirmation.
4. **F7:** `CHECKOUT_ENABLED` gates the UI only. The server action processes orders while checkout is "disabled".
5. **A11 / E8:** no cross-tab sync. A removed bowl comes back when another tab saves; an added item vanishes when a stale tab touches quantity. Last write wins, silently.

---

## 2. Toast propagation gate

These are the conditions under which client-side brokenness would reach a POS. None of them is guarded today.

| ID | Condition | Status today | Consequence with Toast |
|---|---|---|---|
| F7 | Server action honours `CHECKOUT_ENABLED` | Not enforced (UI-only flag) | Orders accepted while the store believes ordering is off |
| F2 | Idempotency per submit attempt | None (`orderRef` is random, generated after validation) | Duplicate tickets and charges from one double-click |
| F4 | Server action failures surface to the user | Unhandled: `handleSubmit` has no try/catch, `pending` never resets | Customer stuck on "Placing Order...", may retry in a new tab, no way to know if the order landed |
| ST-12 / F5-07 | Server normalises the selection before pricing | Not done: `readSelection` is structural only, `calcBowlPrice` does not dedupe | A tampered cart with 50 duplicate strawberries is accepted and priced at $108; the kitchen gets a nonsense ticket |
| F5ui | Validation errors identify the offending line | One generic message for the whole cart | Customer cannot fix a rejected cart; cart persists in the bad state |
| H4 | Stale client vs redeployed menu | Silent re-price or whole-cart reject, no message | Customer pays a different price than shown, or is stuck with a cart the server refuses |
| F8 | PII in logs | `console.log` of name, email, phone | Workers log retention becomes personal-data storage under the privacy policy |

---

## 3. Findings

### P1

#### A1. Removing the line being edited leaves the editor alive; Save reports success and the bowl is lost
- **Repro (browser, executed):** `/build`, add a bowl, drawer opens, click Edit. On `/cart/edit/<id>` open the cart, click Remove, close the drawer. The editor is still rendered and Save is enabled. Click Save: button flips to "Saved", 500 ms later the drawer opens on `/order` showing "No items yet."
- **Observed:** `A1_pageStillShowsEditor: true`, `A1_saveEnabled: true`, `A1_buttonTextAfterClick: "Saved"`, `A1_urlAfter: "/order"`, `A1_cartAfterSave: []`.
- **Root cause:** `app/cart/edit/[lineId]/page.tsx:31-50` runs its guard once (`initialized.current`) and computes `cartItem` from a non-reactive `getItem` call, so the page never reacts to the line disappearing. `store/cartStore.ts:188-191` `updateCustomBowl` returns silently when the line is missing. `components/build/EditBuildFooter.tsx:32-44` sets `saved` and schedules the redirect regardless of whether the update happened.
- **Variants confirmed:** A2 (keep editing after removal: no crash, state is just orphaned), A3 (reload the edit URL after removal: redirects to `/order` via plain `router.replace`, blank flash, no transition cover).
- **Likely fix area:** make the edit page subscribe to the line (`useCartStore((s) => s.items.find(...))`) and handle disappearance while mounted; have `updateCustomBowl` return a result the footer checks before showing "Saved".

#### A6. Editing a bowl into a duplicate merges quantities without the 99 clamp
- **Repro (store + browser, executed):** two custom lines at quantity 60 each, edit line B to match line A, Save.
- **Observed:** one line at **quantity 120**, drawer shows "× 120 $1440.00". Store harness: 60+60 = 120, 99+1 = 100. `incrementItem` on that line afterwards clamps it back to 99 in one click (silently "eating" 21 units).
- **Root cause:** `store/cartStore.ts:201-211` sets `quantity: i.quantity + current.quantity` directly instead of routing through `updateQuantity` (which clamps). Every other merge path clamps.
- **Consequence:** the server rejects quantity > 99 for the whole cart with a generic message (F5ui), so the user is stuck until they notice and reduce the line.
- **Likely fix area:** clamp in the merge branch, or route merges through `updateQuantity`.

#### F4. Any throw inside a server action strands the form on "Placing Order..." / "Sending..."
- **Repro (browser, executed, flag on):** prepend `<input type="file" name="name">` to the checkout form, submit. `formData.get("name")` is a `File`, `.trim()` throws.
- **Observed:** server 500, page error `TypeError: formData.get(...)?.trim is not a function`, button stuck on "Placing Order...", no error text, cart intact, Next dev overlay shown. Same on the contact form ("Sending..." forever).
- **Root cause:** `app/checkout/page.tsx:63-79` and `components/ui/Footer.tsx` `handleSubmit` await the action with no try/catch and only reset `pending` on the success path. `app/actions/checkout.ts:100-102` and `app/actions/contact.ts:12-14` cast `FormData` values to string without checking.
- **Why P1:** the trigger today needs a tampered form, but the failure mode is generic. When `submitCheckout` calls Toast or Stripe and that call throws or times out, every customer hits this.
- **Also:** F5-20 in the Node harness: a `null` element in the cart array throws `Cannot read properties of null (reading 'quantity')` inside `priceLine` (`app/actions/checkout.ts:56`), same stranded outcome.
- **Likely fix area:** try/catch around the action call with a user-visible error and `pending` reset in `finally`; type-check `FormData` values and array elements server-side.

#### F2. Double submit creates two orders
- **Repro (browser, executed, flag on):** `form.requestSubmit()` twice in one tick (equivalent to a fast double click or double Enter).
- **Observed:** server log shows two `[checkout]` entries with different `orderRef`s; the UI shows one confirmation; Node harness `Promise.all` of two submits: two distinct refs.
- **Root cause:** `disabled={pending}` only takes effect after the next render; no idempotency key; `orderRef` is generated server-side from time plus random after validation (`app/actions/checkout.ts:141`).
- **Likely fix area:** client-side in-flight guard (ref, not state) plus a client-generated idempotency key the server dedupes on. Mandatory before payment.

#### F7. Checkout gate is client-only
- **Repro (Node harness, executed):** call `submitCheckout` with `CHECKOUT_ENABLED = false`.
- **Observed:** `success`, order logged. `lib/config.ts` is imported nowhere in `app/actions/checkout.ts`.
- **Likely fix area:** check the flag (or a server-only env var) at the top of the action and return an error.

#### E1. Corrupted `meros-cart` JSON leaves hydration stuck; edit and checkout pages render blank forever
- **Repro (browser, executed):** `localStorage.setItem("meros-cart", "{{{")`, load `/cart/edit/<anything>`.
- **Observed:** after 4 s the URL is unchanged and there is no `<main>` at all (`E1_editBodyText: "NO MAIN"`). Home loads, badge shows 0, adding to cart works in memory and repairs storage on the next write. Node harness: `hasHydrated()` stays `false` after a parse failure.
- **Root cause:** zustand `persist` leaves `hasHydrated` false when `getItem`/deserialize throws; `app/cart/edit/[lineId]/page.tsx:21-27` and `app/checkout/page.tsx:37-43` render `null` until `hasHydrated()` or `onFinishHydration`, which never fires.
- **Likely fix area:** treat a hydration failure as "empty cart" (timeout or `onRehydrateStorage` error branch), and clear the bad key.

#### A11. Cross-tab: a removed bowl is resurrected by a save in another tab
- **Repro (two pages, one context, executed):** tab A on `/cart/edit/x`; tab B removes x; tab A changes size and saves.
- **Observed:** storage after B's removal: `[]`; after A's save: `[x (Large)]`; B reload shows "Cart (1 item)".
- **Root cause:** no `storage` event or `BroadcastChannel` sync; zustand persist writes the whole `items` array from each tab's in-memory copy (last write wins).

#### E8. Cross-tab: an added item vanishes when a stale tab touches quantity
- **Repro (executed):** both tabs on `/order` with one custom line; A adds a signature; B (stale) clicks + on the custom line.
- **Observed:** after A: `[x, Moment]`; after B: `[x q2]`. The signature bowl is gone.
- **Likely fix area (A11 + E8):** listen to `storage` events and rehydrate, or persist per-line writes. At minimum, re-read storage before every write.

#### ST-12 / F5-07. Server prices duplicate ingredient ids without deduping
- **Repro (Node harness, executed):** custom line with `fruits: ["strawberries" x 4]`: `calcBowlPrice` = $16 vs $12 for the sanitized bowl. 50 duplicates in one step: accepted (`MAX_STEP_PICKS` is exactly 50), priced $108.
- **Root cause:** `app/actions/checkout.ts:36-49` `readSelection` is structural only; `lib/menu/calcBowlPrice.ts:57-75` iterates raw ids. The client always sends sanitized selections (`normalizeSelection` on add, update, and rehydrate), so only a tampered request hits this, but it is the one path where a nonsense order is accepted.
- **Likely fix area:** run `normalizeSelection` (or at least a dedupe plus `select: "one"` check) server-side before pricing, and reject if it changes the selection.

### P2

#### A7 / B1. Footer timers fire after the user has left the page
- **A7 (executed):** click Save, then within 500 ms click the Build icon. Result: URL `/build` with the cart drawer open on top of the builder. Save's `push("/order")` was dropped by the transition, `openCart()` was not.
- **A7b (executed):** click Save, then browser Back within 500 ms. Result: URL `/order` with the drawer open. The user pressed Back and was taken forward instead, because the timer's push landed after Back's navigation released the cover.
- **B1 (executed):** Add to Cart on `/build`, click Our Menu within 600 ms. Result: `/order` with the drawer open on arrival.
- **Root cause:** `components/build/EditBuildFooter.tsx:40-43` and `components/build/BuildFooter.tsx:47-48` schedule `setTimeout`s that are never cleared on unmount.
- **Likely fix area:** keep timer ids in a ref and clear them in an unmount effect.

#### B2. Two clicks in one tick add two bowls
- **Repro (executed):** dispatch two clicks on Add to Cart before React re-renders. Result: one line, quantity 2. A real double-click on a fast machine does the same.
- **Root cause:** the button is replaced by "Added to cart" only after the state update commits; `handleAddToCart` has no in-flight guard.

#### E2. Tampered quantities survive rehydration and render as money
- **Repro (executed):** seed quantities `"5"`, `-5`, `2.7`, `null`, `1e9`. Badge reads `Cart (05-52.7null1000000000 items)`; drawer shows `× -5  $-60.00`, `× 2.7  $40.50`, `× 1000000000  $15000000000.00`, subtotal `$15000000040.50`. Increment on `"5"` yields 51. `updateQuantity(NaN)` is permanent (NaN passes `<= 0` and `Math.min`).
- **Root cause:** `store/cartStore.ts:94-119` `migrateCartItem` validates the selection and product but never the quantity or its type.
- **Server side:** every one of these is rejected by `priceLine` (quantity must be an integer 1..99), so nothing reaches the action. The cart is simply unusable until the line is removed.
- **Likely fix area:** coerce/validate quantity in `migrateCartItem` (integer, 1..99, else drop or clamp).

#### I2. Non-numeric money renders as `$NaN`
- **Repro (executed):** quantity `"abc"`: badge `Cart (0abc items)`, line `× abc $NaN`, subtotal `$NaN`. No crash (`NaN.toFixed` returns the string). Same root cause as E2.

#### E3. Duplicate `lineId`s: both lines mutate together; numeric `lineId` cannot be edited
- **Repro (executed):** two lines sharing `lineId: "dup"`: React key warnings, `+` on the second increments both, Remove removes both. `lineId: 42` (number): Edit navigates to `/cart/edit/42`, `getItem("42")` fails strict equality, redirect to `/order`. A line with no `lineId` is rendered and `removeItem(undefined)` removes it.
- **Root cause:** `migrateCartItem` does not validate `lineId` type or uniqueness.

#### F5ui. A rejected cart gives no indication which line is wrong
- **Repro (executed, flag on):** line at quantity 500 plus a valid line. Checkout renders `× 500 $6000.00`, submit returns "Something went wrong with your cart. Please try again." Cart unchanged. The user has no path to fix it other than guessing.
- **Root cause:** `app/actions/checkout.ts:132-138` returns one generic message for any bad line and discards the index.

#### H1, H2, H3. Menu drift silently drops or re-prices persisted lines
Node harness with seven `menu.json` variants against a seven-line persisted cart. Every case is silent: no toast, no "your cart changed" message anywhere in the app.

| Variant | Persisted cart after reload | Stale-client checkout of the old payload |
|---|---|---|
| Required-step ingredient removed (`plain-greek-yogurt`) | both plain bowls **dropped** | whole cart rejected |
| Optional ingredient removed (`strawberries`) | bowl kept, topping gone, price 14 → 12 | whole cart rejected |
| Fruits flipped to `required: true` | two fruit-less bowls **dropped** | whole cart rejected |
| Build size `large` removed | Large bowl silently becomes Medium, 15 → 12 | whole cart rejected (`large` unknown) |
| Signature `moment` removed, `silk.sizes.large` removed | both lines **dropped** (no size fallback for signatures, unlike custom bowls) | whole cart rejected |
| Medium price 12 → 14, Crunch medium 12 → 13.50 | re-priced silently | **accepted at the new price** (customer saw the old one) |
| Fruits `included` 2 → 1 | re-priced 14 → 16 silently | accepted at new price |

- **Root cause:** `lib/menu/selectionUtils.ts:112-130` and `store/cartStore.ts:94-119` are designed to sanitize silently; there is no diff or notification, and `onRehydrateStorage` drops lines via `catch {}`.
- **Likely fix area:** have migration return a change report (dropped lines, changed prices) and surface it once in the drawer.

#### E9. A future `persist` version bump without `migrate` hides the cart
- **Repro (executed):** storage `version: 7`. Console: "State loaded from storage couldn't be migrated since no migrate function was provided"; badge 0; storage still holds the items until the next write overwrites them.
- **Note:** no `version` is set today (defaults to 0). This is a trap for the first time anyone adds one.

#### G7. Resizing across the mobile breakpoint with the menu open leaves the desktop overlay stuck
- **Repro (executed on HEAD 72ee9ca):** open the menu at 500 px, resize to 1400 px. Toggle reads "Open menu" (`aria-expanded=false`), body overflow restored, but the four-panel desktop overlay is fully visible (screenshot: dark panels, HOME / ORDER / BUILD, header chrome dark-on-dark so the toggle is invisible). Escape does nothing (its handler is gated on `menuOpen`). Header icons still work through the overlay. Clicking the invisible toggle twice clears it.
- **Also:** desktop → mobile with the menu open closes the menu (by the new `[isMobile]` effect) but the mobile links remain in the DOM at opacity 0 for the exit window.
- **Likely cause:** the breakpoint effect sets `menuOpen=false` while `NavMenuOverlay` re-renders as a different tree inside `AnimatePresence`; the freshly mounted desktop panels have no exit animation to play. Realistic trigger: tablet rotation or a desktop window resize.

#### F8. PII in server logs
- `app/actions/checkout.ts:156` and `app/actions/contact.ts:26` log name, email, phone, message. Already flagged in a code comment. Workers log retention makes this personal-data storage before launch.

### P3

#### B3 / C2. "Added" feedback at the 99 cap when nothing was added
- Custom bowl identical to a line at 99: "Added to cart" shows, quantity stays 99. Signature at 99: button flips to "Added", quantity stays 99. `+` in the drawer at 99 is enabled and does nothing (D1).

#### D4. Body scroll lock leaks when the cart is opened programmatically while the nav menu is open
- **Repro (executed):** on `/cart/edit/<id>` open the menu, then trigger Save (its 500 ms timer calls `openCart()` directly, not the Navbar path that closes the menu first). Both overlays are open with `body.style.overflow = "hidden"`. One Escape closes both. Three seconds later, nothing open, `body.style.overflow` is still `"hidden"`.
- **Root cause:** `components/ui/CartDrawer.tsx:35-43` and `components/ui/Navbar.tsx` scroll-lock effects each capture `prevOverflow` at their own open time; the drawer captured `"hidden"` from the menu and restores it. The Navbar path (cart icon while menu open) is fine because `handleOpenCart` closes the menu first (D4b).
- **User impact:** programmatic scrolling and Lenis wheel scrolling still worked in the test, so the visible effect is limited to native scrollbar behaviour. Low, but it is a real leak.

#### E7. localStorage quota exhaustion throws out of the Add to Cart handler
- **Repro (executed):** fill storage to the byte, Add to Cart. `PAGEERROR QuotaExceededError` (uncaught), no drawer, no "Added" feedback, badge shows 1 (in-memory), reload shows 0.
- **Root cause:** zustand persist's sync `setItem` throws through `set`, which aborts `handleAddToCart` before its feedback lines. Storage disabled entirely (E7 addInitScript) is handled fine: app works in memory with no errors.

#### F5-26 / F5-28. No field length caps; letters accepted in phone
- 50,000-character names and 2 MB contact messages are accepted and logged. `"abc1234567890xyz"` passes the phone check (10+ digits after stripping). Arabic-Indic digits are rejected (regex `\D` is ASCII-only), which is fine.

#### F5-25. Unknown fields in cart lines pass through
- A 1 MB `pad` field on a line is ignored by the action (Next's default 1 MB body limit would block it at the transport in production; the harness bypassed the transport).

#### A8. Second Save click is blocked only by the disabled attribute
- Double-dispatching Save on the merge path: the second click times out on the disabled button. Fine in practice, but the guard is the DOM attribute, not the handler.

#### A9. Garbage `lineId`s
- `sig1` (signature line), `garbage`, `%3Cscript%3E`, `%00`: all redirect to `/order`, no reflection. `/cart`, `/cart/edit`, `/cart/edit/a/b`, `%2E%2E`: default Next 404 page (no `not-found.tsx`), which looks nothing like the site.

---

## 4. Confirmed correct under stress

- **Server re-pricing (F6):** client `unitPrice: 0.01` and `name: "Evil"` are ignored; totals recomputed from `menu.json`.
- **Server input validation (F5):** non-JSON, non-array, empty, 51 lines, quantity `0 / 100 / "99" / -1 / 2.5 / true / null / MAX_SAFE_INTEGER`, 51 picks, 20,000 junk step keys (12 ms), unknown ingredient, wrong step, signature wrong size, unknown product, incomplete bowl, two bases, prototype keys: all rejected with `status: "error"`. Boundaries are exactly 50/51 and 99/100.
- **Selection sanitizing (E5, E6, ST-9, ST-10):** both legacy shapes migrate correctly through `LEGACY_ID_MAP`; `constructor` / `__proto__` / `toString` ids are dropped harmlessly (`in` on a plain object resolves them, but `getStepForIngredient` is a `Map`, so they fall out); unknown size falls back to default; over-selection on a `one` step truncates; duplicates dedupe; non-array step values return null.
- **Rehydration resilience (ST-7, E1b):** `kind: "weird"`, custom without selection, `null` items, string items, missing nutrition, string `unitPrice`: dropped or repaired without crashing. `state` as a string, `items` as an object, `state: null`, literal `null`: all handled.
- **Page transitions (G1, G2, G3, G4, G2b):** the cover captures pointer events from the first frame (opacity 0.35 at 30 ms, `pointer-events: auto`), so a second click during a transition lands on the cover, not the link. Playwright's auto-wait made second clicks appear to "queue"; a real user's click is absorbed. Back during exiting/navigating/holding/entering: cover always released, cart button clickable, no ghost overlay. Two-second back/forward mashing: clean. Hung RSC fetch: the 4 s watchdog released the cover, URL and page consistent. Reduced motion: fine.
- **Edit page param change (A5):** `/cart/edit/A` → Edit on line B from the drawer remounts the page correctly (Vanilla selected, both lines intact after Save). The suspected stale-`initialized` bug does not occur.
- **Builder rules (B5, B7, B8, B9):** size toggle keeps selections and swaps only the base price; skip/select/skip bookkeeping is correct; clearing the base locks later steps, disables Next, shows "Select a Base", zeroes the price, and retains later picks; enhancer bundle pricing (3 for $7 + $3) and 10 extra fruits at $2 each price correctly ($42 bowl, correct in cart).
- **Signature menu (C1, C3):** same product at two sizes = two lines; same size merges; the size captured is the one shown.
- **Drawer (D2, D3, D4b, G7 mobile):** decrement at 1 disabled; removing the last line shows the empty state and disables Checkout; Escape and backdrop close it on every route with overflow restored; menu → cart icon path closes the menu first; mobile menu → cart works.
- **Checkout page (F1, F1b, F3):** flag off redirects `/checkout` to `/order`; flag on: empty cart redirects, success screen survives reload via `sessionStorage`, Back to Menu works, navigating away 30 ms after submit still completes the order and clears the cart, returning shows the confirmation.

---

## 5. Observations that are not bugs (decide, do not fix blindly)

- **Order-dependent "Included" pricing (B5):** with 2 fruits included, the third picked is the paid one. Deselect the first pick and the third becomes "Included"; reselect it and it is now the paid one. Correct per the rules, but the label moves between cards as the user toggles.
- **In-progress build is lost on reload (B6):** `bowlBuilderStore` is not persisted. Also lost on any full navigation.
- **Silent clamps (D1):** `+` at 99 does nothing, no feedback.
- **Signature lines carry `EMPTY_NUTRITION` (C4):** the drawer correctly hides the nutrition row for them; nothing divides by zero.
- **Migrated items are applied by in-place mutation (ST-11):** `onRehydrateStorage` assigns `state.items` after zustand has already notified subscribers with the raw items, and the raw (unmigrated) array stays in storage until the next write. With synchronous localStorage this happens before React mounts, so it is invisible today. It would show if storage ever became async.
- **Signature `addItem` does not validate product or size (ST-15):** only rehydration does. The UI cannot produce a bad one.
- **Default 404 (G8):** `/cart`, `/cart/edit`, `/nonexistent` show Next's bare 404. No `not-found.tsx`, `error.tsx`, or `global-error.tsx` exists; an uncaught render error anywhere is a white screen.
- **Dev-only console noise:** zustand v4 `getServerSnapshot should be cached` warning; framer "Invalid scope" warnings; one hydration-attribute mismatch error seen once during reduced-motion emulation, not reproduced on four subsequent reloads.

---

## 6. Coverage

Method: **S** static trace, **N** Node harness (esbuild bundle + fake localStorage, calling the store and server actions directly), **B** headless Chromium via playwright-cli against `next dev`.

| ID | Case | Method | Result |
|---|---|---|---|
| A1 | Remove edited line, Save | B | **FAIL P1** |
| A2 | Remove edited line, keep editing | B | pass (orphaned, no crash) |
| A3 | Reload edit URL after removal | B | pass (redirect, blank flash) |
| A4 | Store decrement at 1 | N | removes line (UI floor only) |
| A5 | Edit page param change | B | pass (remounts) |
| A6 | Edit into duplicate 60+60 | N, B | **FAIL P1** (120) |
| A7 / A7b | Save then nav / Back within 500 ms | B | **FAIL P2** |
| A8 | Double Save on merge path | B | pass (attribute-guarded) |
| A9 | Bad lineIds and URLs | B | pass, default 404 noted |
| A10 | Deselect base in edit mode | B | pass |
| A11 | Cross-tab remove while editing | B | **FAIL P1** |
| B1 | Add then nav within 600 ms | B | **FAIL P2** |
| B2 | Double-dispatch Add | B | **FAIL P2** |
| B3 | Add identical at 99 | B | **FAIL P3** |
| B4 | Hard-cap boundary | n/a | no hard-cap step in current menu |
| B5 | Size toggle mid-build | B | pass (label mobility observed) |
| B6 | Reload mid-build | B | observation |
| B7 | Skip / select / skip | B | pass |
| B8 | Clear base after later picks | B | pass |
| B9 | Bundle pricing, all 12 fruits | B | pass |
| C1 | Signature sizes and merge | B | pass |
| C2 | Signature at 99 | B | **FAIL P3** |
| C3 | Size then add, rapid | B | pass |
| C4 | Signature nutrition | B, S | pass |
| D1 | Increment at 99 | B | **FAIL P3** (silent) |
| D2 | Decrement at 1, remove last | B | pass |
| D3 | Drawer on every route, Escape, backdrop | B | pass |
| D4 | Menu + drawer, single Escape | B | **FAIL P3** (overflow leak) |
| D4b | Menu then cart icon | B | pass |
| D5 | Edit during transition | B | pass (absorbed by cover) |
| D6 | Checkout during transition | B | pass (absorbed by cover) |
| D7 | Badge before hydration | not run | cosmetic |
| E1 | Invalid JSON in storage | N, B | **FAIL P1** |
| E1b | State string, version bump | N, B | pass / **P2** (E9) |
| E2 | Quantity tampering | N, B | **FAIL P2** |
| E3 | lineId tampering | N, B | **FAIL P2** |
| E4 | kind tampering | N | pass |
| E5 | Legacy payloads, proto keys | N | pass |
| E6 | Unknown ingredient/size/over-select | N | pass |
| E7 | Storage disabled / quota | B | pass / **FAIL P3** |
| E8 | Cross-tab add vs increment | B | **FAIL P1** |
| E9 | Version bump without migrate | N, B | **FAIL P2** |
| F1 / F1b | Gating, success reload, Back to Menu | B | pass |
| F2 | Double submit | N, B | **FAIL P1** |
| F3 | Navigate away mid-submit | B | pass |
| F4 | Server action throws | N, B | **FAIL P1** |
| F5 | 31 fuzz payloads | N | pass except F5-07 (**P1**), F5-20 (**P1**, see F4), F5-25/26/28 (**P3**) |
| F5ui | Tampered quantity through the UI | B | **FAIL P2** |
| F6 | Client price ignored | N | pass |
| F7 | Flag bypass | N | **FAIL P1** |
| F8 | PII log | S, B | **P2** (known) |
| F9 | Contact form: submit, File blob, nav away | N, B | pass / **FAIL P1** (F4 class) / pass |
| G1 | Two clicks in exit window | B | pass |
| G2 | Back during each phase | B | pass |
| G2b | Reduced motion | B | pass |
| G3 | Back/forward mashing | B | pass |
| G4 | Hung RSC fetch, watchdog | B | pass |
| G5 | Hash on reload | B | pass |
| G6 | Wordmark with menu open then nav | B | pass |
| G7 | Menu overlay resize, Escape, mobile | B | **FAIL P2** (stuck overlay), focus not returned after Escape on mobile |
| G8 | Direct loads and 404s | B | observation |
| G9 | Reload every route with a cart | B | pass |
| H1 | Ingredient removed (required / optional) | N | **FAIL P2** |
| H2 | Step required, size removed, included lowered | N | **FAIL P2** |
| H3 | Signature product / size removed | N | **FAIL P2** |
| H4 | Stale client vs new server menu | N | **FAIL P2** |
| I1 | Unguarded property access grep | S | `app/order/page.tsx:77` and `SignatureMenuSection.tsx:33,152` index `item.sizes[sizeId].price` without a guard; only reachable with stale component state after a menu drift redeploy |
| I2 | NaN money | B | **FAIL P2** |
| I3 | Uncaught render error in OpenNext build | not run | optional, needs a Workers build |
| ST-11 | Migration by in-place mutation | N, B | observation |
| ST-12 | Server does not dedupe | N | **FAIL P1** |
| ST-14 | addItem with incomplete selection | N | silent no-op (UI prevents) |
| ST-15 | Signature addItem unvalidated | N | observation |

---

## 7. Environment and method

- Repo HEAD at the end of the run: `72ee9ca` ("feat: mobile nav is a content-height drop panel under the bar"). The tree moved during the session: exploration was done at `6cc9e21`, browser runs started at `6cc9e21` plus uncommitted Navbar/NavMenuOverlay edits (landed 00:35), and finished on `72ee9ca` (00:57). Working tree clean at the end apart from this report. Menu-overlay findings (G7, D4) were re-verified on `72ee9ca`.
- Node v22.23.1. Headless Chromium via `playwright-cli` 1400x900 (500x800 for mobile cases). `next dev` on port 3001 (port 3000 belongs to another project).
- `lib/config.ts` `CHECKOUT_ENABLED` was flipped to `true` for the F-series browser cases and reverted; `git diff lib/config.ts` is empty.
- Node harness: esbuild bundle of the real modules with `@` aliased to the repo root and `@/lib/menu/menu.json` swapped per drift variant; a `MemStorage` polyfill for `localStorage` loaded via `node --import`; `useCartStore.persist.rehydrate()` between seeded payloads; `submitCheckout` called directly with `FormData`. Scripts lived in the session scratchpad and are not in the repo; rebuilding them is about 60 lines (bundler, storage polyfill, runner) and the case list above is the spec.
- Dev-server caveat: `next dev` corrupted its cache once mid-run (500 `__webpack_modules__[moduleId] is not a function` after forced full reloads) and was restarted with a clean `.next`. Not a product defect; noted so nobody chases it.
- Every P1 has an executed repro (harness output or browser result). Static-only items are marked S in the coverage table.

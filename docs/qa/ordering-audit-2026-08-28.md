# UI/UX Stress Test and Audit: Findings (2026-08-28)

**Scope:** the tree about to be deployed with checkout Coming Soon: the signature add modal and the yogurt choice, the edit modal, the cart drawer and persistence, the bowl builder and edit page, nav and overlays, checkout (as a pre-flight for the next deploy, flag on), the home page sections, the contact form, legal and SEO. Follows [ordering-stress-test-2026-08-26.md](ordering-stress-test-2026-08-26.md); every P1 in that report now has a fix and a test, and this audit spot-checked them through the suite rather than re-running each repro by hand.

**Mode:** diagnose and report. No fixes were made. Thomas's decision at each area checkpoint was "log all, fix none now"; Area 6 items go on the next-deploy gate.

**How to read this:** Section 1 is the summary and the deploy verdict. Section 2 is the gate for the deploy that opens ordering. Section 3 is every finding by severity. Section 4 is what held up. Section 5 is observations that are not bugs. Section 6 is the coverage table. Section 7 is environment and method.

Severity rubric (unchanged):

- **P0** data loss, wrong order contents, or anything that would submit an incorrect order server-side.
- **P1** dead-end or misleading state the user cannot recover from without a reload, or a defect that becomes P0 the day ordering goes live.
- **P2** silent wrong behaviour with a recovery path.
- **P3** rough edge or missing feedback.
- **OBS** observation, not a bug: decide, do not fix blindly.

---

## 1. Summary

- 78 cases planned, 78 executed (some by static trace or the existing suites where noted).
- **0 P0, 0 P1, 0 P2, 15 P3**, plus 12 observations.
- Baseline on the deploy tree (HEAD `f334c09` plus the uncommitted work): lint clean, `tsc` clean, `validate:menu` ok (62 ingredients, 5 steps, 10 signatures), **182 unit tests pass, 114 e2e tests pass** (4.8 min, flag-on production build).
- **Verdict: ship.** Nothing found loses a cart, prices wrongly, or dead-ends a customer. Every P3 is feedback, touch-target, focus, or contrast polish. Two of them are worth doing before the deploy that opens ordering (C3-05, K6-06); the rest can land whenever.

The five worth knowing about:

1. **C3-05:** with a yogurt-less bowl in the cart (only carts saved before today can have one), the drawer's Checkout stays enabled; the customer fills the form and is refused after submit. Recoverable in four clicks, but it is the one place the new yogurt rule reaches the customer late. Gate item for the ordering deploy.
2. **S1-07:** a double-tap on a bowl "+" opens the add modal and the second tap closes it (it lands on the backdrop). A single tap again works.
3. **S1-14 / S1-13:** on a phone the modal's toggles, chips, Close, and the ledger "+" are 31 to 33 px against the 44 px floor the suite itself cites, and the bottom sheet's footer has no safe-area inset, so Add and Cancel sit under the iPhone home indicator.
4. **C3-11:** the cart drawer has no focus trap and drops focus to body on close (the signature modal does both correctly). Keyboard users can Tab into the page behind the backdrop.
5. **B4-01:** grapefruit on cream is 2.47:1; every place the UI uses it for 12 to 14 px text (the builder's "Extras +$2 each" line once the free picks are used, "Choose one", "Choose your yogurt", the "+$2" hints) is under AA.

---

## 2. Next-deploy gate (before `NEXT_PUBLIC_CHECKOUT_ENABLED=true` ships)

| ID | Condition | Status | Consequence if skipped |
|---|---|---|---|
| C3-05 | Checkout disabled (with the hint) while any line lacks a yogurt; the line flagged on /checkout before submit | Not done: drawer Checkout enabled, /checkout shows the grapefruit "Choose your yogurt" but no error until submit | The customer types name, email, phone, submits, is refused, and has to find Edit cart, Edit, pick, Save, resubmit. P2 once orders are real |
| K6-06 | Form-level server errors announced and focused | Not done: "All fields are required." renders with no `role="alert"`, focus stays on body | Screen-reader users get no feedback on a rejected submit |
| K6-08 | Durable idempotency store | Standing: `MemoryOrderDedupe` is per-isolate | Duplicate tickets under retries across Workers isolates. Toast prerequisite, unchanged from the 2026-08-26 report |
| K6-07 | Decide: after a successful order, should a return to /checkout in the same tab show the old confirmation or the menu? | Shows the confirmation (sessionStorage) | Not a defect, a product call |

Everything else the flag-on pass exercised held: F1/F2/F4/F5ui (suite), the yogurt-less line's full recovery path (marked line, Edit cart, modal over the drawer over /checkout at z-index 135, Save disabled until a pick, resubmit succeeds), `price-changed` shows Reload and hides Edit cart, `base` shows Edit cart and not Reload, native email validation blocks a bad address before the action, whitespace-only name is refused server-side, the flag-off `/checkout` redirects to `/order`, and `submitCheckout` returns `closed` when called with the flag off.

---

## 3. Findings

### P3

#### S1-07. Double-tap on a bowl "+" opens the modal and closes it again
- **Repro (browser, executed, /order and the homepage ledger):** `dblclick` on a bowl's Add to Cart. Modal count 0 at 60 ms and 0 at 760 ms. Two clicks 120 ms apart at the same point: modal count 0, element at the point afterwards is the button.
- **Root cause:** the first click opens the modal; the panel animates in from below and the backdrop (`onClick={onClose}`) is already under the pointer, so the second click closes it.
- **Likely fix area:** `components/cart/SignatureModal.tsx`: ignore backdrop clicks in the first ~350 ms after open (or ignore a click whose `pointerdown` predates the open).

#### S1-06 / S1-16. Add closes the modal with no feedback at the 99 cap or when the item became unpriceable
- **Repro (store harness, executed):** a matching line at 99, `openAdd`, `addFromModal` returns `"at-max"`, `addingProductId` is null, `lastModalAdd` unchanged, no beat on the opener. Same shape when `calcSignaturePrice` returns undefined under an open dialog (`SignatureModal.tsx` add-mode `onSubmit`): `closeAdd()` and nothing else.
- **Why P3:** needs 99 of the identical configuration, or a menu redeploy while the dialog is open.
- **Likely fix area:** keep the dialog open and print an inline line ("This item is already at its maximum of 99" / "This item is no longer available"), or raise the drawer notice.

#### S1-20. Focus is lost after a keyboard add through the modal
- **Repro (browser, executed):** focus a bowl's Add to Cart, Enter, Tab through the dialog (order: Medium, Large, Plain, Vanilla, High Protein, Vegan Coconut +$2, then the recipe chips), Space on a size and a yogurt, Enter on Add to cart. `document.activeElement` is `body`.
- **Root cause:** the dialog restores focus to its opener on unmount, but the opener is `disabled` for the 900 ms beat (`AddToCartButton` sets `disabled={added}`), so the browser refuses it. With a mouse, Escape and Cancel return focus correctly (the opener is not disabled then).
- **Likely fix area:** `aria-disabled` plus an early return instead of `disabled` on the beat, or focus the opener after the beat.

#### S1-14. Touch targets under 44 px on a phone
- **Measured (390 x 844, executed):** ledger "+" 32 x 32; size toggle 33 px tall; yogurt toggle 33 px (10 px type); chips 33 px; modal Close 31 px; Add to cart and Cancel 41 px; drawer stepper 32 x 32; Close cart 31 px; Checkout 41 px; Edit and Remove 37 px. The suite's own floor (`responsive.spec.ts`) is 44 px, but it measures only the /order Add to Cart button, which is 44 (it carries `minHeight: 44px`).
- **Likely fix area:** `minHeight: 44px` on the modal footer buttons and both toggles; a padding or pseudo-element hit area on the 32 px "+" and stepper so the visual stays.

#### S1-13. Bottom sheet footer has no safe-area inset
- **Measured (390 x 844, executed):** sheet 84 to 844, Add/Cancel row bottom at 824, footer padding 20 px, no `env(safe-area-inset-bottom)`.
- **Consequence:** on iPhones with the home indicator the row sits under it.
- **Likely fix area:** `padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))` on the sheet footer; confirm `viewport-fit=cover`.

#### S2-05. Save on a line that vanished returns "missing" and the modal closes silently
- **Repro (store harness, executed):** `updateSignatureLine("nope", ...)` returns `"missing"`. In `SignatureModal.tsx` edit-mode `onSubmit` the result is discarded and `closeEdit()` runs regardless.
- **In the browser:** removing the line in another tab while the modal is open auto-closes it before Save can be pressed (S2-04, pass), so the window is one tick. Still the one path in the component that swallows a result.
- **Likely fix area:** branch on the result: `"missing"` raises the drawer notice, `"invalid"` keeps the dialog open with the yogurt prompt.

#### C3-03. A Recovery line saved before 2026-08-28 rehydrates on Vanilla with no notice
- **Repro (store harness, executed):** persisted `{ productId: "recovery", size: standard, unitPrice: 15 }` with no `base`. After rehydrate: `base: "vanilla-greek-yogurt"`, `notice: []`.
- **Root cause:** `diffLine` reports `base-changed` only when `raw.base` is a string; a line with no `base` is treated as "never had one". The Recovery's default moved from Plain (its old recipe) to Vanilla (the smoothie default) in the same change.
- **Why P3 not P2:** only carts persisted before this deploy, and checkout was never open, so no order was ever placed against the old default.
- **Likely fix area:** treat "no `base` on a signature whose recipe used to name one" as a change worth one notice line, or accept and move on.

#### C3-05. Checkout is enabled with a yogurt-less line; the refusal comes after the form
- **Repro (browser, flag on, executed):** seed a bowl line with no `base`. Drawer: "Choose your yogurt" in grapefruit, Checkout enabled. /checkout: the line shows the prompt, no error, Place Order enabled. Fill, submit: line marked, alert "Choose a yogurt for this item before ordering.", Edit cart button, Place Order re-enabled. Edit cart, Edit, pick Plain, Save (merged into the identical line), close drawer, Place Order: Order Received, cart empty.
- **Likely fix area:** `components/ui/CartDrawer.tsx` disable Checkout with the hint while `items.some(i => i.kind === "signature" && !i.base)`; `app/checkout/page.tsx` flag such lines before submit.

#### C3-11. The cart drawer neither traps nor restores focus
- **Repro (browser, executed):** open the drawer: focus lands on Close cart after 500 ms (good). Escape, Close cart, or backdrop: `document.activeElement` is `body` every time. Open the drawer from the keyboard and Tab: Increase quantity, Edit, Remove, then `body`, then Open menu, MERŌS home, Build your bowl, Our Menu, Cart, Add to Cart (the page behind the backdrop) while the drawer has `aria-modal="true"`.
- **Contrast:** the signature modal uses `lib/useFocusTrap.ts` and restores focus to its opener; Escape on the modal over the drawer returns focus to the line's Edit button (S2-07, pass).
- **Likely fix area:** `CartDrawer.tsx`: `useFocusTrap` on the panel and focus the cart button on close.

#### B4-01. Grapefruit text on cream is 2.47:1
- **Measured (executed):** `--color-grapefruit #d78e77` on `--color-cream #fff7f0` = 2.47:1; `--color-juniper #818a83` on cream = 3.36:1. The builder's 14 px instruction line turns grapefruit when the included picks are used (`data-extras-next="true"`, `rgb(215,142,119)`), with no layout shift (panel 694.25 px before and after). The same colour carries "Choose one" (12 px), "Choose your yogurt" (12 px), the modal's "+$2" hints, and the "Vegan Coconut +$2" chip label on a grapefruit fill.
- **AA needs 4.5:1 for text under 18 px / 14 px bold.** Juniper body text is also under it, site-wide (OBS, a design decision).
- **Likely fix area:** a darker text-only grapefruit token (around `#b5624a` lands near 4.5:1) for copy, keeping the current one for fills and borders; or pair the colour change with a weight change so the state does not rest on colour alone.

#### B4-02. The 700 ms instruction colour transition stays on under reduced motion
- **Measured (executed):** `transition-duration: 0.7s` with `prefers-reduced-motion: reduce` emulated.
- **Likely fix area:** `motion-reduce:transition-none` on `[data-step-instruction]`.

#### B4-07. /build has 2 px of horizontal overflow at 320 px
- **Measured (executed):** `scrollWidth 322` vs `innerWidth 320`. The responsive suite checks sideways scroll at device widths from 360 up, so this sits below its floor.

#### K6-06. Server-side form error is not announced
- **Repro (browser, flag on, executed):** name of three spaces, valid email and phone, Place Order. "All fields are required." appears inside the form, no `role="alert"` / `aria-live` anywhere on the page, focus on `body`, the name field not marked invalid.
- **Likely fix area:** `app/checkout/page.tsx`: `role="alert"` on the form message, focus the first invalid field.

#### F8-01. Contact form success and error states are not announced
- **Repro (browser, executed):** valid submit: the form is replaced by "THANKS We're still setting up the inbox behind this form. Email us at info@merosyogurt.com and we'll get right back to you." No live region in the footer.
- **Likely fix area:** `components/ui/Footer.tsx`: `role="status"` on the confirmation, `role="alert"` on the error.

#### H7-01. The Build strip's loop seam shows on ultrawide viewports
- **Measured (3440 x 1440, executed, screenshot in the scratchpad):** the row is 10 windows (two sets of 5) at 5624 px; one set is 2812 px. At `translateX(-2572)` the last window's right edge is 3029, at `-2476` it is 3125, both short of 3440, so 300 to 400 px of cream shows on the right every cycle. 2560 and 1920 are fine. `BuildSection.tsx` says 5 cards "exceed any common viewport width"; they do not exceed 3440.
- **Likely fix area:** repeat the set until one set is at least the widest viewport you care about (three sets covers 4K at 4218 px), or derive the repeat count from `innerWidth`.

---

## 4. Confirmed correct under stress

- **Add modal (S1-01 to S1-05, S1-08 to S1-12, S1-15, S1-17 to S1-19):** a bowl "+" opens a blank dialog ("Choose a size", both "Choose one" prompts, Add disabled, focus on Close after the panel settles, `aria-modal`, body overflow hidden); size alone and yogurt alone each clear their own prompt and Add enables only with both; Vegan Coconut shows "+$2" on the chip and "$14.00 (+$2.00)" on the price line and drops back to $12.00; 2 of 2 additions and 2 of 2 removals disable the rest (40 of 42, 6 of 8 chips) and re-enable on deselect; a smoothie adds in one press with the 900 ms beat and a second press in the beat does nothing (measured with element handles: "Added" for 900 ms on /order, "The Rise added to cart" for 900 ms on the ledger); an add that went through the modal lights the opener that opened it and not the same product's card on the other surface; Escape, backdrop, Cancel and Close all close and a reopen is blank; "+" during a page transition is absorbed by the cover; Back with the dialog open leaves no dialog, no lock, and the previous page; reload never restores it; the page scroll position is unchanged after close (1302 before and after on the pinned ledger); a resize across `md` swaps sheet and centred dialog and back with the lock intact; the Seasonal stage card turns on click, closes on Escape, lifts on mouse hover only, and resets when another row activates, and it is the only stage item that takes pointer events.
- **Edit modal (S2-01 to S2-04, S2-07 to S2-09):** a line with no yogurt opens with nothing pressed and Save disabled; a swap to Vegan Coconut re-prices the line to $14.00 and the drawer shows "Vegan Coconut Yogurt"; an edit into a duplicate merges under the cap (98 + 1 = 99, "+" reads "Maximum quantity reached"); a removal in another tab closes the dialog and leaves the drawer; Escape closes only the dialog and returns focus to the line's Edit button; the dialog sits at z-index 135 over the drawer on every route including /checkout; a click on Edit during the exit animation is absorbed rather than reopening a stale draft.
- **Drawer and persistence (C3-01, C3-02, C3-06, C3-08 to C3-10):** base text under every signature line, mods text, the grapefruit prompt on a line without one; the notice engine reports `base-changed` and dropped lines (a persisted Bloom line: "The Bloom · Medium is no longer available and was removed."; a Tropic line is renamed "The Tropics · Medium" from the catalog); tampered `base` values (number, object, null, empty string, a topping id) never crash and never price wrongly (bowl unset, smoothie on Vanilla); `mods` as a string or with non-array fields is dropped; storage cleared in another tab empties the open drawer and the badge; minus at 1 disabled, plus at 99 disabled, removing the last line shows "No items yet." and Coming Soon stays disabled with `aria-disabled`.
- **Builder and edit page (B4-03 to B4-06):** covered by the suite (A1, A7, B1, B2, E1) and the drift tests; `%3Cscript%3Ealert(1)%3C%2Fscript%3E`, `%00`, `sig1`, `%2e%2e%2f%2e%2e` all land on /order with nothing reflected; `..` and `a/b` land on the site's own 404.
- **Nav, overlays, transitions (N5-01 to N5-06):** the scroll lock refcount returns to zero and Lenis restarts after menu, drawer, modal and every combination; the header is sealed under the drawer backdrop (hit test lands on the backdrop); Escape closes one layer at a time (modal, then drawer, then nothing); two nav clicks 60 ms apart land on the first route with the cover released; Back 150 ms into a transition lands on the previous route with the cart clickable; /cart, /cart/edit, /cart/edit/a/b, /nonexistent return 404 with the site's page; /checkout redirects to /order with the flag off.
- **Checkout, flag on (K6-01 to K6-05, K6-07, K6-09):** see Section 2. Server fuzz on `base`: empty string rejected as `unavailable`; a `base` on a custom line is ignored; a vegan smoothie at $17 succeeds and the order line reads "The Rise · 24 oz · Vegan Coconut Yogurt", at $15 it is `price-changed`; a smoothie without a `base` prices on Vanilla.
- **Home (H7-02 to H7-05):** hero alts read "The Tropics bowl"; zero 4xx responses across a full-page scroll; the Seasonal renders a photo card on /order (477 px stage tile at 1400 wide, 64 px ledger thumb); Pairings excludes items without photography by construction.
- **Contact (F8-02, F8-03):** required fields block natively before the action; the textarea clamps at 2000; Send during a page transition is absorbed; a double-click sends once; footer links are sealed under the drawer backdrop.
- **Legal and SEO (L9-01 to L9-03):** suite green; the structured data is a Restaurant on / and a BreadcrumbList on /order with no menu items, so the Seasonal's missing images and the Tropics rename cannot leak; privacy and terms render with no TODO text.

---

## 5. Observations that are not bugs (decide, do not fix blindly)

- **S2-06:** `updateSignatureLine` with a yogurt id the menu does not offer returns `"invalid"` on a bowl (line unchanged) but `"updated"` on a smoothie with the yogurt silently replaced by the default. The UI cannot send one; only a menu redeploy under an open dialog can.
- **C3-08 copy:** tampered `base` strings produce notice text with an empty or wrong title: `" is no longer available. Choose a yogurt for The Moment · Medium."` and `"Strawberries is no longer available. Choose a yogurt for..."`. Tamper-only; the real drift case (a yogurt removed from the Base step) reads correctly.
- **C3-04:** a persisted Cabana "no bananas" removal is dropped without a notice now that bananas left the recipe (documented: a removal that no longer applies changes nothing the customer pays for).
- **C3-07:** the cart badge reads "Cart (0 items)" for about 100 ms before hydration, then the real count.
- **K6-07:** after a successful order, a return to /checkout in the same tab shows the confirmation from sessionStorage rather than the menu.
- **K6-06 phone:** letters in the phone field are accepted ("abc1234567890xyz" placed an order). Documented rough edge from the 2026-08-26 report.
- **K6-08:** `MemoryOrderDedupe` is per-isolate. Unchanged.
- **H7-07:** the Instagram section still shows `bowls/bloom.png`; the asset exists and loads. The Bloom is retired from the menu.
- **H7-06:** reveal order and timing on the home sections were not instrumented in this pass; a manual check against the 1.0 to 1.4 s, staggered-by-hierarchy rules is still open.
- **F8-01 copy:** the contact form's success state says the inbox behind it is not set up yet. Accurate (no email service is wired); confirm it is the copy you want live.
- **B4-01 juniper:** body copy in juniper on cream is 3.36:1 site-wide. A design decision, noted once.
- **Manifest variants:** a fresh checkout fails `imageManifest.test.ts` until `npm run images` has run (537 variants). `prebuild` runs it, so builds are unaffected; anyone running `vitest` cold will see it.

---

## 6. Coverage

Method: **S** static trace, **N** Node harness (Vitest against the real modules, `loadWithMenu` for drift, scratch test files `zz-audit-store.test.ts` and `zz-audit-action.test.ts`), **E** the committed e2e suite, **B** ad-hoc Chromium via `playwright-cli run-code` against the served build on port 3003.

| ID | Case | Method | Result |
|---|---|---|---|
| S1-01 | Bowl "+" opens a blank modal; smoothie adds in one press | B, E | pass |
| S1-02 | Size only, yogurt only, both | B | pass |
| S1-03 | Vegan +$2 on chip and price line | B | pass |
| S1-04 | "From $12.00" on bowls, "$15.00" on smoothies, both surfaces | B | pass |
| S1-05 | Addition and removal caps | B, E | pass |
| S1-06 | Add at the 99 cap | N | **P3** (silent) |
| S1-07 | Double-tap "+" | B | **P3** (bowl: modal opens and closes); smoothie: pass |
| S1-08 | "+" during a transition | B | pass (absorbed) |
| S1-09 | Modal then Back, nav behind backdrop, reload | B | pass |
| S1-10 | Resize across md with the modal open | B | pass |
| S1-11 | Escape, backdrop, Cancel, Close, focus return, aria | B | pass |
| S1-12 | Scroll lock, inner scroll, scroll position, pinned ledger | B | pass |
| S1-13 | Phone viewport: sheet fit, safe area | B | **P3** (no safe-area inset) |
| S1-14 | Touch targets | B | **P3** |
| S1-15 | Beat lights the opener only | B | pass |
| S1-16 | Menu drift under the open modal | N, S | **P3** (silent close) |
| S1-17 | The Seasonal on /order, ledger, stage | B | pass |
| S1-18 | Seasonal flip open plus add modal, Escape | B | pass (activating another row resets the flip first) |
| S1-19 | Cross-tab at-max | N | same as S1-06 |
| S1-20 | Keyboard-only add | B | **P3** (focus lost after add) |
| S2-01 | Legacy line without yogurt: prompt, Save disabled | B, E | pass |
| S2-02 | Yogurt swap re-prices | B, E | pass |
| S2-03 | Edit into a duplicate near the cap | B | pass |
| S2-04 | Line removed while the modal is open | B | pass |
| S2-05 | Save after removal in another tab | N | **P3** (result discarded) |
| S2-06 | Unknown yogurt on save | N | OBS |
| S2-07 | Escape over the drawer | B | pass |
| S2-08 | Modal over the drawer on every route, /checkout included | B | pass |
| S2-09 | Reopen after Cancel mid-exit | B | pass (click absorbed) |
| C3-01 | Line rendering | B | pass |
| C3-02 | base-changed notice, dismiss, cross-tab silence | N, E | pass |
| C3-03 | Recovery default change | N | **P3** (silent) |
| C3-04 | Bloom, Tropic, Cabana persisted lines | N | pass, OBS |
| C3-05 | Checkout with a yogurt-less line | B, S | **P3** (gate) |
| C3-06 | Quantity bounds, empty state | B | pass |
| C3-07 | Badge before hydration | B | OBS |
| C3-08 | Tamper matrix incl. new base shapes | N | pass, OBS (copy) |
| C3-09 | Storage disabled, quota | N (suite) | pass |
| C3-10 | Cross-tab clear with the drawer open | B | pass |
| C3-11 | Drawer focus return and trap | B | **P3** |
| B4-01 | Instruction colour, layout shift, contrast | B | **P3** (contrast); no shift |
| B4-02 | Reduced motion | B | **P3** |
| B4-03 | Skip, required, size toggle | E | pass |
| B4-04 | Double-click, nav within the beat | E | pass |
| B4-05 | A1 fix, garbage lineIds | B, E | pass |
| B4-06 | Edit page under drift | E, S | pass |
| B4-07 | 320 px and iPad | B | **P3** (2 px overflow) |
| N5-01 | G7 both directions | E | pass |
| N5-02 | Escape stacking | B | pass |
| N5-03 | Scroll lock refcount | B | pass |
| N5-04 | Cover races | B | pass |
| N5-05 | 404s, error boundary | B, S | pass (boundary static only) |
| N5-06 | Mobile nav tap-through | E | pass |
| K6-01 | Flag off: /checkout redirect | B | pass |
| K6-02 | Flag off: action returns closed | N (suite F7) | pass |
| K6-03 | Suite F1, F2, F4, F5ui | E | pass |
| K6-04 | Yogurt-less line through checkout | B | pass (path works; see C3-05) |
| K6-05 | Reload vs Edit cart codes | B, N | pass |
| K6-06 | Form: caps, email, whitespace, letters in phone, Enter | B, N | **P3** (announce), OBS (phone) |
| K6-07 | Success survives reload; return to /checkout | B, E | pass, OBS |
| K6-08 | Idempotency durability | S | standing |
| K6-09 | Server fuzz on base | N | pass |
| H7-01 | Build strip at 3440, 2560, 1920 | B | **P3** (3440) |
| H7-02 | Hero alts, 4xx | B | pass |
| H7-03 | Pairings excludes the Seasonal | S | pass |
| H7-04 | Ledger reveal at DPR 2 | E | pass |
| H7-05 | Stage tile sizing and cross-fade | B | pass |
| H7-06 | Reveal timing | not run | OBS |
| H7-07 | Bloom in the Instagram feed | S, B | OBS |
| F8-01 | Submit, success, pending, announce | B | **P3** (announce) |
| F8-02 | Caps, blank, 2 MB, submit during transition | B, N (suite) | pass |
| F8-03 | Footer links under the drawer | B | pass |
| L9-01 | Suite: canonical, sitemap, icons | E | pass |
| L9-02 | JSON-LD menu items | B, S | n/a (no menu items emitted) |
| L9-03 | Privacy and terms | B | pass |

---

## 7. Environment and method

- Tree: HEAD `f334c09` plus the uncommitted work (`git diff HEAD` patch sha256 `75f986fb…9481c`, 31 modified and 9 untracked files), applied to a detached worktree in the session scratchpad so the main checkout and its `.next` were never touched. `git status --short` in the worktree matched the main checkout entry for entry.
- Node v22.23.1, Playwright 1.62.1 (bundled Chromium), `playwright-cli` 1.59.0-alpha. Two production builds served on port 3003: build A with `NEXT_PUBLIC_CHECKOUT_ENABLED=true` for the suite and Area 6, build B without it (the state this deploy ships in) for everything else. The worktree's `playwright.config.ts` had `PORT` changed to 3003 locally; nothing was committed from the worktree and it was removed at the end.
- Viewports: 1400 x 900 for the desktop cases, 390 x 844 for the phone cases, 1024 x 768 for the breakpoint crossing, 320 x 640 for the narrow builder check, 3440 x 1440 / 2560 x 1440 / 1920 x 1080 for the strip.
- Node harness: two scratch Vitest files added to the worktree's `tests/unit` (`zz-audit-store.test.ts`, `zz-audit-action.test.ts`) using the repo's own `loadWithMenu`, `seedCart`, `signatureLine`, `makeFormData` helpers; 18 cases, each logging its observation. Browser cases: `playwright-cli run-code` scripts in the scratchpad (`b/*.js`), one named session per script, each returning a JSON record of what it observed. Rebuilding them is about 60 lines each; the case list in Section 6 is the spec.
- Measurement caveat worth recording: a locator that selects by accessible name re-resolves to a different element the moment the name changes ("Add to Cart" becomes "Added", "Add The Rise to cart" becomes "The Rise added to cart"). The first pass wrongly read the add beat as missing on both surfaces for that reason; the second pass held element handles and the beat is correct everywhere. Anyone extending the suite around the beat should select the button before the click and keep the handle.
- Every P3 has an executed repro; the two static-only items (N5-05 error boundary, H7-03) are marked S and carry no finding.

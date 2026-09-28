// The staff portal's layout, as tokens. Beside colors.ts and layers.ts because
// it is the same kind of thing: a decision that two surfaces have to make
// identically, kept where a test can read it.
//
// THE RULE THESE ENCODE, set 2026-09-27 once the ordering log started feeding
// order history onto the inventory board: nothing in the portal may be sized by
// the length of the text in it. A name three characters longer must not move
// the price, and a field nobody filled in has to leave a gap exactly where its
// value would have been. Staff read these pages by position, mid-shift, at a
// glance: the price is where the price always is. That is worth more than
// fitting every name, so long values truncate with the full string on hover.
//
// tests/unit/staffLayout.test.ts holds the templates below to it.

/**
 * Both staff pages run edge to edge. Everything customer-facing on this site is
 * a measure of running copy inside `max-w-*`; this is a work surface holding a
 * table of 109 rows and eight columns, and a 72rem column of it on a 27in
 * monitor was three quarters empty screen and a horizontal squeeze at once.
 */
export const STAFF_PAGE = "w-full px-4 pb-24 pt-8 md:px-6 md:pt-10 xl:px-8";

/** The one placeholder for a field nobody filled in. Never a blank cell. */
export const EMPTY = "–";

/**
 * The inventory board's column grid, in one string so the header row and every
 * item row are laid out by the same declaration. Three tiers, each dropping
 * columns rather than shrinking them:
 *
 *   phones   name, status, remove
 *   md       + ordered, delivered
 *   xl       + pack, price, supplier
 *
 * A cell hidden with `display: none` is not a grid item, so the templates and
 * the per-cell `hidden`/`xl:block` classes have to agree: eight children, five
 * of them hidden on a phone, three at md, none at xl. The widths are literal
 * so a row in Fruits lines up with a row in Enhancers, and the name column is
 * the only flexible track: it absorbs the monitor, everything else holds still.
 *
 * The last track is 4.5rem rather than the 2rem the "-" needs, because the
 * confirm it turns into says "Remove?" and a control that changes width shunts
 * the column beside it. Phones are the exception and their last two tracks are
 * `auto`: a phone shows no other columns, so there is nothing for the row to
 * stay aligned with, and the name is worth the space.
 *
 * At xl the name stops growing at 28rem. Full width is the point of this page,
 * but a 27in monitor hands the flexible track 60rem of it, and the cost is paid
 * by the hand: the chips you are reaching for end up an arm's length from the
 * name you read. 28rem holds every name in the registry and the tracker both,
 * and the surplus reads as a table that has ended rather than one stretched.
 */
export const BOARD_GRID =
  "grid items-center gap-x-2 md:gap-x-3 " +
  "grid-cols-[minmax(0,1fr)_auto_auto] " +
  "md:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_9.5rem_4.5rem] " +
  "xl:grid-cols-[minmax(0,28rem)_9rem_6.5rem_8.5rem_5.5rem_5.5rem_9.5rem_4.5rem]";

/** Shown from md up: the two dates. */
export const CELL_MD = "hidden md:block";
/** Shown from xl up: what was bought and what it cost. */
export const CELL_XL = "hidden xl:block";

/** One card field's label column, on the ordering board. Wide enough for "Ordered". */
export const CARD_FIELDS = "grid grid-cols-[5rem_minmax(0,1fr)] gap-x-2";

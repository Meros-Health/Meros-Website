// The stacking order, in one place.
//
// Seven components each declared their own constant in a shared numbering
// scheme that lived nowhere, and one (Preloader) opted out of the scheme with
// a bare zIndex: 300. The numbers were right; nothing said what the order was
// or why, so the only way to add a layer was to grep for the neighbours.
//
// Read top to bottom. Gaps are deliberate: they leave room for a backdrop to
// sit one below its panel without renumbering anything.
export const Z = {
  /** The nav bar's own band. */
  headerBackground: 110,
  /** The open menu, desktop overlay or mobile panel. Its backdrop sits one below. */
  navPanel: 115,
  /** Wordmark, menu toggle and cart button, which stay clickable over the menu. */
  headerContent: 120,
  cartDrawer: 130,
  /** Above the drawer it is opened from, below the page transition cover. */
  signatureModal: 135,
  /** Covers the outgoing page during a route change, so it is above the chrome. */
  pageCover: 140,
  /** First load only, and above everything by a clear margin. */
  preloader: 300,
} as const;

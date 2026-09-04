// Layout constants that both TypeScript and CSS need.
//
// globals.css cannot import this, so it restates the value as a custom
// property and tests/unit/tokens.test.ts binds the two. Reading the computed
// property at runtime would be the other option, but it is not available
// during server render, and the nav bar's height is needed in the first paint.

/**
 * Height of the fixed nav bar. Navbar draws the band at this height, the hero
 * reserves it as padding so its first row starts under the bar, and
 * MobileNavPanel opens below it. Mirrored as --nav-bar-height in globals.css.
 */
export const NAV_BAR_HEIGHT_PX = 72;

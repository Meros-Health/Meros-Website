"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { animate, motion, AnimatePresence } from "framer-motion";
import { NavMenuOverlay } from "./NavMenuOverlay";
import { NavKitchenNote } from "./NavKitchenNote";
import { useLenis } from "@/components/animation/LenisProvider";
import { scrollToTop } from "@/lib/scroll";
import { useTransitionRouter } from "@/components/transition/TransitionProvider";
import { MENU_EXIT_COVER_MS } from "@/lib/motion";
import { useCartStore } from "@/store/cartStore";
import { useIsMobile } from "@/lib/useIsMobile";

const HEADER_BG_Z = 110;
const HEADER_CONTENT_Z = 120;
const NAV_BAR_HEIGHT_PX = 72; // matches HeroSection.tsx's NAV_HEIGHT_PX assumption
const MENU_ICON_SIZE = 18;
const TOGGLE_FADE = { duration: 0.2, ease: "easeInOut" } as const;
const HEADER_ENTRANCE = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
};

// Nav bar runway fade: transparent for the first 25% of the hero's height,
// then fades to opaque cream over the next 250px of scroll. Icon/logo color
// crossfades cream -> midnight over the same t, independent of the
// background — see chromeTRef / applyChromeState.
const HERO_FADE_START_FRACTION = 0.25;
const HERO_FADE_RUNWAY_PX = 250;
const MENU_FADE_MS = 150;
const BAND_RGB = "255, 247, 240"; // --color-cream
const BORDER_RGB = "41, 45, 42"; // --color-midnight
const BORDER_MAX_ALPHA = 0.18;

const CREAM_RGB = [255, 247, 240] as const;
const MIDNIGHT_RGB = [41, 45, 42] as const;

function colorForT(t: number) {
  const [r0, g0, b0] = CREAM_RGB;
  const [r1, g1, b1] = MIDNIGHT_RGB;
  const r = Math.round(r0 + (r1 - r0) * t);
  const g = Math.round(g0 + (g1 - g0) * t);
  const b = Math.round(b0 + (b1 - b0) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Order", href: "/order" },
  { label: "Build", href: "/build" },
];

export function Navbar() {
  const transitionRouter = useTransitionRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const logoLightRef = useRef<HTMLImageElement>(null);
  const logoDarkRef = useRef<HTMLImageElement>(null);
  const scrollOpacityRef = useRef(pathname === "/" ? 0 : 1);
  // Icon/logo color is dark by default, always — unrelated to scroll. It
  // only switches to light while the menu is open (see the menuOpen effect).
  const chromeTRef = useRef(1);
  const heroHeightRef = useRef(0);
  const menuOpenRef = useRef(menuOpen);
  const chromeTweenRef = useRef<{ stop: () => void } | null>(null);
  const mountedRef = useRef(false);
  menuOpenRef.current = menuOpen;

  const cartCount = useCartStore((s) => s.items.reduce((n, item) => n + item.quantity, 0));
  const openCart = useCartStore((s) => s.openCart);

  // Background fade is purely scroll-driven now — no menu-awareness needed,
  // since the overlay visually covers this layer entirely when open (see
  // HEADER_BG_Z / HEADER_CONTENT_Z below).
  const applyBandOpacity = useCallback((opacity: number) => {
    const band = bandRef.current;
    if (!band) return;
    band.style.transition = "none";
    band.style.backgroundColor =
      opacity >= 1 ? `rgb(${BAND_RGB})` : `rgba(${BAND_RGB}, ${opacity})`;
    band.style.borderBottomWidth = "1px";
    band.style.borderBottomStyle = "solid";
    band.style.borderBottomColor = `rgba(${BORDER_RGB}, ${BORDER_MAX_ALPHA * opacity})`;
  }, []);

  // Icon/logo color-fade: t=0 is the light (cream) phase, t=1 is dark
  // (midnight). Applied via inheritance from chromeRef, plus the two
  // stacked logo images' opacity.
  const applyChromeState = useCallback((t: number) => {
    const el = chromeRef.current;
    if (el) el.style.color = colorForT(t);
    if (logoDarkRef.current) logoDarkRef.current.style.opacity = String(t);
    if (logoLightRef.current) logoLightRef.current.style.opacity = String(1 - t);
  }, []);

  const setChromeT = useCallback(
    (t: number, animated: boolean) => {
      chromeTweenRef.current?.stop();
      if (!animated) {
        applyChromeState(t);
        return;
      }
      const controls = animate(chromeTRef.current, t, {
        duration: MENU_FADE_MS / 1000,
        ease: "easeOut",
        onUpdate: (v) => {
          chromeTRef.current = v;
          applyChromeState(v);
        },
      });
      chromeTweenRef.current = controls;
    },
    [applyChromeState]
  );

  // Track the hero section's rendered height so the fade thresholds stay
  // correct across viewport/orientation changes (100svh shifts with mobile
  // browser chrome show/hide).
  useLayoutEffect(() => {
    if (pathname !== "/") return;
    const heroEl = document.getElementById("hero");
    if (!heroEl) return;
    heroHeightRef.current = heroEl.getBoundingClientRect().height;
    const ro = new ResizeObserver(([entry]) => {
      heroHeightRef.current = entry.contentRect.height;
    });
    ro.observe(heroEl);
    return () => ro.disconnect();
  }, [pathname]);

  // Runway fade: transparent for the first HERO_FADE_START_FRACTION of hero
  // height, then ramps to opaque cream over HERO_FADE_RUNWAY_PX of scroll.
  // Non-home routes have no hero, so the bar stays solid. This only affects
  // the background — icon/logo color is unrelated to scroll (see below).
  useLayoutEffect(() => {
    if (pathname !== "/") {
      scrollOpacityRef.current = 1;
      applyBandOpacity(1);
      return;
    }

    const update = (scrollY: number) => {
      const heroHeight = heroHeightRef.current;
      const fadeStart = heroHeight * HERO_FADE_START_FRACTION;
      // Mobile keeps a flat, always-opaque band; the runway fade is desktop only.
      const opacity =
        isMobile || heroHeight === 0
          ? 1
          : Math.min(1, Math.max(0, (scrollY - fadeStart) / HERO_FADE_RUNWAY_PX));
      scrollOpacityRef.current = opacity;
      applyBandOpacity(opacity);
    };

    update(lenis?.scroll ?? window.scrollY);

    if (!lenis) {
      const onScroll = () => update(window.scrollY);
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    return lenis.on("scroll", (instance) => update(instance.scroll));
  }, [lenis, pathname, applyBandOpacity, isMobile]);

  // Icon/logo color: dark (t=1) by default always; menu open forces it
  // fully light (t=0), closing eases back to dark. The background is
  // untouched — the overlay's dark panels cover it visually while open.
  useLayoutEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setChromeT(menuOpen ? 0 : 1, true);
  }, [menuOpen, setChromeT]);

  useEffect(() => {
    if (menuOpen) lenis?.stop();
    else lenis?.start();
  }, [menuOpen, lenis]);

  // Native scroll lock. No scrollbar-width compensation is needed here because
  // `scrollbar-gutter: stable` (globals.css) keeps the gutter reserved, so
  // hiding overflow never changes the viewport width or shifts the layout.
  useEffect(() => {
    if (!menuOpen) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

  // The menu's own close animation doubles as the transition's exit cover:
  // menu-composed mode waits out the tuned close window, then navigates with
  // the cover already opaque underneath the shrinking panels.
  const menuComposed = {
    coverMode: "menu-composed",
    preDelayMs: MENU_EXIT_COVER_MS,
  } as const;

  const handleNavigate = (href: string) => {
    closeMenu();
    transitionRouter.push(href, menuComposed);
  };

  const scrollHeroTop = () => scrollToTop(lenis, false);

  const goToBuild = () => {
    if (menuOpen) {
      closeMenu();
      transitionRouter.push("/build", menuComposed);
    } else {
      transitionRouter.push("/build");
    }
  };

  // Food menu lives at the top of /order. Scroll up in-page when already there,
  // otherwise route to /order (RouteScroll lands at the top).
  const goToMenu = () => {
    if (pathname === "/order") {
      if (menuOpen) closeMenu();
      scrollToTop(lenis, false);
    } else if (menuOpen) {
      closeMenu();
      transitionRouter.push("/order", menuComposed);
    } else {
      transitionRouter.push("/order");
    }
  };

  // Cart is a global slide-over drawer, available from any page.
  const handleOpenCart = () => {
    if (menuOpen) closeMenu();
    openCart();
  };

  // MERŌS wordmark: always returns to the top of the landing-page hero,
  // regardless of the current route. On "/" we smooth-scroll to the top; on
  // any other page we navigate home (which lands at the top of the hero).
  const handleTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (menuOpen) {
      closeMenu();
      // Already home: no navigation, just wait out the menu close, then scroll.
      if (pathname === "/") setTimeout(scrollHeroTop, MENU_EXIT_COVER_MS);
      else transitionRouter.push("/", menuComposed);
    } else if (pathname === "/") {
      scrollHeroTop();
    } else {
      transitionRouter.push("/");
    }
  };

  const iconButtonStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "44px",
    minHeight: "44px",
    padding: "0.5rem",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    flexShrink: 0,
  };

  return (
    <>
      {/* Background layer — sits behind the menu overlay so its dark panels
          cover this rectangle entirely while the menu is open. */}
      <motion.div
        aria-hidden
        initial={HEADER_ENTRANCE.initial}
        animate={HEADER_ENTRANCE.animate}
        transition={HEADER_ENTRANCE.transition}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: NAV_BAR_HEIGHT_PX,
          zIndex: HEADER_BG_Z,
          pointerEvents: "none",
        }}
      >
        <div ref={bandRef} style={{ position: "absolute", inset: 0 }} />
      </motion.div>

      {/* Content layer — always above the menu overlay, so icons/logo stay
          visible and clickable regardless of menu state. */}
      <motion.header
        initial={HEADER_ENTRANCE.initial}
        animate={HEADER_ENTRANCE.animate}
        transition={HEADER_ENTRANCE.transition}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: HEADER_CONTENT_Z,
          pointerEvents: "none",
        }}
      >
        <div
          ref={chromeRef}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0.85rem var(--nav-padding-x, 7vw)",
            pointerEvents: "auto",
            color: colorForT(1),
          }}
        >
          {/* Menu toggle — left */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-start" }}>
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
              style={{
                ...iconButtonStyle,
                fontFamily: "var(--font-body)",
                fontSize: "0.95rem",
                fontWeight: 400,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                width: isMobile ? "44px" : "auto",
                minWidth: isMobile ? "44px" : "4.5rem",
                padding: isMobile ? "0.5rem" : "0.5rem 0.75rem",
              }}
            >
              {isMobile ? (
                <IconSlot open={menuOpen} />
              ) : (
                <TextSlot open={menuOpen} />
              )}
            </button>
          </div>

          {/* MERŌS wordmark — center */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
            <Link
              href="/"
              onClick={handleTitleClick}
                aria-label="MERŌS home"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "44px",
                padding: "0.25rem 0.5rem",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              {/* Sized to the logo itself (not the link's padded tap area) so
                  the absolutely-positioned crossfade layer lines up exactly. */}
              <span
                style={{
                  position: "relative",
                  display: "block",
                  height: "clamp(1.6rem, 2.2vw, 2rem)",
                  aspectRatio: "1 / 1",
                  flexShrink: 0,
                }}
              >
                <Image
                  ref={logoDarkRef}
                  src="/logos/logo-dark.png"
                  alt="MERŌS"
                  width={1376}
                  height={1376}
                  priority
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    opacity: 1,
                  }}
                />
                <Image
                  ref={logoLightRef}
                  src="/logos/logo-light.png"
                  alt=""
                  aria-hidden
                  width={1376}
                  height={1376}
                  priority
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    display: "block",
                    opacity: 0,
                  }}
                />
              </span>
            </Link>
          </div>

          {/* Build + Menu + Cart — right */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "0.15rem",
            }}
          >
            {/* Hidden on mobile via CSS media query (not JS viewport state) so
                there's no post-hydration flash of these icons on load. */}
            <button
              type="button"
              aria-label="Build your bowl"
              onClick={goToBuild}
              className="nav-icon-desktop-only"
              style={iconButtonStyle}
            >
              <BowlIcon />
            </button>

            <button
              type="button"
              aria-label="Our Menu"
              onClick={goToMenu}
              className="nav-icon-desktop-only"
              style={iconButtonStyle}
            >
              <MenuListIcon />
            </button>

            <button
              type="button"
              aria-label={`Cart (${cartCount} item${cartCount !== 1 ? "s" : ""})`}
              onClick={handleOpenCart}
              style={{
                ...iconButtonStyle,
                position: "relative",
              }}
            >
              <CartIcon />
              {cartCount > 0 && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "4px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "0",
                    background: "var(--color-grapefruit)",
                    color: "var(--color-cream)",
                    fontSize: "9px",
                    fontFamily: "var(--font-body)",
                    fontWeight: 500,
                    letterSpacing: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <NavMenuOverlay
            key="nav-overlay"
            open={menuOpen}
            onClose={closeMenu}
            onNavigate={handleNavigate}
            links={NAV_LINKS}
            rightContent={<NavKitchenNote />}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HamburgerIcon() {
  return (
    <span
      aria-hidden
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "5px",
        width: `${MENU_ICON_SIZE}px`,
        height: `${MENU_ICON_SIZE}px`,
      }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            display: "block",
            height: "1.5px",
            width: "100%",
            background: "currentColor",
            borderRadius: "0",
          }}
        />
      ))}
    </span>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M2 2L16 16M16 2L2 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MenuListIcon() {
  const rows = [5, 10, 15];
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      {rows.map((y) => (
        <g key={y}>
          <circle cx="3.5" cy={y} r="1" fill="currentColor" />
          <line
            x1="7"
            y1={y}
            x2="16.5"
            y2={y}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      ))}
    </svg>
  );
}

function BowlIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M2.5 9h15a7.5 7.5 0 0 1-15 0Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="6" r="1.15" fill="currentColor" />
      <circle cx="10.4" cy="4.9" r="1.15" fill="currentColor" />
      <circle cx="13.4" cy="6.2" r="1.15" fill="currentColor" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M2 2h2.2l1.5 7.5h8.6l1.2-5H6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="17" r="1.2" fill="currentColor" />
      <circle cx="15" cy="17" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconSlot({ open }: { open: boolean }) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        width: MENU_ICON_SIZE,
        height: MENU_ICON_SIZE,
        flexShrink: 0,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={open ? "close" : "open"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={TOGGLE_FADE}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {open ? <CloseIcon /> : <HamburgerIcon />}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function TextSlot({ open }: { open: boolean }) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        minWidth: "4.75ch",
        height: "1em",
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={open ? "close" : "open"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={TOGGLE_FADE}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            whiteSpace: "nowrap",
          }}
        >
          {open ? "Exit" : "Menu"}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

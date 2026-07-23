"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { NavMenuOverlay } from "./NavMenuOverlay";
import { useLenis } from "@/components/animation/LenisProvider";
import { scrollToTop } from "@/lib/scroll";
import { useCartStore } from "@/store/cartStore";
import { useIsMobile } from "@/lib/useIsMobile";

const HEADER_Z = 120;
const MENU_ICON_SIZE = 18;
const TOGGLE_FADE = { duration: 0.2, ease: "easeInOut" } as const;
const ICON_COLOR = "var(--color-midnight)";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Order", href: "/order" },
  { label: "Build", href: "/build" },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const lenis = useLenis();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const cartCount = useCartStore((s) => s.items.reduce((n, item) => n + item.quantity, 0));
  const openCart = useCartStore((s) => s.openCart);

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

  const handleNavigate = (href: string) => {
    closeMenu();
    setTimeout(() => router.push(href), 480);
  };

  const scrollHeroTop = () => scrollToTop(lenis, false);

  const goToBuild = () => {
    if (menuOpen) closeMenu();
    router.push("/build");
  };

  // Food menu lives at the top of /order. Scroll up in-page when already there,
  // otherwise route to /order (RouteScroll lands at the top).
  const goToMenu = () => {
    if (menuOpen) closeMenu();
    if (pathname === "/order") scrollToTop(lenis, false);
    else router.push("/order");
  };

  // Cart is a global slide-over drawer, available from any page.
  const handleOpenCart = () => {
    if (menuOpen) closeMenu();
    openCart();
  };

  // MEROS wordmark: always returns to the top of the landing-page hero,
  // regardless of the current route. On "/" we smooth-scroll to the top; on
  // any other page we navigate home (which lands at the top of the hero).
  const handleTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const goHome = () => {
      if (pathname === "/") scrollHeroTop();
      else router.push("/");
    };
    if (menuOpen) {
      closeMenu();
      setTimeout(goHome, 480);
    } else {
      goHome();
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
    color: ICON_COLOR,
    cursor: "pointer",
    flexShrink: 0,
  };

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: HEADER_Z,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0.85rem var(--nav-padding-x, 7vw)",
            backgroundColor: "var(--color-cream)",
            borderBottom: "1px solid rgba(41, 45, 42, 0.18)",
            pointerEvents: "auto",
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

          {/* MEROS wordmark — center */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "center" }}>
            <Link
              href="/"
              onClick={handleTitleClick}
              aria-label="Meros home"
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
              <Image
                src="/logos/logo-dark.png"
                alt="Meros"
                width={1376}
                height={1376}
                priority
                style={{
                  width: "auto",
                  height: "clamp(1.6rem, 2.2vw, 2rem)",
                  display: "block",
                }}
              />
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
            <button
              type="button"
              aria-label="Build your bowl"
              onClick={goToBuild}
              style={iconButtonStyle}
            >
              <BowlIcon />
            </button>

            <button
              type="button"
              aria-label="Our Menu"
              onClick={goToMenu}
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

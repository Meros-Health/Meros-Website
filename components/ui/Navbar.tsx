"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { NavMenuOverlay } from "./NavMenuOverlay";
import { useLenis } from "@/components/animation/LenisProvider";
import { useCartStore } from "@/store/cartStore";

const HEADER_Z = 120;
const MENU_ICON_SIZE = 18;
const TOGGLE_FADE = { duration: 0.2, ease: "easeInOut" } as const;

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Build Your Bowl", href: "/build" },
  { label: "Order", href: "/order" },
];

export function Navbar() {
  const router = useRouter();
  const lenis = useLenis();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const cartCount = useCartStore((s) => s.items.reduce((n, item) => n + item.quantity, 0));

  // Wire Lenis stop/start to menu open state
  useEffect(() => {
    if (menuOpen) lenis?.stop();
    else lenis?.start();
  }, [menuOpen, lenis]);

  // Native scroll lock with scrollbar compensation
  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    if (menuOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = "hidden";
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      body.style.overflow = prevOverflow || "";
      body.style.paddingRight = prevPaddingRight || "";
    }
    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [menuOpen]);

  // Escape closes
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

  const handleTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (menuOpen) {
      closeMenu();
      setTimeout(() => {
        if (lenis) lenis.scrollTo(0);
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }, 480);
    } else {
      if (lenis) lenis.scrollTo(0);
      else window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const headerColor = menuOpen ? "var(--nav-overlay-text)" : "var(--color-cream)";

  const pillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.45rem 1rem",
    borderRadius: "0",
    border: "1px solid transparent",
    boxSizing: "border-box",
    boxShadow: menuOpen
      ? "none"
      : "inset 0 0 0 1px rgba(255, 247, 240, 0.18)",
    background: menuOpen ? "transparent" : "rgba(41, 45, 42, 0.28)",
    backdropFilter: menuOpen ? "none" : "blur(10px)",
    WebkitBackdropFilter: menuOpen ? "none" : "blur(10px)",
    transition:
      "background 0.4s ease, box-shadow 0.4s ease, backdrop-filter 0.4s ease, color 0.4s ease",
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
          display: "flex",
          alignItems: "center",
          padding: "1.5rem var(--nav-padding-x, 7vw)",
          pointerEvents: "none",
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
              ...pillStyle,
              fontFamily: "var(--font-body)",
              fontSize: "0.95rem",
              fontWeight: 400,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: headerColor,
              cursor: "pointer",
              pointerEvents: "auto",
              flexShrink: 0,
              width: isMobile ? "2.65rem" : "4.5rem",
              minWidth: isMobile ? "2.65rem" : "4.5rem",
              maxWidth: isMobile ? "2.65rem" : "4.5rem",
              padding: isMobile ? "0.55rem 0" : "0.45rem 0",
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
            style={{
              ...pillStyle,
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1rem, 1.3vw, 1.25rem)",
              fontWeight: 400,
              color: headerColor,
              textDecoration: "none",
              letterSpacing: "0.10em",
              pointerEvents: "auto",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            MEROS
          </Link>
        </div>

        {/* Cart icon — right */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            aria-label={`Cart (${cartCount} item${cartCount !== 1 ? "s" : ""})`}
            onClick={() => {
              if (menuOpen) closeMenu();
              router.push("/order#cart");
            }}
            style={{
              ...pillStyle,
              position: "relative",
              color: headerColor,
              cursor: "pointer",
              pointerEvents: "auto",
              flexShrink: 0,
              padding: "0.55rem 0.9rem",
              width: "auto",
              minWidth: "auto",
              maxWidth: "none",
            }}
          >
            <CartIcon />
            {cartCount > 0 && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: "2px",
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

function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`;
  const [matches, setMatches] = useState(
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

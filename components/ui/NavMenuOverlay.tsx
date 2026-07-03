"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

const FRAME_DURATION = 0.7;
const FRAME_EASE = [0.76, 0, 0.24, 1] as const;
const LINK_STAGGER = 0.06;
const LINK_BASE_DELAY = 0.35;
const OVERLAY_Z = 115;

// Hole as fractions of the viewport — change these to resize the center panel.
const HOLE_W_FRAC = 0.32; // 32vw
const HOLE_H_FRAC = 0.62; // 62vh

interface NavLink {
  label: string;
  href: string;
}

interface OverlayDims {
  halfW: number;
  halfH: number;
  holeW: number;
  holeH: number;
}

interface NavMenuOverlayProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (href: string) => void;
  links: NavLink[];
  rightContent?: React.ReactNode;
}

export function NavMenuOverlay({
  open,
  onClose,
  onNavigate,
  links,
  rightContent,
}: NavMenuOverlayProps) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const isMobile = useIsMobile();

  // Compute pixel panel sizes — Framer Motion cannot interpolate CSS calc()
  // expressions from 0, which caused the right-panel flash on the previous build.
  const [dims, setDims] = useState<OverlayDims | null>(null);
  useEffect(() => {
    const compute = () => {
      const holeW = window.innerWidth * HOLE_W_FRAC;
      const holeH = window.innerHeight * HOLE_H_FRAC;
      setDims({
        halfW: (window.innerWidth - holeW) / 2,
        halfH: (window.innerHeight - holeH) / 2,
        holeW,
        holeH,
      });
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstLinkRef.current?.focus(), FRAME_DURATION * 1000);
    return () => clearTimeout(t);
  }, [open]);

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    onNavigate(href);
  };

  const linkStyle: React.CSSProperties = {
    fontFamily: "var(--font-display)",
    color: "var(--nav-overlay-text)",
    textDecoration: "none",
    letterSpacing: "-0.01em",
    lineHeight: 1.05,
    whiteSpace: "nowrap",
    width: "fit-content",
  };

  // ── Mobile overlay ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <LinkHoverStyles />
        <motion.div
          key="nav-overlay-mobile"
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: FRAME_DURATION, ease: FRAME_EASE }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: OVERLAY_Z,
            background: "var(--nav-overlay-bg)",
            color: "var(--nav-overlay-text)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "var(--nav-padding-x)",
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {links.map((link, i) => (
              <motion.a
                key={link.href}
                ref={i === 0 ? firstLinkRef : undefined}
                href={link.href}
                className="nav-overlay-link"
                onClick={(e) => handleLinkClick(e, link.href)}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{
                  delay: LINK_BASE_DELAY + i * LINK_STAGGER,
                  duration: 0.5,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  ...linkStyle,
                  fontSize: "clamp(2.5rem, 9vw, 4rem)",
                  fontWeight: 400,
                }}
              >
                {link.label}
              </motion.a>
            ))}
          </nav>
        </motion.div>
      </>
    );
  }

  // ── Desktop: four panels + black center panel ─────────────────────────────
  // Wait for dims before rendering so we always have pixel values ready.
  if (!dims) return null;

  const { halfW, halfH, holeW, holeH } = dims;
  const panelBg: React.CSSProperties = {
    background: "var(--nav-overlay-bg)",
    pointerEvents: "auto",
  };

  return (
    <>
      <LinkHoverStyles />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: OVERLAY_Z,
          pointerEvents: "none",
        }}
      >
        {/* Left panel — nav links, slides in from left edge */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: halfW }}
          exit={{ width: 0 }}
          transition={{ duration: FRAME_DURATION, ease: FRAME_EASE }}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            ...panelBg,
          }}
        >
          <nav
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              paddingLeft: "var(--nav-padding-x)",
              paddingRight: "2rem",
              width: "100%",
            }}
          >
            {links.map((link, i) => (
              <motion.a
                key={link.href}
                ref={i === 0 ? firstLinkRef : undefined}
                href={link.href}
                className="nav-overlay-link"
                onClick={(e) => handleLinkClick(e, link.href)}
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24, transition: { duration: 0.2, ease: "easeIn" } }}
                transition={{
                  delay: LINK_BASE_DELAY + i * LINK_STAGGER,
                  duration: 0.55,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{
                  ...linkStyle,
                  fontSize: "clamp(2rem, 4.2vw, 3.25rem)",
                  fontWeight: 400,
                }}
              >
                {link.label}
              </motion.a>
            ))}
          </nav>
        </motion.div>

        {/* Right panel — optional secondary content, slides in from right edge */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: halfW }}
          exit={{ width: 0 }}
          transition={{ duration: FRAME_DURATION, ease: FRAME_EASE }}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            ...panelBg,
          }}
        >
          {/* Inner wrapper preserves padding without leaking outside overflow:hidden */}
          <div
            style={{
              flexShrink: 0,
              width: halfW,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-end",
              paddingRight: "var(--nav-padding-x)",
              paddingBottom: "3rem",
            }}
          >
            {rightContent}
          </div>
        </motion.div>

        {/* Top panel — slides down from top */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: halfH }}
          exit={{ height: 0 }}
          transition={{ duration: FRAME_DURATION, ease: FRAME_EASE }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            overflow: "hidden",
            ...panelBg,
          }}
        />

        {/* Bottom panel — slides up from bottom */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: halfH }}
          exit={{ height: 0 }}
          transition={{ duration: FRAME_DURATION, ease: FRAME_EASE }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            overflow: "hidden",
            ...panelBg,
          }}
        />


      </div>
    </>
  );
}

// ── Utilities ─────────────────────────────────────────────────────────────────

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

function LinkHoverStyles() {
  return (
    <style>{`
      .nav-overlay-link { transition: color 200ms ease; }
      .nav-overlay-link:hover,
      .nav-overlay-link:focus-visible {
        color: var(--nav-accent) !important;
        outline: none;
      }
    `}</style>
  );
}

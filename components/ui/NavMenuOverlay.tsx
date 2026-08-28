"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MENU_PANEL_MS, REDUCED_MOTION_MS } from "@/lib/motion";

// Desktop-only. The mobile menu is MobileNavPanel.tsx (content-height drop
// panel); Navbar.tsx picks between the two on the 768px breakpoint.

const FRAME_DURATION = MENU_PANEL_MS / 1000;
const FRAME_EASE = [0.76, 0, 0.24, 1] as const;
const LINK_STAGGER = 0.06;
const LINK_BASE_DELAY = 0.35;
const CHROME_FADE = 0.2; // links and note fading out ahead of a navigate close
const OVERLAY_Z = 115;

// Hole as fractions of the viewport: change these to resize the center panel.
const HOLE_W_FRAC = 0.32; // 32vw
const HOLE_H_FRAC = 0.62; // 62vh

// How the overlay leaves. "dismiss" (Escape, the toggle, clicking the window)
// retreats the panels to the edges and hands the page back. "navigate" closes
// them inward until they meet, so the viewport becomes a solid field the
// page transition's cover can take over without a visible seam.
export type NavMenuCloseMode = "dismiss" | "navigate";

interface NavLink {
  label: string;
  href: string;
}

interface OverlayDims {
  halfW: number;
  halfH: number;
  holeW: number;
  holeH: number;
  fullHalfW: number;
  fullHalfH: number;
}

function computeDims(): OverlayDims {
  if (typeof window === "undefined") {
    return { halfW: 0, halfH: 0, holeW: 0, holeH: 0, fullHalfW: 0, fullHalfH: 0 };
  }
  const holeW = window.innerWidth * HOLE_W_FRAC;
  const holeH = window.innerHeight * HOLE_H_FRAC;
  return {
    halfW: (window.innerWidth - holeW) / 2,
    halfH: (window.innerHeight - holeH) / 2,
    holeW,
    holeH,
    // Opposite panels meet in the middle: exactly half the viewport each.
    fullHalfW: window.innerWidth / 2,
    fullHalfH: window.innerHeight / 2,
  };
}

interface NavMenuOverlayProps {
  open: boolean;
  closeMode: NavMenuCloseMode;
  onClose: () => void;
  onNavigate: (href: string) => void;
  links: NavLink[];
  rightContent?: React.ReactNode;
}

export function NavMenuOverlay({
  open,
  closeMode,
  onClose,
  onNavigate,
  links,
  rightContent,
}: NavMenuOverlayProps) {
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const reduced = useReducedMotion() ?? false;
  const navigating = closeMode === "navigate";

  // Pixel panel sizes: Framer Motion cannot interpolate CSS calc() from 0,
  // which caused the right-panel flash on the previous build. Computed
  // synchronously so the motion panels exist from the first render; panels
  // that mount a render later than the component can miss their exit if the
  // overlay is removed in between. This component only mounts client-side
  // after a click, so window is always available here.
  const [dims, setDims] = useState<OverlayDims>(computeDims);
  useEffect(() => {
    const onResize = () => setDims(computeDims());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => firstLinkRef.current?.focus(), FRAME_DURATION * 1000);
    return () => clearTimeout(t);
  }, [open]);

  const handleLinkClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    if (navigating) return; // a second click during the close would restart it
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

  // Reduced motion collapses the choreography to a short plain fade.
  const frame = reduced
    ? { duration: REDUCED_MOTION_MS / 1000, ease: "linear" as const }
    : { duration: FRAME_DURATION, ease: FRAME_EASE };
  const chromeOut = { duration: reduced ? REDUCED_MOTION_MS / 1000 : CHROME_FADE, ease: "easeIn" as const };
  // A navigate close ends under the transition cover, so the AnimatePresence
  // exit that follows the unmount must not play a retreat the user could see
  // as the cover lifts.
  const exitFrame = navigating ? { duration: 0 } : frame;

  // ── Desktop: four panels around a transparent window ─────────────────────
  const { halfW, halfH, holeW, holeH, fullHalfW, fullHalfH } = dims;
  const panelBg: React.CSSProperties = {
    background: "var(--nav-overlay-bg)",
    pointerEvents: "auto",
  };
  const sideW = navigating ? fullHalfW : halfW;
  const bandH = navigating ? fullHalfH : halfH;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: OVERLAY_Z,
          pointerEvents: "none",
        }}
      >
        {/* Blur layer: sits behind the panels, blurs the website through the window */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FRAME_DURATION * 0.5, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            pointerEvents: "none",
          }}
        />

        {/* Window click-to-close: transparent hit area over the center hole */}
        <div
          onClick={onClose}
          style={{
            position: "absolute",
            top: halfH,
            left: halfW,
            width: holeW,
            height: holeH,
            pointerEvents: navigating ? "none" : "auto",
            cursor: "pointer",
            zIndex: 2,
          }}
        />

        {/* Left panel: nav links, slides in from left edge */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: sideW }}
          exit={{ width: 0, transition: exitFrame }}
          transition={frame}
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
                initial={{ opacity: 0, x: reduced ? 0 : -24 }}
                animate={navigating ? { opacity: 0, x: reduced ? 0 : -24 } : { opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: reduced ? 0 : -24, transition: chromeOut }}
                transition={
                  navigating
                    ? chromeOut
                    : {
                        delay: reduced ? 0 : LINK_BASE_DELAY + i * LINK_STAGGER,
                        duration: reduced ? REDUCED_MOTION_MS / 1000 : 0.55,
                        ease: [0.16, 1, 0.3, 1],
                      }
                }
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

        {/* Right panel: optional secondary content, slides in from right edge */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: sideW }}
          exit={{ width: 0, transition: exitFrame }}
          transition={frame}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            overflow: "hidden",
            display: "flex",
            // Vertically centered to match the left panel's nav-link column.
            alignItems: "center",
            justifyContent: "flex-end",
            ...panelBg,
          }}
        >
          {/* Inner wrapper preserves padding without leaking outside overflow:hidden */}
          <motion.div
            animate={{ opacity: navigating ? 0 : 1 }}
            transition={chromeOut}
            style={{
              flexShrink: 0,
              width: halfW,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingRight: "var(--nav-padding-x)",
            }}
          >
            {rightContent}
          </motion.div>
        </motion.div>

        {/* Top panel: slides down from top */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: bandH }}
          exit={{ height: 0, transition: exitFrame }}
          transition={frame}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            overflow: "hidden",
            ...panelBg,
          }}
        />

        {/* Bottom panel: slides up from bottom */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: bandH }}
          exit={{ height: 0, transition: exitFrame }}
          transition={frame}
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

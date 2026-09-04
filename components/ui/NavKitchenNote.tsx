"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { NAV_CONTENT_DELAY_S, PANEL_EASE } from "@/lib/motion";

// The desktop menu's right panel. It is the same width as the link column and
// would otherwise be empty, so it carries the short version of who we are:
// enough for someone who arrived on /catering or a QR code and has never seen
// the home page.
//
// Reveal order matches the left panel's link stagger (LINK_BASE_DELAY / ease)
// so the two panels read as one motion system.

const STORY_IMAGE = "/images-web/Gallery/Gallery-5.jpg";
const STORY_IMAGE_WIDTH = 1024;
const STORY_IMAGE_HEIGHT = 682;

const STORY_HREF = "/#about";

// Expo-out, like the overlay panels this note animates in beside. It reads
// as a response to the menu opening, not as an entrance of its own, so it
// keeps the interactive curve rather than the house entrance one.
const REVEAL_EASE = PANEL_EASE;
const BASE_DELAY = NAV_CONTENT_DELAY_S;
const STEP = 0.12;
const REVEAL_DURATION = 0.55;

const TRAVEL_PX = 16;

// Reduced motion gets the same content with none of the choreography: no
// travel, no stagger, no fade. The menu still opens; the note is simply
// already there when it does.
const reveal = (index: number, reduced: boolean) => ({
  initial: { opacity: 0, y: reduced ? 0 : TRAVEL_PX },
  animate: { opacity: 1, y: 0 },
  exit: reduced
    ? { opacity: 0, transition: { duration: 0 } }
    : { opacity: 0, y: TRAVEL_PX, transition: { duration: 0.2, ease: "easeIn" as const } },
  transition: reduced
    ? { duration: 0 }
    : { delay: BASE_DELAY + index * STEP, duration: REVEAL_DURATION, ease: REVEAL_EASE },
});

interface NavKitchenNoteProps {
  /** Routed through the menu's own close-then-navigate choreography. */
  onNavigate?: (href: string) => void;
}

export function NavKitchenNote({ onNavigate }: NavKitchenNoteProps) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "1.1rem",
        color: "var(--nav-overlay-text)",
        // Definite width (not maxWidth on an auto-sized flex item) so the
        // width:100% image below has something concrete to resolve against
        // instead of racing its own shrink-to-fit parent.
        width: "clamp(240px, 26vw, 420px)",
      }}
    >
      <motion.div {...reveal(0, reduced)} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <span
          className="font-body-caps"
          style={{ fontSize: "10px", letterSpacing: "0.25em", opacity: 0.55 }}
        >
          Our Story
        </span>
        <p
          className="font-body-mixed"
          style={{ fontSize: "0.9rem", lineHeight: 1.6, opacity: 0.88 }}
        >
          A yogurt bar on Hamilton Street in Yaletown. The yogurt is strained for 24 hours before
          it reaches the counter, which is what makes it thick and pushes the protein up.
        </p>
        <p
          className="font-body-mixed"
          style={{ fontSize: "0.9rem", lineHeight: 1.6, opacity: 0.7 }}
        >
          Fruit and toppings are sourced as locally as we can get them, with local raw honey and
          Canadian maple syrup. Every bowl and smoothie is built after you order it.
        </p>
      </motion.div>

      <motion.div {...reveal(1, reduced)} style={{ width: "100%" }}>
        <Image
          src={STORY_IMAGE}
          alt="Yogurt bowls with seasonal fruit and toppings"
          width={STORY_IMAGE_WIDTH}
          height={STORY_IMAGE_HEIGHT}
          sizes="26vw"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </motion.div>

      <motion.a
        {...reveal(2, reduced)}
        href={STORY_HREF}
        className="nav-overlay-link font-body-caps"
        onClick={(e) => {
          if (!onNavigate) return;
          e.preventDefault();
          onNavigate(STORY_HREF);
        }}
        style={{
          fontSize: "10px",
          letterSpacing: "0.25em",
          color: "var(--nav-overlay-text)",
          textDecoration: "none",
          opacity: 0.7,
        }}
      >
        Read our story
      </motion.a>
    </div>
  );
}

"use client";

import Image from "next/image";
import { motion } from "framer-motion";

// The desktop menu's right panel. It is the same width as the link column and
// would otherwise be empty, so it carries the short version of who we are:
// enough for someone who arrived on /partners or a QR code and has never seen
// the home page.
//
// Reveal order matches the left panel's link stagger (LINK_BASE_DELAY / ease)
// so the two panels read as one motion system.

const STORY_IMAGE = "/images-web/Gallery/Gallery-5.jpg";
const STORY_IMAGE_WIDTH = 1024;
const STORY_IMAGE_HEIGHT = 682;

const STORY_HREF = "/#about";

const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;
const BASE_DELAY = 0.35;
const STEP = 0.12;
const REVEAL_DURATION = 0.55;

const revealTransition = (index: number) => ({
  delay: BASE_DELAY + index * STEP,
  duration: REVEAL_DURATION,
  ease: REVEAL_EASE,
});

const revealExit = {
  opacity: 0,
  y: 16,
  transition: { duration: 0.2, ease: "easeIn" as const },
};

const reveal = (index: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: revealExit,
  transition: revealTransition(index),
});

interface NavKitchenNoteProps {
  /** Routed through the menu's own close-then-navigate choreography. */
  onNavigate?: (href: string) => void;
}

export function NavKitchenNote({ onNavigate }: NavKitchenNoteProps) {
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
      <motion.div {...reveal(0)} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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

      <motion.div {...reveal(1)} style={{ width: "100%" }}>
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
        {...reveal(2)}
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

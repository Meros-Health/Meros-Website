"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const KITCHEN_IMAGE = "/images-web/Gallery/Gallery-5.jpg";
const KITCHEN_IMAGE_WIDTH = 1024;
const KITCHEN_IMAGE_HEIGHT = 682;

// Matches NavMenuOverlay's left-panel link stagger (LINK_BASE_DELAY / ease)
// so the right panel reads as one motion system, not a bolted-on block.
const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;
const TEXT_DELAY = 0.35;
const IMAGE_DELAY = TEXT_DELAY + 0.12;
const REVEAL_DURATION = 0.55;

const revealTransition = (delay: number) => ({
  delay,
  duration: REVEAL_DURATION,
  ease: REVEAL_EASE,
});

const revealExit = {
  opacity: 0,
  y: 16,
  transition: { duration: 0.2, ease: "easeIn" as const },
};

export function NavKitchenNote() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.85rem",
        color: "var(--nav-overlay-text)",
        // Definite width (not maxWidth on an auto-sized flex item) so the
        // width:100% image below has something concrete to resolve against
        // instead of racing its own shrink-to-fit parent.
        width: "clamp(180px, 20vw, 260px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={revealExit}
        transition={revealTransition(TEXT_DELAY)}
        style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}
      >
        <span
          className="font-body-caps"
          style={{ fontSize: "10px", letterSpacing: "0.25em", opacity: 0.6 }}
        >
          From the Kitchen
        </span>
        <p
          className="font-body-mixed"
          style={{ fontSize: "0.85rem", lineHeight: 1.5, opacity: 0.85 }}
        >
          Strained overnight, then layered with whatever is in season:
          blueberries, banana, toasted coconut, a spoon of honey.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={revealExit}
        transition={revealTransition(IMAGE_DELAY)}
        style={{ width: "100%" }}
      >
        <Image
          src={KITCHEN_IMAGE}
          alt="Yogurt bowls with seasonal fruit and toppings"
          width={KITCHEN_IMAGE_WIDTH}
          height={KITCHEN_IMAGE_HEIGHT}
          sizes="20vw"
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      </motion.div>
    </div>
  );
}

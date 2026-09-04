"use client";

import { motion } from "framer-motion";
import { TransitionLink } from "@/components/transition/TransitionLink";

const MotionLink = motion.create(TransitionLink);

type CTAVariant = "light" | "dark" | "accent";

interface CTAButtonProps {
  children: React.ReactNode;
  /** Required: every CTA is explicitly light or dark. */
  variant: CTAVariant;
  href?: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  textStyle?: React.CSSProperties;
  /** Only for links off the site (the delivery marketplaces). Pair with rel. */
  target?: "_blank";
  rel?: string;
}

const THEME = {
  dark: {
    fill: "bg-transparent",
    border: "border border-midnight",
    text: "text-midnight",
    outline: "focus-visible:outline-midnight",
  },
  light: {
    fill: "bg-cream",
    border: "border border-cream",
    text: "text-midnight",
    outline: "focus-visible:outline-cream",
  },
  // The loud one: brand grapefruit filled, cream type, the same pairing
  // AddToCartButton and the nav accent already use. It reads as the primary
  // action on either ground, so one variant covers cream and midnight sections.
  //
  // Cream on grapefruit is about 2.5:1, under the 4.5:1 WCAG AA wants for text
  // this size. Midnight type on the same fill clears it at 5.3:1 but does not
  // look like the button the rest of the site uses, so brand consistency won
  // here. If this needs to pass AA, deepen the fill toward --color-grapefruit-text
  // rather than darkening the type, and the button still looks like ours.
  accent: {
    fill: "bg-grapefruit",
    border: "border border-grapefruit",
    text: "text-cream",
    outline: "focus-visible:outline-grapefruit",
  },
} as const;

/**
 * Dark (outline-only): fades toward transparent on hover/press.
 * Light and accent (filled): background darkens a touch, like a natural press.
 */
const interaction = {
  dark: {
    initial: { opacity: 1 },
    whileHover: { opacity: 0.55 },
    whileFocus: { opacity: 0.55 },
    whileTap: { opacity: 0.35 },
    transition: { duration: 0.2, ease: "easeInOut" as const },
  },
  light: {
    initial: { filter: "brightness(1)" },
    whileHover: { filter: "brightness(0.92)" },
    whileFocus: { filter: "brightness(0.92)" },
    whileTap: { filter: "brightness(0.86)" },
    transition: { duration: 0.2, ease: "easeInOut" as const },
  },
  accent: {
    initial: { filter: "brightness(1)" },
    whileHover: { filter: "brightness(0.94)" },
    whileFocus: { filter: "brightness(0.94)" },
    whileTap: { filter: "brightness(0.88)" },
    transition: { duration: 0.2, ease: "easeInOut" as const },
  },
} as const;

export function CTAButton({
  children,
  variant,
  href,
  onClick,
  className = "",
  style,
  textStyle,
  target,
  rel,
}: CTAButtonProps) {
  const theme = THEME[variant];
  const base = [
    "cta",
    `cta-${variant}`,
    "relative inline-flex items-center justify-center overflow-hidden",
    "px-8 py-3.5",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    theme.outline,
    theme.fill,
    theme.border,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <span
      className={`relative z-10 font-body tracking-body-caps uppercase ${theme.text}`}
      style={{ fontSize: "0.75rem", ...textStyle }}
    >
      {children}
    </span>
  );

  const motionProps = interaction[variant];

  if (href) {
    return (
      <MotionLink href={href} target={target} rel={rel} className={base} style={style} {...motionProps}>
        {inner}
      </MotionLink>
    );
  }

  return (
    <motion.button type="button" onClick={onClick} className={base} style={style} {...motionProps}>
      {inner}
    </motion.button>
  );
}

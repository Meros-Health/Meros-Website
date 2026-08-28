"use client";

import { motion } from "framer-motion";
import { TransitionLink } from "@/components/transition/TransitionLink";

const MotionLink = motion.create(TransitionLink);

type CTAVariant = "light" | "dark";

interface CTAButtonProps {
  children: React.ReactNode;
  /** Required: every CTA is explicitly light or dark. */
  variant: CTAVariant;
  href?: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  textStyle?: React.CSSProperties;
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
} as const;

/**
 * Dark (outline-only): fades toward transparent on hover/press.
 * Light (filled): background darkens a touch, like a natural button press.
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
} as const;

export function CTAButton({
  children,
  variant,
  href,
  onClick,
  className = "",
  style,
  textStyle,
}: CTAButtonProps) {
  const theme = THEME[variant];
  const base = [
    "cta",
    `cta-${variant}`,
    "relative inline-flex items-center justify-center overflow-hidden",
    "rounded-btn px-8 py-3.5",
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
      <MotionLink href={href} className={base} style={style} {...motionProps}>
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

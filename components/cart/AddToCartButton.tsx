"use client";

interface AddToCartButtonProps {
  onClick: () => void;
  label?: string;
  addedLabel?: string;
  added?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function AddToCartButton({
  onClick,
  label = "Add to Cart",
  addedLabel = "Added",
  added = false,
  className = "",
  style,
}: AddToCartButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={added}
      className={[
        "w-full font-body-caps tracking-widest transition-colors duration-200",
        "disabled:cursor-default",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        fontSize: "clamp(0.5rem, 3.4cqw, 0.625rem)",
        padding: "clamp(0.55rem, 4cqw, 0.85rem) clamp(1rem, 5cqw, 1.5rem)",
        // Padding alone lands this at 42-43px on a phone, just under the 44px
        // floor Apple's HIG and WCAG 2.2 both use. Wider cards already clear it,
        // so this only lifts the small end.
        minHeight: "44px",
        background: added ? "transparent" : "var(--color-grapefruit)",
        color: added ? "var(--color-grapefruit)" : "var(--color-cream)",
        border: added ? "0.5px solid var(--color-grapefruit)" : "0.5px solid var(--color-grapefruit)",
        ...style,
      }}
    >
      {added ? addedLabel : label}
    </button>
  );
}

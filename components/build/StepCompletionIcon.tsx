interface StepCompletionIconProps {
  complete: boolean;
}

export function StepCompletionIcon({ complete }: StepCompletionIconProps) {
  if (complete) {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden
        className="shrink-0"
      >
        <rect width="14" height="14" rx="2" fill="var(--color-grapefruit)" />
        <path
          d="M3.5 7L6 9.5L10.5 4.5"
          stroke="var(--color-cream)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect
        x="0.5"
        y="0.5"
        width="13"
        height="13"
        rx="1.5"
        stroke="var(--color-juniper)"
        strokeOpacity="0.5"
      />
    </svg>
  );
}

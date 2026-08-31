"use client";

import { useRef } from "react";
import { useRevealReady } from "@/lib/useRevealReady";
import { Reveal } from "@/components/ui/ScrollReveal";

// A titled band of items on /catering, used twice: the service formats on
// cream, then the yogurts on midnight. The tone flip is the page's only
// section rhythm, so a scanner can tell where one subject ends and the next
// begins without reading a word.

export interface CateringItem {
  readonly id: string;
  readonly name: string;
  readonly body: string;
}

type Tone = "cream" | "midnight";

const TONE = {
  cream: {
    section: "bg-cream",
    heading: "text-midnight",
    body: "text-midnight/70",
    eyebrow: "text-grapefruit-text",
    rule: "rgba(41, 45, 42, 0.15)",
  },
  midnight: {
    section: "bg-midnight",
    heading: "text-cream",
    body: "text-cream/65",
    eyebrow: "text-grapefruit",
    rule: "rgba(255, 247, 240, 0.15)",
  },
} as const;

interface CateringSectionProps {
  id: string;
  tone: Tone;
  eyebrow: string;
  title: string;
  intro: string;
  items: readonly CateringItem[];
  /** Second, lighter group under the main grid (the yogurts' serving notes). */
  notes?: readonly CateringItem[];
  /** Both or neither. Only the formats section names an audience. */
  audienceLabel?: string;
  audience?: readonly string[];
}

export function CateringSection({
  id,
  tone,
  eyebrow,
  title,
  intro,
  items,
  notes,
  audienceLabel,
  audience,
}: CateringSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const show = useRevealReady(ref, "-120px");
  const theme = TONE[tone];

  return (
    <section id={id} ref={ref} className={`w-full ${theme.section} scroll-mt-24`}>
      <div className="mx-auto w-full max-w-[1600px] px-section-x py-section">
        <Reveal show={show} index={0}>
          <span className={`font-body-caps text-[10px] tracking-[0.30em] ${theme.eyebrow}`}>
            {eyebrow}
          </span>
        </Reveal>

        <Reveal show={show} index={1}>
          <h2
            className={`font-headline mt-4 uppercase leading-[0.95] ${theme.heading}`}
            style={{ fontSize: "clamp(2rem, 4.6vw, 3.75rem)" }}
          >
            {title}
          </h2>
        </Reveal>

        <Reveal show={show} index={2}>
          <p className={`font-body-mixed mt-6 max-w-2xl leading-relaxed text-[0.95rem] ${theme.body}`}>
            {intro}
          </p>
        </Reveal>

        {/* Numbered because the formats are options to choose between, and a
            number is the fastest way to refer to one on a phone call. */}
        <div className="mt-14 grid grid-cols-1 gap-x-12 gap-y-0 md:grid-cols-2">
          {items.map((item, i) => (
            <Reveal key={item.id} show={show} index={3 + i}>
              <article
                className="flex flex-col gap-3 py-8"
                style={{ borderTop: `0.5px solid ${theme.rule}` }}
              >
                <span className={`font-body-caps text-[10px] tracking-[0.25em] ${theme.eyebrow}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className={`font-headline uppercase leading-tight ${theme.heading}`} style={{ fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)" }}>
                  {item.name}
                </h3>
                <p className={`font-body-mixed leading-relaxed text-[0.9rem] ${theme.body}`}>
                  {item.body}
                </p>
              </article>
            </Reveal>
          ))}
        </div>

        {notes && notes.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-3">
            {notes.map((note, i) => (
              <Reveal key={note.id} show={show} index={3 + items.length + i}>
                <div
                  className="flex flex-col gap-2.5 pt-8"
                  style={{ borderTop: `0.5px solid ${theme.rule}` }}
                >
                  <h3 className={`font-body-caps text-[11px] tracking-[0.18em] ${theme.heading}`}>
                    {note.name}
                  </h3>
                  <p className={`font-body-mixed leading-relaxed text-[0.85rem] ${theme.body}`}>
                    {note.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {audienceLabel && audience && audience.length > 0 && (
          <Reveal show={show} index={3 + items.length + (notes?.length ?? 0)}>
            <div
              className="mt-16 flex flex-col gap-4 pt-8 sm:flex-row sm:items-baseline sm:gap-10"
              style={{ borderTop: `0.5px solid ${theme.rule}` }}
            >
              <span className={`font-body-caps shrink-0 text-[10px] tracking-[0.25em] ${theme.eyebrow}`}>
                {audienceLabel}
              </span>
              <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-8">
                {audience.map((entry) => (
                  <li key={entry} className={`font-body-mixed text-[0.9rem] ${theme.body}`}>
                    {entry}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}

// src/components/SmoothieCarousel.tsx
// Coverflow-style carousel — smooth rotation sliding via framer-motion

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, type MotionValue } from 'framer-motion';

// ─── Carousel tuning knobs ───────────────────────────────────────────────────
const SCALE_FACTOR = 10;   // % scale reduction per position away from center
const SKEW_FACTOR  = 8;    // deg of rotateY per position away from center
const CARD_GAP     = 8;    // px gap between adjacent card edges
const ARROW_SIZE   = 48;   // button width = height (px)
// ─────────────────────────────────────────────────────────────────────────────

interface SmoothieItem {
  name: string;
  image: string;
  descriptor: string;
}

const smoothies: SmoothieItem[] = [
  { name: 'The Rise',     image: '/Smoothies-Menu/Smoothie2b.jpg', descriptor: 'Blueberries, strawberries, banana, almond butter, chia seeds. Antioxidant-dense and protein-forward.' },
  { name: 'The Crave',    image: '/Smoothies-Menu/Smoothie1b.jpg', descriptor: 'Banana, peanut butter, dark chocolate, cacao nibs, flax meal, sea salt, raw honey. Rich in magnesium and satisfaction.' },
  { name: 'The Nutty',    image: '/Smoothies-Menu/Smoothie3b.jpg', descriptor: 'Banana, almond butter, walnuts, cacao nibs, raw honey. Omega-rich and deeply satisfying.' },
  { name: 'The Cabana',   image: '/Smoothies-Menu/Smoothie5b.jpg', descriptor: 'Mango, pineapple, papaya, coconut milk, chia seeds. High in Vitamin C and digestive enzymes.' },
  { name: 'The Recovery', image: '/Smoothies-Menu/Smoothie4b.jpg', descriptor: 'Banana, blueberries, peanut butter, hemp hearts, pumpkin seeds, whey protein. Built for post-workout repair.' },
  { name: 'The Essence',  image: '/Smoothies-Menu/Smoothie6b.jpg', descriptor: 'Blueberries, strawberries, banana, hemp hearts, flax meal, raw honey. Clean, fibre-rich and nourishing.' },
];

const total = smoothies.length;

// ─── Position helpers ────────────────────────────────────────────────────────

function getCardXUnsigned(steps: number, baseWidth: number): number {
  let x = 0;
  for (let i = 1; i <= steps; i++) {
    const prevScale = 1 - ((i - 1) * SCALE_FACTOR / 100);
    const currScale = 1 - (i * SCALE_FACTOR / 100);
    x += (baseWidth * prevScale / 2) + CARD_GAP + (baseWidth * currScale / 2);
  }
  return x;
}

function getCardXContinuous(effectiveSlot: number, baseWidth: number): number {
  if (effectiveSlot === 0) return 0;
  const sign = effectiveSlot < 0 ? -1 : 1;
  const abs = Math.abs(effectiveSlot);
  const floor = Math.floor(abs);
  const frac = abs - floor;
  const xFloor = getCardXUnsigned(floor, baseWidth);
  const xCeil = getCardXUnsigned(floor + 1, baseWidth);
  return sign * (xFloor + frac * (xCeil - xFloor));
}

// ─── Individual card ─────────────────────────────────────────────────────────

interface CardProps {
  slot: number;
  offset: MotionValue<number>;
  smoothie: SmoothieItem;
  cardWidth: number;
  cardHeight: number;
}

const CarouselCard: React.FC<CardProps> = ({ slot, offset, smoothie, cardWidth, cardHeight }) => {
  const cwRef = useRef(cardWidth);
  cwRef.current = cardWidth;

  const x = useTransform(offset, o => getCardXContinuous(slot + o, cwRef.current));
  const scaleVal = useTransform(offset, o => Math.max(0.6, 1 - (Math.abs(slot + o) * SCALE_FACTOR / 100)));
  const rotateYVal = useTransform(offset, o => -(slot + o) * SKEW_FACTOR);
  const zIndex = useTransform(offset, o => {
    const absPos = Math.abs(slot + o);
    if (absPos < 0.5) return 5;
    if (absPos < 1.5) return 3;
    if (absPos < 2.5) return 2;
    return 1;
  });
  const opacityVal = useTransform(offset, o => {
    const absPos = Math.abs(slot + o);
    return Math.max(0, Math.pow(0.42, absPos));
  });
  const textOpacity = useTransform(offset, o => {
    const absPos = Math.abs(slot + o);
    return Math.max(0.55, 1 - absPos * 0.45);
  });
  const boxShadow = useTransform(offset, o => {
    const absPos = Math.abs(slot + o);
    const t = Math.min(absPos, 1);
    const a1 = (0.50 - t * 0.48).toFixed(3);
    const b1 = Math.round(72 - t * 68);
    const y1 = Math.round(28 - t * 25);
    const a2 = (0.30 - t * 0.28).toFixed(3);
    const b2 = Math.round(22 - t * 19);
    const y2 = Math.round(10 - t * 8);
    const a3 = (0.20 - t * 0.18).toFixed(3);
    const b3 = Math.round(7 - t * 5);
    const y3 = Math.round(3 - t * 2);
    return `0 ${y1}px ${b1}px rgba(0,0,0,${a1}), 0 ${y2}px ${b2}px rgba(0,0,0,${a2}), 0 ${y3}px ${b3}px rgba(0,0,0,${a3})`;
  });

  const isFront = slot === 0;

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: cardWidth,
        height: cardHeight,
        marginLeft: -cardWidth / 2,
        marginTop: -cardHeight / 2,
        x,
        scale: scaleVal,
        rotateY: rotateYVal,
        opacity: opacityVal,
        zIndex,
        transformOrigin: 'center center',
        pointerEvents: isFront ? 'auto' : 'none',
        borderRadius: '12px',
      }}
    >
      <motion.div style={{
        width: '100%',
        height: '100%',
        borderRadius: '12px',
        overflow: 'hidden',
        clipPath: 'inset(0 round 12px)',
        boxShadow,
      }}>
        <img
          src={smoothie.image}
          alt={smoothie.name}
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
        <motion.div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          padding: '2.5rem 1.5rem 1.75rem',
          background: 'linear-gradient(to top, rgba(20,36,22,0.97) 0%, rgba(20,36,22,0.72) 55%, transparent 100%)',
          opacity: textOpacity,
        }}>
          <h3 style={{
            fontFamily: "'Montage Serif', serif",
            fontWeight: 700,
            fontSize: 'clamp(1.15rem, 2vw, 1.65rem)',
            color: '#FAFAF7',
            margin: '0 0 0.25rem',
            paddingBottom: '0.45rem',
            borderBottom: '1.5px solid #C96A4A',
            letterSpacing: '0.01em',
          }}>
            {smoothie.name}
          </h3>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontWeight: 400,
            fontSize: 'clamp(0.68rem, 1vw, 0.8125rem)',
            color: 'rgba(250,250,247,0.82)',
            margin: '0.4rem 0 0',
            lineHeight: 1.55,
          }}>
            {smoothie.descriptor}
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// ─── Arrow button ─────────────────────────────────────────────────────────────

const ChevronLeft = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4L6 9L11 14" />
  </svg>
);

const ChevronRight = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 4L12 9L7 14" />
  </svg>
);

interface ArrowProps {
  direction: 'prev' | 'next';
  pad: number;
  onClick: () => void;
}

const ArrowButton: React.FC<ArrowProps> = ({ direction, pad, onClick }) => (
  <motion.button
    onClick={onClick}
    aria-label={direction === 'prev' ? 'Previous smoothie' : 'Next smoothie'}
    className={`carousel-arrow carousel-arrow--${direction}`}
    style={{
      position: 'absolute',
      [direction === 'prev' ? 'left' : 'right']: `${pad}px`,
      top: '50%',
      translateY: '-50%',
      zIndex: 10,
    }}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.88 }}
    transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {direction === 'prev' ? <ChevronLeft /> : <ChevronRight />}
  </motion.button>
);

// ─── Dot indicators ───────────────────────────────────────────────────────────

const DotIndicators: React.FC<{ total: number; active: number }> = ({ total, active }) => (
  <div
    style={{
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 32,
      paddingBottom: 4,
    }}
    aria-hidden="true"
  >
    {Array.from({ length: total }).map((_, i) => (
      <motion.div
        key={i}
        animate={{
          width: i === active ? 22 : 6,
          opacity: i === active ? 1 : 0.32,
        }}
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: i === active ? '#C96A4A' : '#FAFAF7',
          flexShrink: 0,
        }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
      />
    ))}
  </div>
);

// ─── Main carousel ───────────────────────────────────────────────────────────

const RENDER_SLOTS = [-3, -2, -1, 0, 1, 2, 3];

const SmoothieCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(280);
  const [arrowPad, setArrowPad] = useState(24);
  const offset = useMotionValue(0);
  const isAnimating = useRef(false);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      let width: number;
      if (w <= 480)       width = Math.round(w * 0.76);
      else if (w <= 768)  width = Math.round(w * 0.52);
      else if (w <= 1024) width = Math.round(w * 0.34);
      else if (w <= 1440) width = Math.round(w * 0.26);
      else                width = Math.round(w * 0.22);
      width = Math.min(Math.max(width, 200), 520);
      setCardWidth(width);

      // Place arrow in the middle of the gap between front card edge and screen edge.
      // Gap on one side = (viewport - cardWidth) / 2
      // Midpoint of that gap from edge = gap / 2
      // Subtract half the arrow button so the button center lands at the midpoint.
      const gapHalf = (w - width) / 2;
      const pad = Math.max(8, Math.round(gapHalf / 2 - ARROW_SIZE / 2));
      setArrowPad(pad);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const cardHeight = Math.round(cardWidth * 1.5);

  const next = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    animate(offset, -1, {
      duration: 0.5,
      ease: [0.22, 0.68, 0.35, 1],
      onComplete: () => {
        setActiveIndex(i => (i + 1) % total);
        offset.set(0);
        isAnimating.current = false;
      },
    });
  }, [offset]);

  const prev = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    animate(offset, 1, {
      duration: 0.5,
      ease: [0.22, 0.68, 0.35, 1],
      onComplete: () => {
        setActiveIndex(i => (i - 1 + total) % total);
        offset.set(0);
        isAnimating.current = false;
      },
    });
  }, [offset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  return (
    <div
      role="region"
      aria-label="Smoothie menu"
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Track wrapper — arrows absolutely positioned relative to this */}
      <div style={{ position: 'relative', width: '100%' }}>
        <ArrowButton direction="prev" pad={arrowPad} onClick={prev} />

        {/* Card track */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: `${cardHeight}px`,
          perspective: '1200px',
        }}>
          {RENDER_SLOTS.map(s => {
            const dataIndex = ((activeIndex + s) % total + total) % total;
            return (
              <CarouselCard
                key={s}
                slot={s}
                offset={offset}
                smoothie={smoothies[dataIndex]}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
              />
            );
          })}
        </div>

        <ArrowButton direction="next" pad={arrowPad} onClick={next} />
      </div>

      <DotIndicators total={total} active={activeIndex} />
    </div>
  );
};

export default SmoothieCarousel;

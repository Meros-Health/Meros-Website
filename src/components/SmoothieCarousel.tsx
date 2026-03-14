// src/components/SmoothieCarousel.tsx
// Coverflow-style carousel — smooth rotation sliding via framer-motion

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate, type MotionValue } from 'framer-motion';

// ─── Carousel tuning knobs ───────────────────────────────────────────────────
const SCALE_FACTOR = 10;   // % scale reduction per position away from center
const SKEW_FACTOR  = 8;    // deg of rotateY per position away from center
const CARD_GAP     = 8;    // px gap between adjacent card edges
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

/** Unsigned X offset for an integer number of steps from center */
function getCardXUnsigned(steps: number, baseWidth: number): number {
  let x = 0;
  for (let i = 1; i <= steps; i++) {
    const prevScale = 1 - ((i - 1) * SCALE_FACTOR / 100);
    const currScale = 1 - (i * SCALE_FACTOR / 100);
    x += (baseWidth * prevScale / 2) + CARD_GAP + (baseWidth * currScale / 2);
  }
  return x;
}

/** Continuous X offset — linearly interpolates between integer positions */
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
  // Use refs so useTransform closures always read the latest size
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
    // Exponential decay: 1.0 at center → ~0.42 at ±1 → ~0.18 at ±2 → ~0.07 at ±3
    return Math.max(0, Math.pow(0.42, absPos));
  });
  const textOpacity = useTransform(offset, o => {
    const absPos = Math.abs(slot + o);
    // Smooth fade: 1 at center → 0.55 by 1 slot away
    return Math.max(0.55, 1 - absPos * 0.45);
  });
  const boxShadow = useTransform(offset, o => {
    const absPos = Math.abs(slot + o);
    const t = Math.min(absPos, 1);
    // Three-layer Apple-style shadow — richest at center, dissolves as card moves away
    const a1 = (0.50 - t * 0.48).toFixed(3); // ambient lift
    const b1 = Math.round(72 - t * 68);
    const y1 = Math.round(28 - t * 25);
    const a2 = (0.30 - t * 0.28).toFixed(3); // mid shadow
    const b2 = Math.round(22 - t * 19);
    const y2 = Math.round(10 - t * 8);
    const a3 = (0.20 - t * 0.18).toFixed(3); // close contact
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
        borderRadius: '10px',
      }}
    >
      <motion.div style={{
        width: '100%',
        height: '100%',
        borderRadius: '10px',
        overflow: 'hidden',
        // clipPath clips the image reliably even inside a 3D-transformed ancestor
        clipPath: 'inset(0 round 10px)',
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
          padding: '2rem 1.5rem 1.5rem',
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

// ─── Main carousel ───────────────────────────────────────────────────────────

const RENDER_SLOTS = [-3, -2, -1, 0, 1, 2, 3];

const SmoothieCarousel: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(280);
  const [arrowPad, setArrowPad] = useState(16);
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
      setCardWidth(Math.min(Math.max(width, 200), 520));

      if (w <= 480)       setArrowPad(8);
      else if (w <= 768)  setArrowPad(12);
      else if (w <= 1024) setArrowPad(20);
      else                setArrowPad(32);
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
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Prev arrow */}
      <button
        onClick={prev}
        aria-label="Previous smoothie"
        className="carousel-arrow carousel-arrow--prev"
        style={{ position: 'absolute', left: `${arrowPad}px`, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
      >
        ←
      </button>

      {/* Card track — perspective on parent for unified 3D depth */}
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

      {/* Next arrow */}
      <button
        onClick={next}
        aria-label="Next smoothie"
        className="carousel-arrow carousel-arrow--next"
        style={{ position: 'absolute', right: `${arrowPad}px`, top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
      >
        →
      </button>
    </div>
  );
};

export default SmoothieCarousel;

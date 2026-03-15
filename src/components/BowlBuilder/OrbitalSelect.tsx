import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Ingredient } from './ingredients';

interface OrbitalSelectProps {
  ingredients: Ingredient[];
  selectedIngredients: Set<string>;
  onToggleIngredient: (ingredient: Ingredient) => void;
  stepNumber: number;
  stepLabel: string;
}

// ─── TUNING KNOBS ───────────────────────────────────────────────────
// Adjust these to control node card sizes and orbit spacing.
// Orbit radius is derived FROM card size so spacing scales automatically.

const CARD_MIN = 90;          // Minimum card width (px) — raise for bigger mobile cards
const CARD_MAX = 160;         // Maximum card width (px) — raise for bigger desktop cards
const CARD_SCALE = 0.25;      // How aggressively cards grow with container (0.1 = slow, 0.25 = fast)
const CARD_ASPECT = 1.3;     // Card height = width * this ratio
const ORBIT_PAD_FACTOR = 0.8; // Padding around orbit = card size * this. Controls node-to-edge spacing.
                              // Higher = more padding = smaller orbit = nodes closer together.
                              // Lower = less padding = larger orbit = nodes further apart.
const ORBIT_PAD_FACTOR_DESKTOP = 0.3; // Less padding on desktop = larger orbit radius
const DESKTOP_BREAKPOINT = 768; // Width threshold (px) to switch to desktop orbit padding
const RADIUS_MIN = 120;       // Minimum orbit radius floor (px)
const ORBIT_DOWNSHIFT_WIDTH = 1100;    // Container width (px) above which orbit shifts down
const ORBIT_DOWNSHIFT_MAX = 28;        // Maximum downward offset (px)
const FONT_MIN = 0.65;        // Minimum label font size (rem)
const FONT_MAX = 0.95;        // Maximum label font size (rem)

// Node-count reduction — shrinks cards when many nodes share the orbit
const NODE_BASELINE = 4;       // Node count at which no reduction is applied
const NODE_REDUCTION_RATE = 0.05; // Scale reduction per node above baseline (0.05 = 5% per extra node)
const NODE_REDUCTION_FLOOR = 0.7; // Never shrink below 70% of the computed card size
// ────────────────────────────────────────────────────────────────────

// Derive orbit radius and card sizes from the container's rendered dimensions.
// The constraining axis is whichever is smaller; on wide desktops that's height.
function computeFromContainer(width: number, height: number, nodeCount: number) {
  // Card dimensions scale with the smaller container axis, clamped to min/max
  let cardWidth = Math.max(CARD_MIN, Math.min(CARD_MAX, Math.min(width, height) * CARD_SCALE));

  // Reduce card size when there are many nodes in orbit
  const extraNodes = Math.max(0, nodeCount - NODE_BASELINE);
  const nodeScaleFactor = Math.max(NODE_REDUCTION_FLOOR, 1 - extraNodes * NODE_REDUCTION_RATE);
  cardWidth = Math.max(CARD_MIN * NODE_REDUCTION_FLOOR, cardWidth * nodeScaleFactor);

  const cardHeight = cardWidth * CARD_ASPECT;

  // Padding scales with card size — bigger cards get proportionally more clearance
  // Use less padding on desktop for a larger orbit radius
  const padFactor = width >= DESKTOP_BREAKPOINT ? ORBIT_PAD_FACTOR_DESKTOP : ORBIT_PAD_FACTOR;
  const padX = cardWidth * padFactor;
  const padY = cardHeight * padFactor;
  const usableW = width - padX * 2;
  const usableH = height - padY * 2;

  // Radius based on the smaller available dimension
  const maxRadiusW = usableW / 2;
  const maxRadiusH = usableH / 2;
  const radius = Math.max(RADIUS_MIN, Math.min(maxRadiusW, maxRadiusH));

  const fontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, cardWidth / 150));

  // Nudge orbit downward on wider screens where larger radius pushes top cards into tab bar
  const overWidth = Math.max(0, width - ORBIT_DOWNSHIFT_WIDTH);
  const verticalOffset = width >= DESKTOP_BREAKPOINT ? Math.min(ORBIT_DOWNSHIFT_MAX, overWidth * 0.15) : 0;

  return { radius, cardWidth, cardHeight, fontSize, verticalOffset };
}

export default function OrbitalSelect({
  ingredients,
  selectedIngredients,
  onToggleIngredient,
  stepNumber,
}: OrbitalSelectProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [responsiveValues, setResponsiveValues] = useState({ radius: 140, cardWidth: 80, cardHeight: 98, fontSize: 0.65, verticalOffset: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const rotationRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const snapRafRef = useRef<number>(0);
  const responsiveRef = useRef(responsiveValues);
  const ingredientsRef = useRef(ingredients);
  const expandedIdRef = useRef<string | null>(null);

  // Keep refs in sync with state/props
  responsiveRef.current = responsiveValues;
  ingredientsRef.current = ingredients;
  expandedIdRef.current = expandedId;

  // Derive sizes from actual container dimensions via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setResponsiveValues(computeFromContainer(width, height, ingredients.length));
      }
    };

    measure(); // Initial measurement

    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ingredients.length]);

  // Close card when clicking anywhere outside the expanded node (including MacroPanel, header, etc.)
  useEffect(() => {
    if (!expandedId) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const expandedNode = nodeRefs.current[expandedId];
      if (expandedNode && !expandedNode.contains(e.target as Node)) {
        setExpandedId(null);
        setAutoRotate(true);
      }
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [expandedId]);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedId(null);
      setAutoRotate(true);
    }
  };

  const toggleItem = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setAutoRotate(true);
    } else {
      setExpandedId(id);
      setAutoRotate(false);
      centerViewOnNode(id);
    }
  };

  // RAF-driven rotation — updates DOM directly, no React re-renders
  useEffect(() => {
    if (!autoRotate) return;

    const DEGREES_PER_SECOND = 5; // 0.25 per 50ms = 5 deg/s

    const tick = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      rotationRef.current = (rotationRef.current + DEGREES_PER_SECOND * (delta / 1000)) % 360;

      const items = ingredientsRef.current;
      const rv = responsiveRef.current;
      const total = items.length;

      for (let i = 0; i < total; i++) {
        const el = nodeRefs.current[items[i].id];
        if (!el) continue;

        const angle = ((i / total) * 360 + rotationRef.current) % 360;
        const radian = (angle * Math.PI) / 180;
        const x = rv.radius * Math.cos(radian);
        const y = rv.radius * Math.sin(radian) + rv.verticalOffset;
        const opacity = Math.max(0.5, Math.min(1, 0.5 + 0.5 * ((1 + Math.sin(radian)) / 2)));

        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        el.style.opacity = String(opacity);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = 0;
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [autoRotate]);

  // Reset expanded state when ingredients change (tab switch)
  useEffect(() => {
    setExpandedId(null);
    setAutoRotate(true);
  }, [ingredients]);

  const centerViewOnNode = (nodeId: string) => {
    const nodeIndex = ingredients.findIndex((item) => item.id === nodeId);
    const totalNodes = ingredients.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;
    const targetRotation = 270 - targetAngle;

    // Cancel any existing snap animation
    cancelAnimationFrame(snapRafRef.current);

    const startRotation = rotationRef.current;
    // Find shortest rotation path (handle wrapping around 360)
    let diff = targetRotation - startRotation;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const duration = 700; // ms — matches original CSS transition duration
    let startTime = 0;

    // Cubic-bezier(0.25, 0.1, 0.25, 1) approximation via ease-out curve
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const animateSnap = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = ease(progress);

      rotationRef.current = (startRotation + diff * eased) % 360;
      if (rotationRef.current < 0) rotationRef.current += 360;
      applyNodePositions();

      if (progress < 1) {
        snapRafRef.current = requestAnimationFrame(animateSnap);
      }
    };

    snapRafRef.current = requestAnimationFrame(animateSnap);
  };

  const applyNodePositions = () => {
    const items = ingredientsRef.current;
    const rv = responsiveRef.current;
    const total = items.length;
    const currentExpanded = expandedIdRef.current;
    for (let i = 0; i < total; i++) {
      const el = nodeRefs.current[items[i].id];
      if (!el) continue;
      const isExpanded = items[i].id === currentExpanded;
      const angle = ((i / total) * 360 + rotationRef.current) % 360;
      const radian = (angle * Math.PI) / 180;
      const x = rv.radius * Math.cos(radian);
      const y = rv.radius * Math.sin(radian) + rv.verticalOffset;
      const opacity = isExpanded ? 1 : Math.max(0.5, Math.min(1, 0.5 + 0.5 * ((1 + Math.sin(radian)) / 2)));
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.opacity = String(opacity);
      el.style.zIndex = isExpanded ? '200' : String(100 + i);
    }
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationRef.current) % 360;
    const radius = responsiveValues.radius;
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian) + responsiveValues.verticalOffset;

    const zIndex = 100 + index;
    const opacity = Math.max(0.5, Math.min(1, 0.5 + 0.5 * ((1 + Math.sin(radian)) / 2)));

    return { x, y, angle, zIndex, opacity };
  };

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      className="orbital-container"
    >
      <div
        ref={orbitRef}
        className="orbital-stage"
      >
        {/* Center node - step indicator */}
        <div className="orbital-center" style={responsiveValues.verticalOffset > 0 ? { transform: `translateY(${responsiveValues.verticalOffset}px)` } : undefined}>
          <div className="orbital-center__ring orbital-center__ring--outer" />
          <div className="orbital-center__ring orbital-center__ring--inner" />
          <div className="orbital-center__core">
            <span className="orbital-center__number">{stepNumber}</span>
          </div>
        </div>

        {/* Orbit ring */}
        <div className="orbital-ring" style={responsiveValues.verticalOffset > 0 ? { transform: `translateY(${responsiveValues.verticalOffset}px)` } : undefined} />

        {/* Ingredient nodes */}
        {ingredients.map((ingredient, index) => {
          const position = calculateNodePosition(index, ingredients.length);
          const isExpanded = expandedId === ingredient.id;
          const isSelected = selectedIngredients.has(ingredient.id);

          return (
            <div
              key={ingredient.id}
              ref={(el) => { nodeRefs.current[ingredient.id] = el; }}
              className="orbital-node"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                zIndex: isExpanded ? 200 : position.zIndex,
                opacity: isExpanded ? 1 : position.opacity,
              }}
              onClick={(e) => {
                e.stopPropagation();
                toggleItem(ingredient.id);
              }}
            >
              {/* Node card */}
              <motion.div
                className={`orbital-node__card ${isSelected ? 'orbital-node__card--selected' : ''} ${isExpanded ? 'orbital-node__card--expanded' : ''}`}
                style={{
                  width: responsiveValues.cardWidth,
                  height: responsiveValues.cardHeight,
                }}
                animate={{
                  scale: isExpanded ? 1.15 : 1,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <div
                  className="orbital-node__image"
                  style={{ backgroundImage: `url(${ingredient.image})` }}
                />
                <div className="orbital-node__overlay" />
                <span 
                  className="orbital-node__name"
                  style={{ fontSize: `${responsiveValues.fontSize}rem` }}
                >{ingredient.name}</span>
                {isSelected && (
                  <motion.div
                    className="orbital-node__check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </motion.div>
                )}
              </motion.div>

              {/* Expanded health stats card */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="orbital-card"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="orbital-card__connector" />
                    
                    <div className="orbital-card__header">
                      <h3 className="orbital-card__title">{ingredient.name}</h3>
                      <span className="orbital-card__calories">{ingredient.calories} kcal</span>
                    </div>

                    {ingredient.micronutrient && (
                      <div className="orbital-card__tag">
                        {ingredient.micronutrient.name}: {ingredient.micronutrient.value}
                      </div>
                    )}

                    <div className="orbital-card__macros">
                      <div className="orbital-card__macro">
                        <span className="orbital-card__macro-value">{ingredient.protein}g</span>
                        <span className="orbital-card__macro-label">Protein</span>
                      </div>
                      <div className="orbital-card__macro">
                        <span className="orbital-card__macro-value">{ingredient.carbs}g</span>
                        <span className="orbital-card__macro-label">Carbs</span>
                      </div>
                      <div className="orbital-card__macro">
                        <span className="orbital-card__macro-value">{ingredient.fat}g</span>
                        <span className="orbital-card__macro-label">Fat</span>
                      </div>
                    </div>

                    <motion.button
                      className={`orbital-card__button ${isSelected ? 'orbital-card__button--remove' : ''}`}
                      whileTap={{ scale: 0.97 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleIngredient(ingredient);
                      }}
                    >
                      {isSelected ? 'Remove from Bowl' : 'Add to Bowl'}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <style>{`
        .orbital-container {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: visible;
        }

        .orbital-stage {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Center node */
        .orbital-center {
          position: absolute;
          width: clamp(60px, 10vw, 80px);
          height: clamp(60px, 10vw, 80px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .orbital-center__ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(28, 46, 30, 0.15);
        }

        .orbital-center__ring--outer {
          width: clamp(70px, 12vw, 90px);
          height: clamp(70px, 12vw, 90px);
          animation: pulse-ring 2.5s ease-in-out infinite;
        }

        .orbital-center__ring--inner {
          width: clamp(80px, 14vw, 100px);
          height: clamp(80px, 14vw, 100px);
          animation: pulse-ring 2.5s ease-in-out infinite 0.5s;
        }

        .orbital-center__core {
          width: clamp(55px, 9vw, 70px);
          height: clamp(55px, 9vw, 70px);
          border-radius: 50%;
          background: var(--forest);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 32px rgba(28, 46, 30, 0.25);
        }

        .orbital-center__number {
          font-family: var(--font-display);
          font-size: clamp(1.25rem, 3vw, 1.75rem);
          font-weight: 300;
          color: var(--white);
          line-height: 1;
        }

        .orbital-center__label {
          font-family: var(--font-body);
          font-size: clamp(0.4rem, 1vw, 0.5rem);
          color: rgba(250, 250, 247, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-top: 2px;
        }

        /* Orbit ring - responsive to match radius */
        .orbital-ring {
          position: absolute;
          width: ${responsiveValues.radius * 2}px;
          height: ${responsiveValues.radius * 2}px;
          border-radius: 50%;
          border: 1px dashed rgba(28, 46, 30, 0.12);
          transition: width 0.3s ease, height 0.3s ease;
        }

        /* Nodes */
        .orbital-node {
          position: absolute;
          cursor: pointer;
          will-change: transform, opacity;
        }

        .orbital-node__card {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid transparent;
          transition: border-color 0.3s ease, box-shadow 0.3s ease, width 0.3s ease, height 0.3s ease;
        }

        .orbital-node__card--selected {
          border-color: var(--terracotta);
          box-shadow: 0 0 0 3px rgba(201, 106, 74, 0.2);
        }

        .orbital-node__card--expanded {
          border-color: var(--forest);
        }

        .orbital-node__image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
        }

        .orbital-node__overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(28, 46, 30, 0.85) 0%,
            rgba(28, 46, 30, 0.4) 50%,
            rgba(28, 46, 30, 0.2) 100%
          );
        }

        .orbital-node__name {
          position: absolute;
          bottom: 8px;
          left: 6px;
          right: 6px;
          font-family: var(--font-body);
          font-weight: 500;
          color: var(--white);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-align: center;
          line-height: 1.2;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        .orbital-node__check {
          position: absolute;
          top: 6px;
          right: 6px;
          width: clamp(18px, 3vw, 24px);
          height: clamp(18px, 3vw, 24px);
          border-radius: 50%;
          background: var(--terracotta);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
        }

        /* Expanded card */
        .orbital-card {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 300;
          width: clamp(180px, 30vw, 220px);
          background: rgba(28, 46, 30, 0.98);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: clamp(12px, 2vw, 16px);
          box-shadow: 0 16px 48px rgba(28, 46, 30, 0.4);
        }

        .orbital-card__connector {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 1px;
          height: 8px;
          background: rgba(255, 255, 255, 0.3);
        }

        .orbital-card__header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 8px;
        }

        .orbital-card__title {
          font-family: var(--font-display);
          font-size: clamp(0.875rem, 2vw, 1rem);
          font-weight: 400;
          color: var(--white);
          margin: 0;
        }

        .orbital-card__calories {
          font-family: var(--font-body);
          font-size: clamp(0.6rem, 1.5vw, 0.7rem);
          color: rgba(250, 250, 247, 0.6);
          letter-spacing: 0.05em;
        }

        .orbital-card__tag {
          display: inline-block;
          padding: 3px 8px;
          background: rgba(201, 106, 74, 0.2);
          border: 1px solid rgba(201, 106, 74, 0.3);
          border-radius: 4px;
          font-family: var(--font-body);
          font-size: clamp(0.5rem, 1.2vw, 0.6rem);
          color: var(--terracotta);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 12px;
        }

        .orbital-card__macros {
          display: flex;
          gap: 8px;
          margin-bottom: 14px;
        }

        .orbital-card__macro {
          flex: 1;
          text-align: center;
          padding: 8px 4px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
        }

        .orbital-card__macro-value {
          display: block;
          font-family: var(--font-body);
          font-size: clamp(0.75rem, 2vw, 0.9rem);
          font-weight: 500;
          color: var(--white);
        }

        .orbital-card__macro-label {
          display: block;
          font-family: var(--font-body);
          font-size: clamp(0.45rem, 1vw, 0.55rem);
          color: rgba(250, 250, 247, 0.5);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-top: 2px;
        }

        .orbital-card__button {
          width: 100%;
          padding: 10px 16px;
          background: var(--terracotta);
          border: none;
          border-radius: 6px;
          font-family: var(--font-body);
          font-size: clamp(0.6rem, 1.5vw, 0.7rem);
          font-weight: 500;
          color: var(--white);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.15s ease;
        }

        .orbital-card__button:hover {
          background: var(--forest-mid);
        }

        .orbital-card__button--remove {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .orbital-card__button--remove:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        @keyframes pulse-ring {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.15;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}

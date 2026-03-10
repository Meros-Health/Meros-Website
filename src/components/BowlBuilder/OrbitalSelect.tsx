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

export default function OrbitalSelect({
  ingredients,
  selectedIngredients,
  onToggleIngredient,
  stepNumber,
  stepLabel,
}: OrbitalSelectProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  useEffect(() => {
    let rotationTimer: ReturnType<typeof setInterval>;

    if (autoRotate) {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.25) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) {
        clearInterval(rotationTimer);
      }
    };
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
    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = 140; // Scaled down for container fit
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian);
    const y = radius * Math.sin(radian);

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
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
        <div className="orbital-center">
          <div className="orbital-center__ring orbital-center__ring--outer" />
          <div className="orbital-center__ring orbital-center__ring--inner" />
          <div className="orbital-center__core">
            <span className="orbital-center__number">{stepNumber}</span>
            <span className="orbital-center__label">{stepLabel}</span>
          </div>
        </div>

        {/* Orbit ring */}
        <div className="orbital-ring" />

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
                <span className="orbital-node__name">{ingredient.name}</span>
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
          height: 420px;
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
          width: 80px;
          height: 80px;
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
          width: 90px;
          height: 90px;
          animation: pulse-ring 2.5s ease-in-out infinite;
        }

        .orbital-center__ring--inner {
          width: 100px;
          height: 100px;
          animation: pulse-ring 2.5s ease-in-out infinite 0.5s;
        }

        .orbital-center__core {
          width: 70px;
          height: 70px;
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
          font-size: 1.75rem;
          font-weight: 300;
          color: var(--white);
          line-height: 1;
        }

        .orbital-center__label {
          font-family: var(--font-body);
          font-size: 0.5rem;
          color: rgba(250, 250, 247, 0.6);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-top: 2px;
        }

        /* Orbit ring */
        .orbital-ring {
          position: absolute;
          width: 280px;
          height: 280px;
          border-radius: 50%;
          border: 1px dashed rgba(28, 46, 30, 0.12);
        }

        /* Nodes */
        .orbital-node {
          position: absolute;
          cursor: pointer;
          transition: transform 0.7s cubic-bezier(0.25, 0.1, 0.25, 1), 
                      opacity 0.5s ease;
        }

        .orbital-node__card {
          position: relative;
          width: 64px;
          height: 80px;
          border-radius: 12px;
          overflow: hidden;
          border: 2px solid transparent;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
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
          bottom: 6px;
          left: 4px;
          right: 4px;
          font-family: var(--font-body);
          font-size: 0.6rem;
          font-weight: 500;
          color: var(--white);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          text-align: center;
          line-height: 1.2;
        }

        .orbital-node__check {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
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
          top: 90px;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          background: rgba(28, 46, 30, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 16px;
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
          font-size: 1rem;
          font-weight: 400;
          color: var(--white);
          margin: 0;
        }

        .orbital-card__calories {
          font-family: var(--font-body);
          font-size: 0.7rem;
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
          font-size: 0.6rem;
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
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--white);
        }

        .orbital-card__macro-label {
          display: block;
          font-family: var(--font-body);
          font-size: 0.55rem;
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
          font-size: 0.7rem;
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

        @media (max-width: 640px) {
          .orbital-container {
            height: 360px;
          }

          .orbital-ring {
            width: 220px;
            height: 220px;
          }

          .orbital-node__card {
            width: 52px;
            height: 66px;
          }

          .orbital-node__name {
            font-size: 0.5rem;
          }

          .orbital-card {
            width: 180px;
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
}

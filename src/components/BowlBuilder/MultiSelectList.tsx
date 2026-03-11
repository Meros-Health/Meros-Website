import { motion, AnimatePresence } from 'framer-motion';
import type { Ingredient } from './ingredients';

interface MultiSelectListProps {
  ingredients: Ingredient[];
  selectedIngredients: Set<string>;
  onToggleIngredient: (ingredient: Ingredient) => void;
  stepNumber: number;
  stepLabel: string;
}

export default function MultiSelectList({
  ingredients,
  selectedIngredients,
  onToggleIngredient,
  stepNumber,
  stepLabel,
}: MultiSelectListProps) {
  return (
    <div className="msl">
      {/* Step header — mirrors orbital-center style */}
      <div className="msl__header">
        <span className="msl__step">{stepNumber}</span>
        <span className="msl__label">{stepLabel}</span>
        <p className="msl__hint">Select any that apply</p>
      </div>

      {/* Responsive grid */}
      <div className="msl__grid">
        {ingredients.map((ingredient) => {
          const isSelected = selectedIngredients.has(ingredient.id);
          return (
            <motion.button
              key={ingredient.id}
              className={`msl__item ${isSelected ? 'msl__item--selected' : ''}`}
              onClick={() => onToggleIngredient(ingredient)}
              whileTap={{ scale: 0.97 }}
              layout
            >
              <div className="msl__item-top">
                <span className="msl__item-name">{ingredient.name}</span>
                <AnimatePresence>
                  {isSelected && (
                    <motion.span
                      className="msl__item-check"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              {ingredient.micronutrient && (
                <span className="msl__item-micro">
                  {ingredient.micronutrient.name}: {ingredient.micronutrient.value}
                </span>
              )}
              <span className="msl__item-cal">{ingredient.calories} kcal</span>
            </motion.button>
          );
        })}
      </div>

      <style>{`
        .msl {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          overflow-y: auto;
          padding: 0.25rem 0.25rem 1rem;
          /* Hide scrollbar visually but keep it functional */
          scrollbar-width: thin;
          scrollbar-color: rgba(28, 46, 30, 0.15) transparent;
        }

        .msl::-webkit-scrollbar {
          width: 4px;
        }

        .msl::-webkit-scrollbar-track {
          background: transparent;
        }

        .msl::-webkit-scrollbar-thumb {
          background: rgba(28, 46, 30, 0.15);
          border-radius: 2px;
        }

        /* Step header */
        .msl__header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(28, 46, 30, 0.08);
          flex-shrink: 0;
        }

        .msl__step {
          width: clamp(32px, 5vw, 40px);
          height: clamp(32px, 5vw, 40px);
          border-radius: 50%;
          background: var(--forest);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-size: clamp(0.9rem, 2vw, 1.1rem);
          font-weight: 300;
          color: var(--white);
          flex-shrink: 0;
        }

        .msl__label {
          font-family: var(--font-display);
          font-size: clamp(0.9rem, 2vw, 1.1rem);
          font-weight: 400;
          color: var(--forest);
          letter-spacing: 0.05em;
        }

        .msl__hint {
          font-family: var(--font-body);
          font-size: clamp(0.6rem, 1.2vw, 0.7rem);
          color: var(--warm-grey);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0;
          margin-left: auto;
        }

        /* Responsive grid — auto-fill with minimum 150px columns */
        .msl__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(clamp(130px, 18%, 180px), 1fr));
          gap: 0.5rem;
        }

        /* Item card */
        .msl__item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem 0.875rem;
          background: rgba(242, 237, 230, 0.6);
          border: 1px solid rgba(28, 46, 30, 0.08);
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          font-family: inherit;
        }

        .msl__item:hover {
          background: rgba(242, 237, 230, 1);
          border-color: rgba(28, 46, 30, 0.18);
          box-shadow: 0 2px 8px rgba(28, 46, 30, 0.06);
        }

        .msl__item--selected {
          background: rgba(28, 46, 30, 0.05);
          border-color: var(--terracotta);
          box-shadow: 0 0 0 2px rgba(201, 106, 74, 0.18);
        }

        .msl__item--selected:hover {
          background: rgba(28, 46, 30, 0.08);
        }

        /* Item top row: name + check */
        .msl__item-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .msl__item-name {
          font-family: var(--font-body);
          font-size: clamp(0.65rem, 1.3vw, 0.78rem);
          font-weight: 500;
          color: var(--forest);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          line-height: 1.3;
        }

        .msl__item-check {
          flex-shrink: 0;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--terracotta);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--white);
        }

        .msl__item-micro {
          font-family: var(--font-body);
          font-size: clamp(0.5rem, 1vw, 0.6rem);
          color: var(--warm-grey);
          letter-spacing: 0.04em;
          line-height: 1.2;
        }

        .msl__item-cal {
          font-family: var(--font-body);
          font-size: clamp(0.5rem, 1vw, 0.6rem);
          color: rgba(28, 46, 30, 0.4);
          letter-spacing: 0.04em;
        }

        /* Narrow mobile: 2-column floor */
        @media (max-width: 420px) {
          .msl__grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .msl__hint {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

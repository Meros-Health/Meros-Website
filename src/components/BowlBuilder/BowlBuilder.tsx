import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CategoryTabs from './CategoryTabs';
import OrbitalSelect from './OrbitalSelect';
import MacroPanel from './MacroPanel';
import { categories, type Ingredient } from './ingredients';

export default function BowlBuilder() {
  const [activeCategory, setActiveCategory] = useState(categories[0].id);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  const activeIngredients = useMemo(() => {
    return categories.find((c) => c.id === activeCategory)?.ingredients || [];
  }, [activeCategory]);

  const totals = useMemo(() => {
    const allIngredients = categories.flatMap((c) => c.ingredients);
    return allIngredients
      .filter((i) => selectedIngredients.has(i.id))
      .reduce(
        (acc, i) => ({
          calories: acc.calories + i.calories,
          protein: acc.protein + i.protein,
          carbs: acc.carbs + i.carbs,
          fat: acc.fat + i.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
  }, [selectedIngredients]);

  const toggleIngredient = (ingredient: Ingredient) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ingredient.id)) {
        next.delete(ingredient.id);
      } else {
        next.add(ingredient.id);
      }
      return next;
    });
  };

  const handleSave = () => {
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2500);
  };

  return (
    <div className="bowl-builder">
      {/* Back to Home button - fixed bottom left */}
      <a href="/" className="bowl-builder__back">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8L10 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>Home</span>
      </a>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="bowl-builder__header"
      >
        <h1 className="bowl-builder__title">Build Your Bowl</h1>
        <p className="bowl-builder__subtitle">
          Select your ingredients and watch your nutrition come to life
        </p>
      </motion.div>

      {/* Main content */}
      <div className="bowl-builder__content">
        {/* Left: Ingredient selector */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          className="bowl-builder__selector"
        >
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bowl-builder__orbital"
            >
              <OrbitalSelect
                ingredients={activeIngredients}
                selectedIngredients={selectedIngredients}
                onToggleIngredient={toggleIngredient}
                stepNumber={categories.findIndex((c) => c.id === activeCategory) + 1}
                stepLabel={categories.find((c) => c.id === activeCategory)?.name || ''}
              />
            </motion.div>
          </AnimatePresence>

          {/* Selected ingredients summary */}
          {selectedIngredients.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bowl-builder__selected"
            >
              <span className="bowl-builder__selected-label">
                Selected ({selectedIngredients.size})
              </span>
              <div className="bowl-builder__selected-items">
                {categories.flatMap((c) =>
                  c.ingredients
                    .filter((i) => selectedIngredients.has(i.id))
                    .map((i) => (
                      <motion.span
                        key={i.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bowl-builder__selected-item"
                      >
                        {i.name}
                      </motion.span>
                    ))
                )}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Right: Macro panel (desktop only) */}
        <div className="bowl-builder__panel">
          <MacroPanel
            totals={totals}
            onSave={handleSave}
            hasSelection={selectedIngredients.size > 0}
          />
        </div>
      </div>

      {/* Mobile sticky panel - compact version */}
      <div className="bowl-builder__mobile-panel">
        <MacroPanel
          totals={totals}
          onSave={handleSave}
          hasSelection={selectedIngredients.size > 0}
          compact={true}
        />
      </div>

      {/* Save confirmation toast */}
      <AnimatePresence>
        {showSaveConfirmation && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="bowl-builder__toast"
          >
            Bowl saved successfully!
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .bowl-builder {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1.5rem 6rem;
          position: relative;
        }

        .bowl-builder__back {
          position: fixed;
          bottom: 1.5rem;
          left: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          font-family: var(--font-body);
          font-size: var(--text-xs);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--forest);
          background: rgba(250, 250, 247, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(28, 46, 30, 0.12);
          border-radius: 4px;
          text-decoration: none;
          z-index: 90;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        .bowl-builder__back:hover {
          background: rgba(250, 250, 247, 1);
          border-color: rgba(28, 46, 30, 0.2);
        }

        .bowl-builder__header {
          text-align: center;
          margin-bottom: 2.5rem;
          padding: 0 1rem;
        }

        .bowl-builder__title {
          font-family: var(--font-display);
          font-size: clamp(1.75rem, 5vw, 3.25rem);
          font-weight: 300;
          color: var(--forest);
          margin-bottom: 0.75rem;
          line-height: 1.1;
        }

        .bowl-builder__subtitle {
          font-family: var(--font-body);
          font-size: var(--text-sm);
          color: var(--warm-grey);
          letter-spacing: 0.1em;
          max-width: 400px;
          margin: 0 auto;
        }

        .bowl-builder__content {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 3rem;
          align-items: start;
        }

        .bowl-builder__selector {
          min-width: 0;
        }

        .bowl-builder__orbital {
          position: relative;
          width: 100%;
          min-height: 420px;
        }

        .bowl-builder__panel {
          position: sticky;
          top: 7rem;
        }

        .bowl-builder__mobile-panel {
          display: none;
        }

        .bowl-builder__selected {
          margin-top: 2rem;
          padding: 1rem;
          background-color: rgba(242, 237, 230, 0.5);
          border-radius: 8px;
        }

        .bowl-builder__selected-label {
          font-family: var(--font-body);
          font-size: var(--text-xs);
          color: var(--warm-grey);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .bowl-builder__selected-items {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .bowl-builder__selected-item {
          padding: 0.25rem 0.75rem;
          background-color: var(--white);
          border-radius: 4px;
          font-family: var(--font-body);
          font-size: var(--text-xs);
          color: var(--forest);
          border: 1px solid rgba(28, 46, 30, 0.1);
        }

        .bowl-builder__toast {
          position: fixed;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          padding: 1rem 2rem;
          background-color: var(--forest);
          color: var(--white);
          border-radius: 8px;
          font-family: var(--font-body);
          font-size: var(--text-sm);
          letter-spacing: 0.05em;
          box-shadow: 0 10px 40px rgba(28, 46, 30, 0.3);
          z-index: 1000;
        }

        @media (max-width: 1024px) {
          .bowl-builder__content {
            grid-template-columns: 1fr;
          }

          .bowl-builder__panel {
            display: none;
          }

          .bowl-builder__mobile-panel {
            display: block;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            border-top: 1px solid rgba(28, 46, 30, 0.08);
            z-index: 100;
          }

          .bowl-builder {
            padding-bottom: 100px;
          }

          .bowl-builder__back {
            bottom: auto;
            top: 5rem;
            left: 1rem;
          }

          .bowl-builder__toast {
            bottom: 80px;
          }
        }

        @media (max-width: 640px) {
          .bowl-builder {
            padding: 0 1rem 100px;
          }

          .bowl-builder__orbital {
            min-height: 340px;
          }

          .bowl-builder__header {
            margin-bottom: 1.5rem;
          }

          .bowl-builder__back {
            top: 4.5rem;
            left: 0.75rem;
            padding: 0.5rem 0.75rem;
            font-size: 0.625rem;
          }

          .bowl-builder__selected {
            margin-top: 1.5rem;
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}

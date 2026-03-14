import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CategoryTabs from './CategoryTabs';
import OrbitalSelect from './OrbitalSelect';
import MultiSelectList from './MultiSelectList';
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

  // Get the set of base ingredient IDs for single-selection enforcement
  const baseIds = useMemo(() => {
    const base = categories.find((c) => c.id === 'base');
    return new Set(base ? base.ingredients.map((i) => i.id) : []);
  }, []);

  const toggleIngredient = (ingredient: Ingredient) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ingredient.id)) {
        // Deselect
        next.delete(ingredient.id);
      } else {
        // If this is a base ingredient, remove any other selected base first
        if (baseIds.has(ingredient.id)) {
          for (const id of next) {
            if (baseIds.has(id)) {
              next.delete(id);
            }
          }
        }
        next.add(ingredient.id);
      }
      return next;
    });
  };

  const handleSave = () => {
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2500);
  };

  const handleHomeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Full page refresh to ensure clean state
    window.location.href = '/';
  };

  return (
    <div className="bowl-builder__page-wrap">
      {/* Home icon — viewport-anchored, outside max-width container */}
      <motion.a
        href="/"
        onClick={handleHomeClick}
        className="bowl-builder__home-icon"
        aria-label="Home"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 10.5L12 3l9 7.5" />
          <path d="M5 10v9a1 1 0 001 1h3v-5a1 1 0 011-1h4a1 1 0 011 1v5h3a1 1 0 001-1v-9" />
        </svg>
      </motion.a>

    <div className="bowl-builder">
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
              {categories.find((c) => c.id === activeCategory)?.selectionMode === 'list' ? (
                <MultiSelectList
                  ingredients={activeIngredients}
                  selectedIngredients={selectedIngredients}
                  onToggleIngredient={toggleIngredient}
                  stepNumber={categories.findIndex((c) => c.id === activeCategory) + 1}
                  stepLabel={categories.find((c) => c.id === activeCategory)?.name || ''}
                />
              ) : (
                <OrbitalSelect
                  ingredients={activeIngredients}
                  selectedIngredients={selectedIngredients}
                  onToggleIngredient={toggleIngredient}
                  stepNumber={categories.findIndex((c) => c.id === activeCategory) + 1}
                  stepLabel={categories.find((c) => c.id === activeCategory)?.name || ''}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Selected ingredients summary — below orbital, left of macro panel (desktop only) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bowl-builder__selected"
          >
            <span className="bowl-builder__selected-label">
              Selected {selectedIngredients.size > 0 ? `(${selectedIngredients.size})` : ''}
            </span>
            {selectedIngredients.size > 0 ? (
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
            ) : (
              <p className="bowl-builder__selected-empty">No selections.</p>
            )}
          </motion.div>
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

      </div>{/* end .bowl-builder */}

      <style>{`
        .bowl-builder__page-wrap {
          position: relative;
          width: 100%;
        }

        .bowl-builder {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 1.5rem 6rem;
          position: relative;
          overflow: clip;
        }

        .bowl-builder__header {
          margin-bottom: 2.5rem;
          padding: 0 1rem;
        }

        .bowl-builder__home-icon {
          position: absolute;
          top: 0;
          left: 1.5rem;
          z-index: 10;
          display: flex;
          align-items: center;
          color: var(--forest);
          text-decoration: none;
          transition: opacity 0.2s ease;
        }

        .bowl-builder__home-icon svg {
          width: 28px;
          height: 28px;
        }

        .bowl-builder__home-icon:hover {
          opacity: 0.6;
        }

        .bowl-builder__title {
          font-family: var(--font-display);
          font-size: clamp(1.75rem, 5vw, 3.25rem);
          font-weight: 300;
          color: var(--forest);
          margin-bottom: 0.75rem;
          line-height: 1.1;
          text-align: center;
        }

        .bowl-builder__subtitle {
          font-family: var(--font-body);
          font-size: var(--text-sm);
          color: var(--warm-grey);
          letter-spacing: 0.1em;
          max-width: 400px;
          margin: 0 auto;
          text-align: center;
        }

        @media (max-width: 642px) {
          .bowl-builder__home-icon {
            left: 1rem;
          }

          .bowl-builder__home-icon svg {
            width: 22px;
            height: 22px;
          }

          .bowl-builder__title {
            font-size: clamp(1.5rem, 5vw, 2rem);
            padding: 0 2.5rem;
          }

          .bowl-builder__subtitle {
            display: none;
          }
        }

        .bowl-builder__content {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 3rem;
          align-items: start;
        }

        .bowl-builder__selector {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .bowl-builder__orbital {
          position: relative;
          width: 100%;
          min-height: 500px;
          height: calc(100vh - 280px);
          max-height: 700px;
          flex: 1;
        }

        .bowl-builder__panel {
          position: sticky;
          top: 7rem;
        }

        .bowl-builder__mobile-panel {
          display: none;
        }

        .bowl-builder__selected {
          padding: 1rem 1.25rem;
          margin-top: 1rem;
          background-color: rgba(242, 237, 230, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 8px;
          border: 1px solid rgba(28, 46, 30, 0.06);
          box-shadow: 0 4px 20px rgba(28, 46, 30, 0.08);
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

        .bowl-builder__selected-empty {
          font-family: var(--font-body);
          font-size: var(--text-sm);
          color: var(--warm-grey);
          margin-top: 0.75rem;
          margin-bottom: 0;
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

          .bowl-builder__selected {
            display: none;
          }

          .bowl-builder__toast {
            bottom: 80px;
          }
        }

        @media (max-width: 642px) {
          .bowl-builder {
            padding: 0 1rem 100px;
          }

          .bowl-builder__orbital {
            min-height: 340px;
            height: calc(100vh - 260px);
            max-height: 500px;
          }

          .bowl-builder__header {
            margin-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

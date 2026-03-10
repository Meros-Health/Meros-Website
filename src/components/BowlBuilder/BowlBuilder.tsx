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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          textAlign: 'center',
          marginBottom: '3rem',
          padding: '0 1.5rem',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 300,
            color: 'var(--forest)',
            marginBottom: '0.75rem',
            lineHeight: 1.1,
          }}
        >
          Build Your Bowl
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            color: 'var(--warm-grey)',
            letterSpacing: '0.1em',
            maxWidth: '400px',
            margin: '0 auto',
          }}
        >
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
              style={{
                marginTop: '2rem',
                padding: '1rem',
                backgroundColor: 'rgba(242, 237, 230, 0.5)',
                borderRadius: '8px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--warm-grey)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                Selected ({selectedIngredients.size})
              </span>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginTop: '0.75rem',
                }}
              >
                {categories.flatMap((c) =>
                  c.ingredients
                    .filter((i) => selectedIngredients.has(i.id))
                    .map((i) => (
                      <motion.span
                        key={i.id}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: 'var(--white)',
                          borderRadius: '4px',
                          fontFamily: 'var(--font-body)',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--forest)',
                          border: '1px solid rgba(28, 46, 30, 0.1)',
                        }}
                      >
                        {i.name}
                      </motion.span>
                    ))
                )}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Right: Macro panel */}
        <div className="bowl-builder__panel">
          <MacroPanel
            totals={totals}
            onSave={handleSave}
            hasSelection={selectedIngredients.size > 0}
          />
        </div>
      </div>

      {/* Mobile sticky panel */}
      <div className="bowl-builder__mobile-panel">
        <MacroPanel
          totals={totals}
          onSave={handleSave}
          hasSelection={selectedIngredients.size > 0}
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
            style={{
              position: 'fixed',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '1rem 2rem',
              backgroundColor: 'var(--forest)',
              color: 'var(--white)',
              borderRadius: '8px',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              letterSpacing: '0.05em',
              boxShadow: '0 10px 40px rgba(28, 46, 30, 0.3)',
              zIndex: 1000,
            }}
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
            padding: 1rem;
            background: rgba(250, 250, 247, 0.95);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid rgba(28, 46, 30, 0.08);
            z-index: 100;
          }

          .bowl-builder {
            padding-bottom: 420px;
          }
        }

        @media (max-width: 640px) {
          .bowl-builder__orbital {
            min-height: 360px;
          }
        }
      `}</style>
    </div>
  );
}

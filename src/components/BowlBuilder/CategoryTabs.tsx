import { motion } from 'framer-motion';
import type { Category } from './ingredients';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        gap: '2rem',
        borderBottom: '1px solid rgba(28, 46, 30, 0.1)',
        marginBottom: '2rem',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {categories.map((category) => {
        const isActive = activeCategory === category.id;
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            style={{
              position: 'relative',
              padding: '0.75rem 0',
              fontFamily: 'var(--font-body)',
              fontSize: 'var(--text-sm)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: isActive ? 'var(--forest)' : 'var(--warm-grey)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'color 0.3s ease',
            }}
          >
            {category.name}
            {isActive && (
              <motion.div
                layoutId="tab-indicator"
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
                style={{
                  position: 'absolute',
                  bottom: '-1px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: 'var(--terracotta)',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

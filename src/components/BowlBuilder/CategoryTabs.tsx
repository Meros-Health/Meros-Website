import { useRef, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import type { Category } from './ingredients';

interface CategoryTabsProps {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

const ARROW_W = 36;
const GAP = 8;

export default function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [needsArrows, setNeedsArrows] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const overflows = el.scrollWidth > el.clientWidth + 4;
    setNeedsArrows(overflows);
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [updateArrows]);

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' });
  };

  const arrowStyle = (active: boolean): React.CSSProperties => ({
    flexShrink: 0,
    width: `${ARROW_W}px`,
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--terracotta)',
    border: 'none',
    borderRadius: '4px 4px 0 0',
    color: 'var(--white)',
    cursor: active ? 'pointer' : 'default',
    opacity: active ? 1 : 0.35,
    pointerEvents: active ? 'auto' : 'none',
    transition: 'opacity 0.2s ease',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: `${GAP}px`,
        marginBottom: '2rem',
      }}
    >
      {/* Left arrow */}
      {needsArrows && (
        <button
          aria-label="Scroll tabs left"
          onClick={() => scroll('left')}
          style={arrowStyle(canScrollLeft)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Scrollable tab strip */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          display: 'flex',
          gap: '2rem',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          borderBottom: '1px solid rgba(28, 46, 30, 0.1)',
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
                flexShrink: 0,
                transition: 'color 0.3s ease',
              }}
            >
              {category.name}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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

      {/* Right arrow */}
      {needsArrows && (
        <button
          aria-label="Scroll tabs right"
          onClick={() => scroll('right')}
          style={arrowStyle(canScrollRight)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}

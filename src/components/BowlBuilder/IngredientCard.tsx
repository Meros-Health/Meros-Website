import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Ingredient } from './ingredients';

interface IngredientCardProps {
  ingredient: Ingredient;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}

export default function IngredientCard({ ingredient, isSelected, onToggle, index }: IngredientCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: index * 0.05,
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="ingredient-card"
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        border: 'none',
        textAlign: 'center',
        overflow: 'hidden',
        background: 'rgba(242, 237, 230, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      {/* Selection indicator */}
      <motion.div
        initial={false}
        animate={{
          opacity: isSelected ? 1 : 0,
          scale: isSelected ? 1 : 0.8,
        }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '8px',
          border: '2px solid var(--terracotta)',
          pointerEvents: 'none',
        }}
      />

      {/* Selected background fill */}
      <motion.div
        initial={false}
        animate={{
          opacity: isSelected ? 0.08 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--terracotta)',
          borderRadius: '8px',
        }}
      />

      {/* Image container */}
      <motion.div
        animate={{
          boxShadow: isHovered
            ? '0 8px 30px rgba(28, 46, 30, 0.15)'
            : '0 2px 8px rgba(28, 46, 30, 0.08)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          overflow: 'hidden',
          marginBottom: '0.75rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <img
          src={ingredient.image}
          alt={ingredient.name}
          loading="lazy"
          width={80}
          height={80}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </motion.div>

      {/* Name */}
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-sm)',
          color: 'var(--forest)',
          fontWeight: 400,
          marginBottom: '0.25rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {ingredient.name}
      </span>

      {/* Calorie count */}
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'var(--text-xs)',
          color: 'var(--warm-grey)',
          letterSpacing: '0.05em',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {ingredient.calories} cal
      </span>

      {/* Expanded stats on hover */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{
          opacity: isHovered ? 1 : 0,
          height: isHovered ? 'auto' : 0,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          overflow: 'hidden',
          width: '100%',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            paddingTop: '0.75rem',
            marginTop: '0.5rem',
            borderTop: '1px solid rgba(28, 46, 30, 0.1)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.25rem 0.5rem',
          }}
        >
          <StatRow label="Protein" value={`${ingredient.protein}g`} />
          <StatRow label="Carbs" value={`${ingredient.carbs}g`} />
          <StatRow label="Fat" value={`${ingredient.fat}g`} />
          {ingredient.micronutrient && (
            <StatRow
              label={ingredient.micronutrient.name}
              value={ingredient.micronutrient.value}
              highlight
            />
          )}
        </div>
      </motion.div>

      {/* Selected checkmark */}
      <motion.div
        initial={false}
        animate={{
          scale: isSelected ? 1 : 0,
          opacity: isSelected ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          backgroundColor: 'var(--terracotta)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6L5 9L10 3"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
    </motion.button>
  );
}

function StatRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-body)',
        fontSize: '10px',
      }}
    >
      <span style={{ color: highlight ? 'var(--terracotta)' : 'var(--warm-grey)' }}>{label}</span>
      <span style={{ color: 'var(--forest)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
  onReset?: () => void;
  className?: string;
}

export function FilterBar({ children, onReset, className = '' }: FilterBarProps) {
  return (
    <div className={`bg-surface1 border border-border rounded-3xl p-4 sm:p-6 reveal-fade-delay-1 ${className}`}>
      <div className="flex flex-wrap items-end gap-4">
        {/* Filter Inputs */}
        <div className="flex-1 flex flex-wrap gap-4 min-w-0">
          {children}
        </div>

        {/* Reset Button */}
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-muted hover:text-gold border border-border hover:border-gold rounded-xl transition-all whitespace-nowrap"
          >
            Limpar Filtros
          </button>
        )}
      </div>
    </div>
  );
}

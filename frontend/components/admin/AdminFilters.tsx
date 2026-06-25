import React from 'react';

interface AdminFiltersProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Consistent carded container for the filter/search row on admin list pages.
 * Keeps each page's own input layout as `children` while giving every screen
 * the same surface, border and radius (matching the dashboard cards).
 */
export function AdminFilters({ children, className = '' }: AdminFiltersProps) {
  return (
    <div className={`rounded-2xl border border-border bg-surface1 p-3 ${className}`}>
      {children}
    </div>
  );
}

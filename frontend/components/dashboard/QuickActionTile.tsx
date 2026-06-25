'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

interface QuickActionTileProps {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  color?: 'gold' | 'green' | 'neutral';
  prefetch?: boolean;
}

const colorClasses = {
  gold: 'from-gold/15 to-transparent text-gold hover:shadow-gold/20',
  green: 'from-green/15 to-transparent text-green hover:shadow-green/20',
  neutral: 'from-white/[0.06] to-transparent text-text hover:shadow-black/20',
};

export function QuickActionTile({
  title,
  description,
  icon,
  href,
  color = 'gold',
  prefetch = true,
}: QuickActionTileProps) {
  return (
    <Link href={href} prefetch={prefetch}>
      <div
        className={`
          group relative overflow-hidden rounded-xl border border-border
          bg-gradient-to-br ${colorClasses[color]}
          p-6 transition-all duration-300
          hover:-translate-y-1 hover:shadow-lg
        `}
      >
        {/* Icon */}
        <div className="mb-4">
          <div className="inline-flex rounded-lg bg-surface1/50 p-3">
            {icon}
          </div>
        </div>

        {/* Content */}
        <div>
          <h4 className="mb-1 font-bold text-text">{title}</h4>
          <p className="text-xs text-muted">{description}</p>
        </div>

        {/* Arrow indicator */}
        <div className="absolute bottom-4 right-4 opacity-0 transition-opacity group-hover:opacity-100">
          <svg
            className="h-5 w-5 text-current"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}

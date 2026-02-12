import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  breadcrumbs,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`space-y-4 reveal-fade ${className}`}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-muted hover:text-gold transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-text font-medium">{crumb.label}</span>
              )}
              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted" />
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          {icon && (
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30 flex items-center justify-center text-gold">
              {icon}
            </div>
          )}

          {/* Title & Subtitle */}
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              <span className="gradient-text">{title}</span>
            </h1>
            {subtitle && <p className="text-muted text-base">{subtitle}</p>}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex-shrink-0 flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { ChangeEvent } from 'react';
import { Input } from '@/components/shared/ui/Input';
import { useAuthFieldTheme } from '@/components/auth/fieldTheme';

interface AuthTextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  /** Usado apenas no tema escuro (delegado ao Input). */
  leftIcon?: React.ReactNode;
}

export const lightFieldClasses =
  'w-full h-11 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold ' +
  'disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 px-3.5';

export const lightLabelClasses = 'block text-sm font-medium text-slate-700 mb-1.5';
export const lightErrorClasses = 'mt-1 text-xs text-red-600';

export function AuthTextField({
  label,
  value,
  onChange,
  error,
  required = false,
  leftIcon,
  className = '',
  id,
  ...props
}: AuthTextFieldProps) {
  const theme = useAuthFieldTheme();
  const reactId = React.useId();

  if (theme === 'dark') {
    return (
      <Input
        label={label}
        value={value}
        onChange={onChange}
        error={error}
        required={required}
        leftIcon={leftIcon}
        className={className}
        id={id}
        {...props}
      />
    );
  }

  const inputId = id ?? `authfield-${reactId}`;
  const errorId = `${inputId}-error`;
  const hasError = !!error;

  return (
    <div className="w-full">
      <label htmlFor={inputId} className={lightLabelClasses}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={inputId}
        value={value}
        onChange={onChange}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`${lightFieldClasses} ${hasError ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && <p id={errorId} className={lightErrorClasses}>{error}</p>}
    </div>
  );
}

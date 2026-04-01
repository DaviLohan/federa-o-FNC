import React, { ChangeEvent } from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export function Input({
  label,
  value,
  onChange,
  error,
  required = false,
  className = '',
  leftIcon,
  rightElement,
  ...props
}: InputProps) {
  const hasError = !!error;
  
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-text mb-2">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted2 pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          value={value}
          onChange={onChange}
          required={required}
          className={`
            w-full h-11 rounded-2xl
            bg-panel2 border border-stroke
            text-text placeholder-muted2
            focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200
            ${leftIcon ? 'pl-10' : 'pl-4'}
            ${rightElement ? 'pr-10' : 'pr-4'}
            ${hasError ? 'border-error focus:ring-error' : ''}
            ${className}
          `}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
}

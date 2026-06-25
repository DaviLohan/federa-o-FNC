'use client';

import React from 'react';
import { DatePickerInput } from '@/components/shared/ui/DatePickerInput';
import { useAuthFieldTheme } from '@/components/auth/fieldTheme';
import { lightFieldClasses, lightLabelClasses, lightErrorClasses } from './AuthTextField';

interface AuthDateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
  min?: string;
  error?: string;
  required?: boolean;
}

export function AuthDateField({
  label,
  value,
  onChange,
  max,
  min,
  error,
  required = false,
}: AuthDateFieldProps) {
  const theme = useAuthFieldTheme();
  const reactId = React.useId();

  if (theme === 'dark') {
    return (
      <DatePickerInput
        label={label}
        value={value}
        onChange={onChange}
        max={max}
        min={min}
        required={required}
      />
    );
  }

  const inputId = `authdate-${reactId}`;
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
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={max}
        min={min}
        required={required}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? errorId : undefined}
        className={`${lightFieldClasses} ${hasError ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : ''}`}
      />
      {error && <p id={errorId} className={lightErrorClasses}>{error}</p>}
    </div>
  );
}

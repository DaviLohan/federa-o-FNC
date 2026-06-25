'use client';

import React, { ChangeEvent } from 'react';
import { Select } from '@/components/shared/ui/Select';
import { useAuthFieldTheme } from '@/components/auth/fieldTheme';
import { lightLabelClasses, lightErrorClasses } from './AuthTextField';

interface Option {
  value: string;
  label: string;
}

interface AuthSelectFieldProps {
  label: string;
  name?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: Option[];
  error?: string;
  required?: boolean;
}

export function AuthSelectField({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
}: AuthSelectFieldProps) {
  const theme = useAuthFieldTheme();
  const reactId = React.useId();

  if (theme === 'dark') {
    return (
      <Select
        label={label}
        name={name}
        value={value}
        onChange={onChange}
        options={options}
        error={error}
        required={required}
      />
    );
  }

  const selectId = `authselect-${reactId}`;

  return (
    <div className="w-full">
      <label htmlFor={selectId} className={lightLabelClasses}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full h-11 rounded-lg bg-white border border-slate-300 text-slate-900 px-3.5 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-colors duration-200"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className={lightErrorClasses}>{error}</p>}
    </div>
  );
}

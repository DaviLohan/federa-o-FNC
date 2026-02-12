import React, { ChangeEvent } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  error?: string;
  required?: boolean;
}

export function Select({
  label,
  value,
  onChange,
  options,
  error,
  required = false,
  className = '',
  ...props
}: SelectProps) {
  const hasError = !!error;
  
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-text mb-2">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      <select
        value={value}
        onChange={onChange}
        required={required}
        className={`
          w-full h-11 px-4 rounded-2xl
          bg-panel2 border border-stroke
          text-text
          focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${hasError ? 'border-error focus:ring-error' : ''}
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-panel2 text-text">
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
}

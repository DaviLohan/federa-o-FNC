'use client';

import React, { ChangeEvent, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { useAuthFieldTheme } from '@/components/auth/fieldTheme';
import { lightFieldClasses, lightLabelClasses, lightErrorClasses } from './AuthTextField';

interface AuthPasswordFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
}

export function AuthPasswordField({
  label,
  value,
  onChange,
  error,
  required = false,
  className = '',
  id,
  ...props
}: AuthPasswordFieldProps) {
  const theme = useAuthFieldTheme();
  const reactId = React.useId();
  const [show, setShow] = useState(false);

  if (theme === 'dark') {
    return (
      <PasswordInput
        label={label}
        value={value}
        onChange={onChange}
        error={error}
        required={required}
        id={id}
        {...props}
      />
    );
  }

  const inputId = id ?? `authpwd-${reactId}`;
  const errorId = `${inputId}-error`;
  const hasError = !!error;

  return (
    <div className="w-full">
      <label htmlFor={inputId} className={lightLabelClasses}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? errorId : undefined}
          className={`${lightFieldClasses} pr-10 ${hasError ? 'border-red-400 focus:ring-red-200 focus:border-red-400' : ''} ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p id={errorId} className={lightErrorClasses}>{error}</p>}
    </div>
  );
}

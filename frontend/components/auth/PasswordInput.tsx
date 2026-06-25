'use client';

import React, { ChangeEvent, useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Input } from '@/components/shared/ui/Input';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  /** Ícone à esquerda. Default: cadeado. Passe `null` para remover. */
  leftIcon?: React.ReactNode;
}

/**
 * Campo de senha com botão mostrar/ocultar integrado.
 * Centraliza o padrão que estava duplicado em login, cadastro e reset de senha.
 */
export function PasswordInput({
  label,
  value,
  onChange,
  error,
  required = false,
  leftIcon = <Lock size={16} />,
  ...props
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <Input
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      error={error}
      required={required}
      leftIcon={leftIcon ?? undefined}
      rightElement={
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="text-muted2 hover:text-muted transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      }
      {...props}
    />
  );
}

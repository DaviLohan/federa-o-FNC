import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-semibold rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center';
  
  const variantStyles = {
    primary: 'relative overflow-hidden bg-gold hover:bg-gold2 active:bg-gold3 shadow-lg shadow-gold/25 text-black before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
    secondary: 'border-2 border-gold text-gold hover:bg-gold/10 hover:shadow-lg hover:shadow-gold/30',
    ghost: 'relative text-gold hover:text-gold2 group'
  };
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm h-9',
    md: 'px-6 py-3 text-base h-11',
    lg: 'px-8 py-4 text-lg h-14'
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {variant === 'primary' && !loading && (
        <span className="absolute inset-0 opacity-40 animate-glow bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.15),transparent_55%)]" />
      )}
      <span className="relative z-10 inline-flex items-center gap-2 whitespace-nowrap">
        {loading && <Loader2 className="animate-spin w-4 h-4" />}
        {children}
      </span>
      {variant === 'ghost' && !loading && (
        <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gold group-hover:w-full transition-all duration-300" />
      )}
    </button>
  );
}

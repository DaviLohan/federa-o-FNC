'use client';

import { createContext, useContext, ReactNode } from 'react';

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

interface TabsPremiumProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function TabsPremium({ value, onChange, children, className = '' }: TabsPremiumProps) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={`relative ${className}`}>
        {/* Background with subtle gradient */}
        <div className="absolute inset-0 bg-surface2/30 rounded-2xl backdrop-blur-sm" />
        
        {/* Tabs Container */}
        <div className="relative flex gap-2 p-2 overflow-x-auto scrollbar-hide">
          {children}
        </div>
      </div>
    </TabsContext.Provider>
  );
}

interface TabPremiumProps {
  value: string;
  label: string;
  badge?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

export function TabPremium({ value: tabValue, label, badge, icon, disabled = false }: TabPremiumProps) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabPremium must be used within TabsPremium');
  }
  
  const { value, onChange } = context;
  const isActive = value === tabValue;
  
  return (
    <button
      onClick={() => !disabled && onChange(tabValue)}
      disabled={disabled}
      className={`
        relative px-4 sm:px-6 py-3 rounded-xl font-heading font-semibold transition-all 
        whitespace-nowrap flex items-center gap-2 group
        ${isActive 
          ? 'bg-gradient-to-r from-gold/20 via-gold/20 to-gold2/20 text-text border-2 border-gold/40 shadow-[0_0_20px_rgba(20,204,221,0.2)]' 
          : 'text-muted hover:text-text hover:bg-surface2/50 border-2 border-transparent'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Icon */}
      {icon && (
        <span className={`
          text-lg transition-transform group-hover:scale-110
          ${isActive ? 'text-gold' : 'text-muted'}
        `}>
          {icon}
        </span>
      )}
      
      {/* Label */}
      <span className={isActive ? 'gradient-text' : ''}>{label}</span>
      
      {/* Badge */}
      {badge !== undefined && badge > 0 && (
        <span className={`
          ml-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold
          ${isActive 
            ? 'bg-gradient-to-r from-gold to-gold3 text-[#05060A]' 
            : 'bg-surface2 text-muted border border-border'
          }
        `}>
          {badge}
        </span>
      )}
      
      {/* Active Indicator Dot */}
      {isActive && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-gold"></span>
        </span>
      )}
    </button>
  );
}

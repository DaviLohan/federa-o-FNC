'use client';

import { createContext, useContext, ReactNode } from 'react';

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div className={`border-b border-stroke ${className}`}>
        <div className="flex gap-1 overflow-x-auto pb-px scrollbar-hide">
          {children}
        </div>
      </div>
    </TabsContext.Provider>
  );
}

interface TabProps {
  value: string;
  label: string;
  badge?: number;
  icon?: ReactNode;
  disabled?: boolean;
}

export function Tab({ value: tabValue, label, badge, icon, disabled = false }: TabProps) {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('Tab must be used within Tabs');
  }
  
  const { value, onChange } = context;
  const isActive = value === tabValue;
  
  return (
    <button
      onClick={() => !disabled && onChange(tabValue)}
      disabled={disabled}
      className={`
        relative px-4 sm:px-6 py-3 font-medium transition-all whitespace-nowrap flex items-center gap-2
        ${isActive 
          ? 'text-brand border-b-2 border-brand bg-brand/5' 
          : 'text-muted2 hover:text-text hover:bg-panel2/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {icon && <span className="text-lg">{icon}</span>}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`
          ml-1 px-2 py-0.5 rounded-full text-xs font-bold
          ${isActive ? 'bg-brand text-white' : 'bg-panel2 text-muted2'}
        `}>
          {badge}
        </span>
      )}
    </button>
  );
}

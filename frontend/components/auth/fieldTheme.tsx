'use client';

import { createContext, useContext } from 'react';

export type AuthFieldTheme = 'dark' | 'light';

const AuthFieldThemeContext = createContext<AuthFieldTheme>('dark');

/**
 * Define o tema dos campos de auth para a subárvore.
 * Telas de login/cadastro usam `light`; a landing (FinalCTA) não envolve,
 * então herda o default `dark` — mantendo o visual atual lá.
 */
export function AuthFieldThemeProvider({
  value,
  children,
}: {
  value: AuthFieldTheme;
  children: React.ReactNode;
}) {
  return <AuthFieldThemeContext.Provider value={value}>{children}</AuthFieldThemeContext.Provider>;
}

export function useAuthFieldTheme(): AuthFieldTheme {
  return useContext(AuthFieldThemeContext);
}

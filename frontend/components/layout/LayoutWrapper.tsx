'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

// Public pages that should NOT have sidebar/topbar
const PUBLIC_PAGES = ['/', '/login', '/register'];

/**
 * Subscreve ao evento de hidratação do Zustand persist.
 * Retorna `true` assim que o persist terminar de reidratar do localStorage.
 * Evita o spinner de tela cheia que bloqueava toda navegação.
 */
function useIsHydrated(): boolean {
  return useSyncExternalStore(
    useCallback((onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange), []),
    () => useAuthStore.persist.hasHydrated(),
    () => false, // server snapshot — SSR sempre renderiza como não-hidratado
  );
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHydrated = useIsHydrated();
  const user = useAuthStore((state) => state.user);

  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  // Páginas públicas nunca precisam esperar hidratação
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Para páginas autenticadas: enquanto hidrata, renderiza sem layout
  // (o useRequireAuth dentro de cada page fará redirect se necessário)
  if (!isHydrated || !user) {
    return <>{children}</>;
  }

  // Usuário autenticado + hidratado → layout completo
  return (
    <>
      <Sidebar />
      <div className="lg:ml-64">
        <Topbar />
        <main className="p-4 lg:p-8 min-h-[calc(100vh-4rem)] bg-bg1">
          {children}
        </main>
      </div>
    </>
  );
}

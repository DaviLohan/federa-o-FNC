'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { usersAPI } from '@/lib/api';
import { Navbar } from './Navbar';

// Public pages that should NOT have navbar
const PUBLIC_PAGES = ['/', '/home', '/login', '/register'];

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
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);

  const isPublicPage = PUBLIC_PAGES.includes(pathname);

  const currentUserQuery = useQuery({
    queryKey: ['current-user'],
    queryFn: () => usersAPI.getMe(),
    enabled: isHydrated && !!token && !isPublicPage,
    staleTime: 30000,
    retry: false,
  });

  useEffect(() => {
    if (!currentUserQuery.data) return;

    const nextUser = currentUserQuery.data;
    const currentPlayerProfileId = user?.player_profile?.id ?? null;
    const nextPlayerProfileId = nextUser.player_profile?.id ?? null;
    const currentOwnerProfileId = user?.team_owner_profile?.id ?? null;
    const nextOwnerProfileId = nextUser.team_owner_profile?.id ?? null;

    if (
      !user ||
      user.id !== nextUser.id ||
      user.user_type !== nextUser.user_type ||
      user.full_name !== nextUser.full_name ||
      currentPlayerProfileId !== nextPlayerProfileId ||
      currentOwnerProfileId !== nextOwnerProfileId
    ) {
      setUser(nextUser);
    }
  }, [currentUserQuery.data, setUser, user]);

  // Páginas públicas nunca precisam esperar hidratação
  if (isPublicPage) {
    return <>{children}</>;
  }

  // Para páginas autenticadas: enquanto hidrata, renderiza sem layout
  // (o useRequireAuth dentro de cada page fará redirect se necessário)
  if (!isHydrated || !user) {
    return <>{children}</>;
  }

  // Usuário autenticado + hidratado → layout completo com navbar horizontal
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-bg1 pt-16">
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </>
  );
}

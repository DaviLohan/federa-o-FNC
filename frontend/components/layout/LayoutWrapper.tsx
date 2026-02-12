'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  // Aguardar hidratação do Zustand do localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Public pages that should NOT have sidebar/topbar
  const publicPages = ['/', '/login', '/register'];
  const isPublicPage = publicPages.includes(pathname);

  // Mostrar loading durante hidratação para evitar flash de conteúdo
  // IMPORTANT: This conditional return is AFTER all hooks to avoid hooks rule violation
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted text-sm">Carregando...</p>
        </div>
      </div>
    );
  }
  
  // If it's a public page or user is not logged in, just render children
  if (isPublicPage || !user) {
    return <>{children}</>;
  }
  
  // Authenticated pages with layout
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

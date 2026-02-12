'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useRequireAuth();
  const user = useAuthStore((state) => state.user);
  const { canManageChampionships } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (user && !canManageChampionships) {
      router.push('/dashboard');
    }
  }, [user, canManageChampionships, router]);

  if (!user || !canManageChampionships) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto mb-4 h-16 w-16 text-muted" />
          <p className="text-lg text-muted">Acesso restrito a administradores</p>
        </div>
      </div>
    );
  }

  return <div className="space-y-6">{children}</div>;
}

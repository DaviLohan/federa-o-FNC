'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield } from 'lucide-react';
import { AdminTabs } from '@/components/admin/AdminTabs';

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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface2 border border-border">
            <Shield className="h-10 w-10 text-muted" />
          </div>
          <p className="text-lg font-semibold text-text">Acesso Restrito</p>
          <p className="mt-1 text-sm text-muted">Apenas administradores podem acessar esta área.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-6 lg:-m-8">
      {/* Admin sub-navigation — sits right below the main navbar */}
      <AdminTabs />
      <div className="p-4 md:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import {
  AuthSplitLayout,
  AuthBrandingPanel,
  AuthFieldThemeProvider,
  LoginForm,
} from '@/components/auth';

export default function LoginPage() {
  return (
    <AuthSplitLayout branding={<AuthBrandingPanel title="Bem-vindo de volta!" />}>
      <AuthFieldThemeProvider value="dark">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Login</h1>
          <p className="mt-1 text-sm text-muted">Acesse sua conta para continuar.</p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-muted">
          Não tem uma conta?{' '}
          <Link href="/register" className="font-semibold text-gold hover:text-gold2 transition-colors">
            Criar conta
          </Link>
        </p>
      </AuthFieldThemeProvider>
    </AuthSplitLayout>
  );
}

'use client';

import Link from 'next/link';
import {
  AuthSplitLayout,
  AuthBrandingPanel,
  AuthFieldThemeProvider,
  RegisterForm,
} from '@/components/auth';

export default function RegisterPage() {
  return (
    <AuthSplitLayout
      branding={
        <AuthBrandingPanel
          title="Crie sua conta"
          subtitle="Monte seu perfil Pro Clubs e participe dos campeonatos da federação."
        />
      }
    >
      <AuthFieldThemeProvider value="dark">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Criar conta</h1>
          <p className="mt-1 text-sm text-muted">Preencha os dados abaixo para começar.</p>
        </div>

        <RegisterForm />

        <p className="mt-6 text-center text-sm text-muted">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-semibold text-gold hover:text-gold2 transition-colors">
            Entrar
          </Link>
        </p>
      </AuthFieldThemeProvider>
    </AuthSplitLayout>
  );
}

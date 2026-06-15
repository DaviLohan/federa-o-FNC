'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuthLayout, RegisterMarketingPanel, RegisterForm } from '@/components/auth';

export default function RegisterPage() {
  return (
    <AuthLayout marketingPanel={<RegisterMarketingPanel />}>
      {/* Mobile Logo (apenas mobile) */}
      <div className="lg:hidden mb-8 text-center animate-reveal">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <img
            src="/branding/pro-eleven-brand-v2.png"
            alt="Pro Eleven Logo"
            className="h-auto w-[190px] transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </Link>
      </div>

      {/* Form Card Premium */}
      <div className="form-card-premium p-6 sm:p-8 animate-reveal">
        <RegisterForm />
      </div>

      {/* Footer Links */}
      <div className="mt-8 text-center space-y-3 animate-reveal">
        <p className="text-muted">
          Já tem uma conta?{' '}
          <Link href="/login" className="text-gold hover:text-gold/80 font-semibold transition-colors">
            Faça login
          </Link>
        </p>
        <Link href="/" className="text-muted hover:text-text text-sm inline-flex items-center gap-1 transition-colors group">
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
          Voltar para home
        </Link>
      </div>
    </AuthLayout>
  );
}

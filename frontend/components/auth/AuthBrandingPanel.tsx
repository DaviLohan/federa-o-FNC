import { BrandLockup } from '@/components/branding/BrandLockup';

const APP_VERSION = 'v1.0.0';

interface AuthBrandingPanelProps {
  title?: string;
  subtitle?: string;
}

/**
 * Painel institucional (lado esquerdo do split de auth).
 * Fundo grafite/carbono com formas abstratas (blobs) nas cores da federação
 * — dourado + grafite —, logo no topo, mensagem de boas-vindas e versão.
 */
export function AuthBrandingPanel({
  title = 'Bem-vindo de volta!',
  subtitle = 'Gestão centralizada da sua federação Pro Clubs — com acesso seguro e ambiente organizado.',
}: AuthBrandingPanelProps) {
  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-bg p-10 xl:p-12">
      {/* Blobs abstratos (dourado + grafite) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-gold/15 blur-3xl animate-floaty motion-reduce:animate-none" />
        <div
          className="absolute top-1/3 -right-24 h-96 w-96 rounded-full bg-gold/10 blur-3xl animate-floaty motion-reduce:animate-none"
          style={{ animationDelay: '1.5s' }}
        />
        <div className="absolute -bottom-28 left-1/4 h-80 w-80 rounded-full bg-white/[0.04] blur-3xl" />
        {/* leve gradiente grafite p/ profundidade */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/40" />
      </div>

      {/* Logo (topo) */}
      <div className="relative z-10">
        <BrandLockup variant="navbar" href="/" />
      </div>

      {/* Mensagem de boas-vindas (centro/esquerda) */}
      <div className="relative z-10 max-w-md">
        <h2 className="text-4xl font-bold leading-tight text-white xl:text-5xl">{title}</h2>
        <p className="mt-4 text-sm leading-relaxed text-white/60">{subtitle}</p>
      </div>

      {/* Versão (rodapé) */}
      <div className="relative z-10">
        <span className="text-xs font-medium tracking-wide text-white/40">{APP_VERSION}</span>
      </div>
    </div>
  );
}

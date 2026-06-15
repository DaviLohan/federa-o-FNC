'use client';

import Link from 'next/link';
import Image from 'next/image';

type BrandVariant = 'navbar' | 'auth' | 'hero';

interface BrandLockupProps {
  variant?: BrandVariant;
  href?: string;
  showSubtitle?: boolean;
  className?: string;
}

const variantClasses: Record<BrandVariant, {
  wrapper: string;
  width: number;
  height: number;
  logoClass: string;
}> = {
  navbar: {
    wrapper: '',
    width: 176,
    height: 48,
    logoClass: 'h-auto w-[176px] transition-transform duration-200 group-hover:scale-[1.02]',
  },
  auth: {
    wrapper: '',
    width: 360,
    height: 160,
    logoClass: 'h-auto w-[260px] md:w-[320px] transition-transform duration-200 group-hover:scale-[1.01]',
  },
  hero: {
    wrapper: '',
    width: 420,
    height: 180,
    logoClass: 'h-auto w-[320px] lg:w-[380px] transition-transform duration-200 group-hover:scale-[1.01]',
  },
};

function BrandContent({ variant, showSubtitle = true }: { variant: BrandVariant; showSubtitle?: boolean }) {
  const styles = variantClasses[variant];

  return (
    <div className="flex flex-col items-start">
      <Image
        src="/branding/pro-eleven-brand-v2.png"
        alt="Pro Eleven Logo"
        width={styles.width}
        height={styles.height}
        className={styles.logoClass}
        priority={variant !== 'navbar'}
      />
      {showSubtitle && variant !== 'navbar' && (
        <div className="mt-2 text-[11px] uppercase tracking-[0.28em] text-muted">
          Elite Football Federation
        </div>
      )}
    </div>
  );
}

export function BrandLockup({
  variant = 'navbar',
  href,
  showSubtitle = true,
  className = '',
}: BrandLockupProps) {
  const styles = variantClasses[variant];
  const content = <BrandContent variant={variant} showSubtitle={showSubtitle} />;

  if (href) {
    return (
      <Link href={href} className={`group inline-flex items-center ${styles.wrapper} ${className}`.trim()}>
        {content}
      </Link>
    );
  }

  return <div className={`inline-flex items-center ${styles.wrapper} ${className}`.trim()}>{content}</div>;
}

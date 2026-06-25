'use client';

import Link from 'next/link';
import Image from 'next/image';
import { BRAND_LOGO, BRAND_LOGO_WIDTH, BRAND_LOGO_HEIGHT, BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

type BrandVariant = 'navbar' | 'auth' | 'hero';

interface BrandLockupProps {
  variant?: BrandVariant;
  href?: string;
  showSubtitle?: boolean;
  className?: string;
}

const variantClasses: Record<BrandVariant, {
  wrapper: string;
  logoClass: string;
}> = {
  // Logo ~2:1 — na navbar (h-16) constrangemos pela altura p/ não estourar.
  navbar: {
    wrapper: '',
    logoClass: 'h-12 w-auto transition-transform duration-200 group-hover:scale-[1.02]',
  },
  auth: {
    wrapper: '',
    logoClass: 'h-auto w-[220px] md:w-[260px] transition-transform duration-200 group-hover:scale-[1.01]',
  },
  hero: {
    wrapper: '',
    logoClass: 'h-auto w-[300px] lg:w-[340px] transition-transform duration-200 group-hover:scale-[1.01]',
  },
};

function BrandContent({ variant, showSubtitle = true }: { variant: BrandVariant; showSubtitle?: boolean }) {
  const styles = variantClasses[variant];

  return (
    <div className="flex flex-col items-start">
      <Image
        src={BRAND_LOGO}
        alt={`${BRAND_NAME} Logo`}
        width={BRAND_LOGO_WIDTH}
        height={BRAND_LOGO_HEIGHT}
        className={styles.logoClass}
        priority={variant !== 'navbar'}
      />
      {showSubtitle && variant !== 'navbar' && (
        <div className="mt-2 text-[11px] uppercase tracking-[0.28em] text-muted">
          {BRAND_TAGLINE}
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

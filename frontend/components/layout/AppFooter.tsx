'use client';

import Image from 'next/image';

const APP_VERSION = 'v1.0.0';

export function AppFooter() {
  return (
    <footer className="relative mt-16 border-t border-white/5 bg-[rgba(11,15,22,0.82)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(214,161,30,0.35)] to-transparent" />

      <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center gap-3 rounded-[18px] border border-white/5 bg-[rgba(16,24,40,0.55)] px-3 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.22)] lg:px-3.5">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(180deg,rgba(13,20,34,0.96),rgba(7,9,13,0.96))] shadow-[0_0_18px_rgba(47,99,255,0.12)]">
            <Image
              src="/logo-davi-lohan-dev.svg"
              alt="Davi Lohan mark"
              fill
              className="object-cover"
            />
          </div>

          <div className="min-w-0">
            <p className="text-[14px] font-semibold tracking-[0.03em] text-[rgba(255,255,255,0.92)] leading-none">
              Davi Lohan
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.24em] text-[rgba(255,255,255,0.45)]">
              Software Engineer
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-[18px] border border-[rgba(214,161,30,0.14)] bg-[linear-gradient(180deg,rgba(16,24,40,0.62),rgba(13,20,34,0.52))] px-3 py-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.20)] lg:px-3.5">
          <Image
            src="/branding/pro-eleven-brand-v2.png"
            alt="Pro Eleven official logo"
            width={260}
            height={100}
            className="h-auto w-[180px] object-contain lg:w-[220px]"
          />

          <div className="ml-1 flex flex-col items-end gap-1">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.45)]">
              Federacao
            </p>
            <p className="text-[12px] font-medium tracking-[0.05em] text-[rgba(255,255,255,0.45)]">
              {APP_VERSION}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

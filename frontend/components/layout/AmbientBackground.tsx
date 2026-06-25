/**
 * Decorative ambient background for the authenticated app shell.
 *
 * Adds depth to the otherwise flat carbon background — a soft top gold glow,
 * a masked subtle grid, and slowly floating blurred gold orbs — while keeping
 * content fully legible. Fixed (does not scroll), non-interactive, and respects
 * `prefers-reduced-motion`. Reuses the gold-alpha vocabulary and `animate-floaty`
 * keyframe already used across the landing (Hero) and auth panels.
 */
export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* 1. Base lift — top gold radial glow (stronger than the body's 0.06) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(214,161,30,0.10),transparent_60%)]" />

      {/* 2. Subtle masked grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(214,161,30,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(214,161,30,0.04)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,black,transparent)]" />

      {/* 3. Floating gold orbs (stop animating under reduced-motion) */}
      <div className="absolute -top-20 left-[8%] h-72 w-72 rounded-full bg-gold/[0.06] blur-[100px] animate-floaty motion-reduce:animate-none" />
      <div
        className="absolute top-1/3 right-[6%] h-80 w-80 rounded-full bg-gold/[0.05] blur-[120px] animate-floaty motion-reduce:animate-none"
        style={{ animationDelay: '1.5s' }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-gold/[0.04] blur-[110px] animate-floaty motion-reduce:animate-none"
        style={{ animationDelay: '3s' }}
      />

      {/* 4. Edge vignette — keeps focus toward the center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,#07090D_100%)]" />
    </div>
  );
}

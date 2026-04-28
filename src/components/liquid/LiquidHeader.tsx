'use client';

/**
 * LiquidHeader — top bar for the liquid UI path. Verbatim port of the 3002
 * Header (`code/sales-ai-liquid/src/components/layout/Header.tsx`): 54px tall,
 * white-glass background (`liquid-header` class), FANGO wordmark in gradient
 * SF Pro Display.
 */
export default function LiquidHeader() {
  return (
    <header className="liquid-header flex items-center px-6 h-[54px] border-b border-slate-900/[0.06] shrink-0">
      <span
        className="text-[18px] font-black tracking-[-0.03em]"
        style={{
          fontFamily:
            "'SF Pro Display', 'Helvetica Neue', 'Inter', -apple-system, sans-serif",
          background:
            'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0a3d82 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        FANGO
      </span>
    </header>
  );
}

'use client';

import { useEffect, useState } from 'react';

export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Clamp offsetTop to zero: iOS Safari under pinch-zoom can return a
      // negative value which would otherwise inflate the inset and push the
      // composer off-screen.
      const top = Math.max(0, vv.offsetTop);
      const next = Math.max(0, window.innerHeight - vv.height - top);
      setInset(next);
    };

    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    // Older Android Chrome occasionally drops visualViewport events on
    // orientation change; a window-level resize fallback catches those.
    window.addEventListener('resize', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return inset;
}

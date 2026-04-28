'use client';

import { useEffect, useState } from 'react';

// True on touch-primary devices (iOS / Android). Used to avoid treating the
// soft-keyboard Return key as a send command — on mobile, Return should insert
// a newline and sending is driven by the dedicated send button.
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(pointer: coarse)');
    const update = () => setCoarse(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return coarse;
}

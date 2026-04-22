import type { ObikaeVacancyInput } from '@/components/ObikaeLauncher';

export const OBIKAE_BASE_URL =
  process.env.NEXT_PUBLIC_OBIKAE_BASE_URL ?? 'https://fango-reco.vercel.app';

export const OBIKAE_POPUP_FEATURES =
  'popup,width=1280,height=900,scrollbars=yes,resizable=yes';

/**
 * Fragment-encoded init payload handed from the mockup to the obikae popup.
 * Uses the URL fragment (not query) so: (a) large payloads up to ~2MB work,
 * (b) the server never sees it (no logging of internal URLs).
 */
export interface ObikaeInitPayload {
  customerName: string;
  parentOrigin: string;
  vacancies: ObikaeVacancyInput[];
}

/** Build the /editor/quick URL for opening a new obikae popup. */
export function buildObikaeEditorUrl(
  customerName: string,
  vacancies: ObikaeVacancyInput[],
  parentOrigin?: string
): string | null {
  if (vacancies.length === 0) return null;

  const payload: ObikaeInitPayload = {
    customerName,
    parentOrigin: parentOrigin ?? '',
    vacancies,
  };

  const url = new URL('/editor/quick', OBIKAE_BASE_URL);
  // Percent-encoded JSON in the URL fragment. The fragment never hits the
  // server (Next.js server sees path+query only). URLSearchParams on the
  // receiving side will decode the %XX sequences back to the original JSON.
  url.hash = `data=${encodeURIComponent(JSON.stringify(payload))}`;
  return url.toString();
}

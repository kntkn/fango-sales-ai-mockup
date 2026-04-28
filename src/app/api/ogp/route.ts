import { NextResponse } from 'next/server';
import { isBlockedHost } from '@/lib/ssrf';
import { rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

type OgpData = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
};

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min
const NEG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min for failures

type Entry = { data: OgpData | null; expiresAt: number };
// Bounded cache — a Map preserves insertion order so evicting the oldest
// entry when we hit the cap is O(1). Without this bound an attacker could
// probe unique URLs to grow the cache without limit.
const CACHE_CAP = 2000;
const cache = new Map<string, Entry>();
function cacheSet(key: string, entry: Entry) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, entry);
  while (cache.size > CACHE_CAP) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function decodeEntity(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ');
}

// Find <meta property="og:..." content="..."> (or name="..."), order-independent.
function findMeta(html: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const esc = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    // property/name first
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${esc}["'][^>]*content=["']([^"']+)["']`,
      'i',
    );
    // content first
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${esc}["']`,
      'i',
    );
    const m = html.match(re1) ?? html.match(re2);
    if (m?.[1]) return decodeEntity(m[1]).trim();
  }
  return undefined;
}

function findTitle(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decodeEntity(m[1]).trim() : undefined;
}

function resolveUrl(raw: string | undefined, base: string): string | undefined {
  if (!raw) return undefined;
  try {
    return new URL(raw, base).toString();
  } catch {
    return undefined;
  }
}

async function fetchOgp(rawUrl: string): Promise<OgpData | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (isBlockedHost(url.hostname)) return null;

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 6000);

  try {
    const res = await fetch(url.toString(), {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        // Many sites block empty/bot UAs; pretend to be a regular browser.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en;q=0.8',
      },
    });

    if (!res.ok) return null;
    const ctype = res.headers.get('content-type') ?? '';
    if (!ctype.includes('text/html') && !ctype.includes('application/xhtml')) return null;

    // Cap at 256 KB so a big page doesn't blow us up.
    const reader = res.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let total = 0;
    const MAX = 256 * 1024;
    while (total < MAX) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
      }
    }
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }

    const merged = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.byteLength;
    }
    const html = new TextDecoder('utf-8', { fatal: false }).decode(merged);

    const title =
      findMeta(html, ['og:title', 'twitter:title']) ?? findTitle(html);
    const description = findMeta(html, [
      'og:description',
      'twitter:description',
      'description',
    ]);
    const imageRaw = findMeta(html, ['og:image', 'twitter:image', 'twitter:image:src']);
    const siteName = findMeta(html, ['og:site_name']);

    const image = resolveUrl(imageRaw, url.toString());

    if (!title && !description && !image) return null;

    return {
      url: url.toString(),
      title,
      description,
      image,
      siteName: siteName ?? url.hostname,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: Request) {
  // Tight bucket — each miss does an outbound HTTP fetch.
  const rlFail = rateLimit(req, { bucket: 'ogp', max: 30, windowMs: 60_000 });
  if (rlFail) return rlFail;
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  if (!target) return NextResponse.json({ error: 'url required' }, { status: 400 });

  const now = Date.now();
  const hit = cache.get(target);
  if (hit && hit.expiresAt > now) {
    if (!hit.data) return NextResponse.json({ error: 'no ogp' }, { status: 404 });
    return NextResponse.json(hit.data);
  }

  const data = await fetchOgp(target);
  cacheSet(target, {
    data,
    expiresAt: now + (data ? CACHE_TTL_MS : NEG_CACHE_TTL_MS),
  });

  if (!data) return NextResponse.json({ error: 'no ogp' }, { status: 404 });
  return NextResponse.json(data);
}

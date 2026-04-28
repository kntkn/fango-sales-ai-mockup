import { NextResponse } from 'next/server';
import { isBlockedHost } from '@/lib/ssrf';
import { rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

const CACHE_TTL_S = 60 * 60; // 1h browser cache

const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/svg+xml',
];

export async function GET(req: Request) {
  const rlFail = rateLimit(req, { bucket: 'ogp-image', max: 60, windowMs: 60_000 });
  if (rlFail) return rlFail;
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('url');
  const referer = searchParams.get('ref') ?? undefined;
  if (!target) return NextResponse.json({ error: 'url required' }, { status: 400 });

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 });
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return NextResponse.json({ error: 'unsupported protocol' }, { status: 400 });
  }
  // SSRF guard — same rejection list as /api/ogp. Without this, a caller can
  // point `url` at a metadata endpoint (169.254.169.254) or an RFC1918 host
  // and this server fetches it using its own routing privileges.
  if (isBlockedHost(url.hostname)) {
    return NextResponse.json({ error: 'blocked host' }, { status: 400 });
  }

  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 8000);

  try {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Accept-Language': 'ja,en;q=0.8',
    };
    if (referer) {
      try {
        headers.Referer = new URL(referer).origin + '/';
      } catch {
        /* ignore bad referer */
      }
    }

    const res = await fetch(url.toString(), {
      signal: ac.signal,
      redirect: 'follow',
      headers,
    });

    if (!res.ok || !res.body) {
      return NextResponse.json({ error: 'upstream failed' }, { status: 502 });
    }

    const ctype = (res.headers.get('content-type') ?? '').toLowerCase();
    const baseType = ctype.split(';')[0].trim();
    if (!ALLOWED_TYPES.includes(baseType)) {
      return NextResponse.json({ error: 'not an image' }, { status: 415 });
    }

    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': baseType,
        'Cache-Control': `public, max-age=${CACHE_TTL_S}, s-maxage=${CACHE_TTL_S}`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'fetch error' }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

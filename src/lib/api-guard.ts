import 'server-only';
import { NextResponse } from 'next/server';

/**
 * Staff-auth guard for mutating API routes.
 *
 * Opt-in via `STAFF_API_TOKEN`. When the env var is unset we skip the check
 * entirely — this keeps `bun dev` ergonomic. When it's set, the matching
 * `x-staff-token` header is required on every call.
 *
 * Routes exempt from this guard (by design, not by this helper):
 *   - /api/line/webhook            — authed by LINE signature instead
 *   - /api/line/content/[messageId]— LINE needs to fetch image binaries
 *   - /api/maisoku/[reinsId]       — same-origin iframe loads
 *   - /api/ogp*                    — public OGP proxy
 */
export function requireStaffAuth(req: Request): NextResponse | null {
  const expected = process.env.STAFF_API_TOKEN;
  if (!expected) return null;
  const given = req.headers.get('x-staff-token');
  if (given === expected) return null;
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

// -----------------------------------------------------------------------------
// Rate limiter — per IP, token-bucket-ish but simpler: fixed window counter.
// -----------------------------------------------------------------------------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
// Bound the map so a flood of distinct IPs can't grow it without limit.
const MAX_BUCKETS = 5000;

function ipOf(req: Request): string {
  // Behind cloudflared / other proxy; fall back to a constant so rate limits
  // still apply (generously) even without an X-Forwarded-For.
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

export function rateLimit(
  req: Request,
  opts: { bucket: string; max: number; windowMs: number },
): NextResponse | null {
  const key = `${opts.bucket}:${ipOf(req)}`;
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + opts.windowMs };
    if (buckets.size >= MAX_BUCKETS) {
      // Evict a stale entry — Map preserves insertion order, so the first key
      // is the oldest.
      const oldest = buckets.keys().next().value;
      if (oldest !== undefined) buckets.delete(oldest);
    }
    buckets.set(key, entry);
  }
  entry.count++;
  if (entry.count > opts.max) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'rate limited' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    );
  }
  return null;
}

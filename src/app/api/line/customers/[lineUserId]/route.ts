import { NextResponse } from 'next/server';
import { findCustomer, upsertCustomer } from '@/lib/line-store';
import { requireStaffAuth, rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

const LINE_USER_ID_RE = /^U[0-9a-f]{32}$/;
const MAX_ALIAS_LEN = 100;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ lineUserId: string }> },
) {
  const authFail = requireStaffAuth(req);
  if (authFail) return authFail;
  const rlFail = rateLimit(req, { bucket: 'line-alias', max: 60, windowMs: 60_000 });
  if (rlFail) return rlFail;
  const { lineUserId } = await params;
  if (!LINE_USER_ID_RE.test(lineUserId)) {
    return NextResponse.json({ error: 'invalid lineUserId' }, { status: 400 });
  }
  const existing = findCustomer(lineUserId);
  if (!existing) {
    return NextResponse.json({ error: 'customer not found' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const updated: typeof existing = { ...existing };
  if ('aliasName' in (body as Record<string, unknown>)) {
    const v = (body as { aliasName?: unknown }).aliasName;
    if (v == null) {
      updated.aliasName = undefined;
    } else if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed.length > MAX_ALIAS_LEN) {
        return NextResponse.json({ error: 'aliasName too long' }, { status: 400 });
      }
      updated.aliasName = trimmed || undefined;
    } else {
      return NextResponse.json({ error: 'aliasName must be string or null' }, { status: 400 });
    }
  }
  upsertCustomer(updated);

  return NextResponse.json({ customer: updated });
}

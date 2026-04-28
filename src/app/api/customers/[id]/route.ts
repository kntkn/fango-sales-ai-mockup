import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCustomer, updateCustomer, type CustomerUpdate } from '@/lib/notion';
import { requireStaffAuth, rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

const MAX_TEXT_FIELD = 500;

function sanitizePatch(body: unknown): CustomerUpdate | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'invalid body' };
  const b = body as Record<string, unknown>;
  const out: CustomerUpdate = {};
  if (b.name !== undefined) {
    if (typeof b.name !== 'string' || b.name.length > MAX_TEXT_FIELD) return { error: 'name invalid' };
    out.name = b.name;
  }
  if (b.email !== undefined) {
    if (typeof b.email !== 'string' || b.email.length > MAX_TEXT_FIELD) return { error: 'email invalid' };
    out.email = b.email;
  }
  if (b.phone !== undefined) {
    if (typeof b.phone !== 'string' || b.phone.length > MAX_TEXT_FIELD) return { error: 'phone invalid' };
    out.phone = b.phone;
  }
  return out;
}

export async function GET(req: NextRequest, ctx: RouteContext<'/api/customers/[id]'>) {
  const rlFail = rateLimit(req, { bucket: 'customers-read', max: 120, windowMs: 60_000 });
  if (rlFail) return rlFail;
  try {
    const { id } = await ctx.params;
    const customer = await getCustomer(id);
    if (!customer) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (err) {
    console.error('GET /api/customers/[id] failed', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/customers/[id]'>) {
  const authFail = requireStaffAuth(request);
  if (authFail) return authFail;
  const rlFail = rateLimit(request, { bucket: 'customers-patch', max: 60, windowMs: 60_000 });
  if (rlFail) return rlFail;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const sanitized = sanitizePatch(body);
  if ('error' in sanitized) {
    return NextResponse.json({ error: sanitized.error }, { status: 400 });
  }
  try {
    const { id } = await ctx.params;
    const updated = await updateCustomer(id, sanitized);
    return NextResponse.json({ customer: updated });
  } catch (err) {
    console.error('PATCH /api/customers/[id] failed', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

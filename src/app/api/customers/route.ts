import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { listCustomers, createCustomer, type CustomerUpdate, type PropertyType } from '@/lib/notion';
import { requireStaffAuth, rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

const MAX_NAME_LEN = 200;
const MAX_TEXT_FIELD = 500;

function isNonEmptyString(v: unknown, maxLen: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen;
}

function validateCustomerBody(body: unknown): CustomerUpdate & { name: string } | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'invalid body' };
  const b = body as Record<string, unknown>;
  if (!isNonEmptyString(b.name, MAX_NAME_LEN)) return { error: 'name is required' };
  const out: CustomerUpdate & { name: string } = { name: b.name as string };
  // Accept only the fields we know; ignore unknown keys so attackers can't
  // push arbitrary Notion properties through the update builder.
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

export async function GET(request: NextRequest) {
  const rlFail = rateLimit(request, { bucket: 'customers-list', max: 120, windowMs: 60_000 });
  if (rlFail) return rlFail;
  try {
    const customers = await listCustomers();
    return NextResponse.json({ customers });
  } catch (err) {
    console.error('GET /api/customers failed', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authFail = requireStaffAuth(request);
  if (authFail) return authFail;
  const rlFail = rateLimit(request, { bucket: 'customers-create', max: 30, windowMs: 60_000 });
  if (rlFail) return rlFail;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const validated = validateCustomerBody(body);
  if ('error' in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  try {
    const created = await createCustomer(validated);
    return NextResponse.json({ customer: created }, { status: 201 });
  } catch (err) {
    console.error('POST /api/customers failed', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}

export type { PropertyType };

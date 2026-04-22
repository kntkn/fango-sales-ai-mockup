import { NextResponse } from 'next/server';
import { findCustomer, upsertCustomer } from '@/lib/line-store';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ lineUserId: string }> },
) {
  const { lineUserId } = await params;
  const existing = findCustomer(lineUserId);
  if (!existing) {
    return NextResponse.json({ error: 'customer not found' }, { status: 404 });
  }

  const body = (await req.json()) as { aliasName?: string | null };

  const updated: typeof existing = { ...existing };
  if ('aliasName' in body) {
    const v = body.aliasName;
    updated.aliasName = v == null ? undefined : String(v).trim() || undefined;
  }
  upsertCustomer(updated);

  return NextResponse.json({ customer: updated });
}

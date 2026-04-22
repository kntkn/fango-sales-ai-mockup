import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCustomer, updateCustomer, type CustomerUpdate } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: RouteContext<'/api/customers/[id]'>) {
  try {
    const { id } = await ctx.params;
    const customer = await getCustomer(id);
    if (!customer) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    return NextResponse.json({ customer });
  } catch (err) {
    console.error('GET /api/customers/[id] failed', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<'/api/customers/[id]'>) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as CustomerUpdate;
    const updated = await updateCustomer(id, body);
    return NextResponse.json({ customer: updated });
  } catch (err) {
    console.error('PATCH /api/customers/[id] failed', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

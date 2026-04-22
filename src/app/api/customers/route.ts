import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { listCustomers, createCustomer, type CustomerUpdate, type PropertyType } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customers = await listCustomers();
    return NextResponse.json({ customers });
  } catch (err) {
    console.error('GET /api/customers failed', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CustomerUpdate & { name?: string };
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const created = await createCustomer(body as CustomerUpdate & { name: string });
    return NextResponse.json({ customer: created }, { status: 201 });
  } catch (err) {
    console.error('POST /api/customers failed', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export type { PropertyType };

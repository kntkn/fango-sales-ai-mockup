import { NextResponse } from 'next/server';
import { getCustomers } from '@/lib/line-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ customers: getCustomers() });
}

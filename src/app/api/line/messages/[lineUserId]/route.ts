import { NextResponse } from 'next/server';
import { getMessages, addMessage, findCustomer, upsertCustomer } from '@/lib/line-store';
import { pushMessage } from '@/lib/line-client';
import { appendChatMessage } from '@/lib/notion-chatlog';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lineUserId: string }> },
) {
  const { lineUserId } = await params;
  return NextResponse.json({ messages: getMessages(lineUserId) });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lineUserId: string }> },
) {
  const { lineUserId } = await params;
  const { text } = (await req.json()) as { text?: string };
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  try {
    await pushMessage(lineUserId, text);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'push failed' },
      { status: 502 },
    );
  }

  const ts = new Date().toISOString();
  const msg = {
    id: `om-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    lineUserId,
    direction: 'outgoing' as const,
    text,
    timestamp: ts,
  };
  addMessage(msg);

  const existing = findCustomer(lineUserId);
  if (existing) {
    upsertCustomer({
      ...existing,
      lastMessageAt: ts,
      lastMessagePreview: text.slice(0, 60),
      lastMessageDirection: 'outgoing',
    });
  }

  // Notion chat log (STAFF direction) — non-blocking
  appendChatMessage({
    lineUserId,
    direction: 'STAFF',
    text,
    timestamp: ts,
  }).catch((err) => console.error('[notion-chatlog STAFF]', err));

  return NextResponse.json({ message: msg });
}

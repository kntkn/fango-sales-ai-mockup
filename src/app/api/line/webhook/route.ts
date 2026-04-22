import { NextResponse } from 'next/server';
import { validateSignature, getUserProfile } from '@/lib/line-client';
import { addMessage, findCustomer, upsertCustomer } from '@/lib/line-store';
import { appendChatMessage } from '@/lib/notion-chatlog';

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-line-signature') ?? '';

  if (rawBody && signature && !validateSignature(rawBody, signature)) {
    console.error('[LINE webhook] invalid signature');
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: { events?: unknown[] } = {};
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch {
    return NextResponse.json({ ok: true });
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  if (events.length === 0) return NextResponse.json({ ok: true });

  for (const ev of events as Array<Record<string, unknown>>) {
    const src = ev.source as { userId?: string } | undefined;
    const lineUserId = src?.userId;
    if (!lineUserId) continue;

    const type = ev.type;
    if (type === 'message') {
      const msg = ev.message as { type?: string; text?: string; id?: string } | undefined;
      if (msg?.type === 'text' && typeof msg.text === 'string') {
        await handleText(lineUserId, msg.text, Number(ev.timestamp) || Date.now(), msg.id);
      }
    } else if (type === 'follow') {
      await handleFollow(lineUserId);
    }
  }

  return NextResponse.json({ ok: true });
}

async function ensureCustomer(lineUserId: string): Promise<void> {
  if (findCustomer(lineUserId)) return;
  const profile = await getUserProfile(lineUserId);
  const now = new Date().toISOString();
  upsertCustomer({
    lineUserId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
    createdAt: now,
    lastMessageAt: now,
    lastMessagePreview: '',
  });
}

async function handleText(
  lineUserId: string,
  text: string,
  timestampMs: number,
  messageId?: string,
): Promise<void> {
  await ensureCustomer(lineUserId);
  const existing = findCustomer(lineUserId);
  const ts = new Date(timestampMs).toISOString();

  upsertCustomer({
    lineUserId,
    displayName: existing?.displayName ?? 'LINE User',
    pictureUrl: existing?.pictureUrl,
    createdAt: existing?.createdAt ?? ts,
    lastMessageAt: ts,
    lastMessagePreview: text.slice(0, 60),
    lastMessageDirection: 'incoming',
  });

  addMessage({
    id: messageId ?? `lm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    lineUserId,
    direction: 'incoming',
    text,
    timestamp: ts,
  });

  // Notion chat log (USER direction) — non-blocking
  appendChatMessage({
    lineUserId,
    direction: 'USER',
    text,
    timestamp: timestampMs,
  }).catch((err) => console.error('[notion-chatlog USER]', err));
}

async function handleFollow(lineUserId: string): Promise<void> {
  await ensureCustomer(lineUserId);
}

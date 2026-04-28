import { NextResponse } from 'next/server';
import {
  validateSignature,
  getUserProfile,
  fetchAndCacheLineContent,
} from '@/lib/line-client';
import {
  addMessage,
  findCustomer,
  upsertCustomer,
  type LineMessageType,
} from '@/lib/line-store';
import { appendChatMessage } from '@/lib/notion-chatlog';
import { rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Rate limit BEFORE reading the body so a flood can't force us to do work.
  const rlFail = rateLimit(req, { bucket: 'line-webhook', max: 600, windowMs: 60_000 });
  if (rlFail) return rlFail;
  const rawBody = await req.text();
  const signature = req.headers.get('x-line-signature') ?? '';

  let payload: { events?: unknown[] } = {};
  try {
    payload = JSON.parse(rawBody || '{}');
  } catch {
    return NextResponse.json({ ok: true });
  }

  const events = Array.isArray(payload.events) ? payload.events : [];
  // Empty verification pings (no events) are allowed without a signature so
  // the Messaging API "Verify" button keeps working. Any payload with events
  // must be signed.
  if (events.length === 0) return NextResponse.json({ ok: true });

  if (!signature || !validateSignature(rawBody, signature)) {
    console.error('[LINE webhook] invalid signature');
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  for (const ev of events as Array<Record<string, unknown>>) {
    const src = ev.source as { userId?: string } | undefined;
    const lineUserId = src?.userId;
    if (!lineUserId) continue;

    const type = ev.type;
    if (type === 'message') {
      const msg = ev.message as
        | {
            type?: string;
            text?: string;
            id?: string;
            fileName?: string;
            fileSize?: number;
            stickerId?: string;
            packageId?: string;
            latitude?: number;
            longitude?: number;
            address?: string;
            quoteToken?: string;
            quotedMessageId?: string;
          }
        | undefined;
      const tsMs = Number(ev.timestamp) || Date.now();
      if (msg?.type === 'text' && typeof msg.text === 'string') {
        await handleText(lineUserId, msg.text, tsMs, msg.id, {
          quoteToken: msg.quoteToken,
          quotedMessageId: msg.quotedMessageId,
        });
      } else if (msg?.type && msg.id) {
        await handleMedia(lineUserId, msg, tsMs);
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
  quote?: { quoteToken?: string; quotedMessageId?: string },
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
    quoteToken: quote?.quoteToken,
    quotedMessageId: quote?.quotedMessageId,
  });

  // Notion chat log (USER direction) — non-blocking
  appendChatMessage({
    lineUserId,
    direction: 'USER',
    text,
    timestamp: timestampMs,
  }).catch((err) => console.error('[notion-chatlog USER]', err));
}

const MEDIA_PLACEHOLDERS: Record<LineMessageType, string> = {
  text: '',
  image: '[画像]',
  video: '[動画]',
  audio: '[音声メッセージ]',
  file: '[ファイル]',
  sticker: '[スタンプ]',
  location: '[位置情報]',
};

async function handleMedia(
  lineUserId: string,
  msg: {
    type?: string;
    id?: string;
    fileName?: string;
    fileSize?: number;
    stickerId?: string;
    packageId?: string;
    latitude?: number;
    longitude?: number;
    address?: string;
    quoteToken?: string;
    quotedMessageId?: string;
  },
  timestampMs: number,
): Promise<void> {
  const t = msg.type as LineMessageType;
  if (!t || !(t in MEDIA_PLACEHOLDERS)) return;

  await ensureCustomer(lineUserId);
  const existing = findCustomer(lineUserId);
  const ts = new Date(timestampMs).toISOString();

  const placeholder =
    t === 'file' && msg.fileName ? `[ファイル] ${msg.fileName}` : MEDIA_PLACEHOLDERS[t];

  // Fetch binary (image/video/audio/file). Stickers/location carry no binary.
  let attachmentFile: string | undefined;
  let contentType: string | undefined;
  let fileSize: number | undefined = msg.fileSize;

  if (msg.id && (t === 'image' || t === 'video' || t === 'audio' || t === 'file')) {
    try {
      const cached = await fetchAndCacheLineContent(msg.id);
      if (cached) {
        attachmentFile = cached.file;
        contentType = cached.contentType;
        if (fileSize === undefined) fileSize = cached.size;
      }
    } catch (err) {
      console.error('[LINE content] cache error', msg.id, err);
    }
  }

  upsertCustomer({
    lineUserId,
    displayName: existing?.displayName ?? 'LINE User',
    pictureUrl: existing?.pictureUrl,
    createdAt: existing?.createdAt ?? ts,
    lastMessageAt: ts,
    lastMessagePreview: placeholder.slice(0, 60),
    lastMessageDirection: 'incoming',
  });

  addMessage({
    id: msg.id ?? `lm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    lineUserId,
    direction: 'incoming',
    text: placeholder,
    timestamp: ts,
    type: t,
    attachmentFile,
    contentType,
    fileName: msg.fileName,
    fileSize,
    stickerId: msg.stickerId,
    packageId: msg.packageId,
    latitude: msg.latitude,
    longitude: msg.longitude,
    address: msg.address,
    quoteToken: msg.quoteToken,
    quotedMessageId: msg.quotedMessageId,
  });

  appendChatMessage({
    lineUserId,
    direction: 'USER',
    text: placeholder,
    messageType: t,
    timestamp: timestampMs,
  }).catch((err) => console.error('[notion-chatlog USER media]', err));
}

async function handleFollow(lineUserId: string): Promise<void> {
  await ensureCustomer(lineUserId);
}

import { NextResponse } from 'next/server';
import { getMessages, addMessage, findCustomer, upsertCustomer } from '@/lib/line-store';
import { pushMessage } from '@/lib/line-client';
import { appendChatMessage } from '@/lib/notion-chatlog';
import { requireStaffAuth, rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// LINE user ids are "U" + 32 hex chars. Rejecting other shapes at the edge
// keeps them from flowing into outbound LINE API URLs or into our store.
const LINE_USER_ID_RE = /^U[0-9a-f]{32}$/;
// LINE text message max length is 5000 chars. Enforce here so oversize bodies
// don't waste an outbound push only to be 400'd by LINE.
const MAX_TEXT_LEN = 5000;
const MAX_QUOTE_TOKEN_LEN = 200;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ lineUserId: string }> },
) {
  const { lineUserId } = await params;
  if (!LINE_USER_ID_RE.test(lineUserId)) {
    return NextResponse.json({ error: 'invalid lineUserId' }, { status: 400 });
  }
  return NextResponse.json({ messages: getMessages(lineUserId) });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lineUserId: string }> },
) {
  const authFail = requireStaffAuth(req);
  if (authFail) return authFail;
  const rlFail = rateLimit(req, { bucket: 'line-push', max: 60, windowMs: 60_000 });
  if (rlFail) return rlFail;
  const { lineUserId } = await params;
  if (!LINE_USER_ID_RE.test(lineUserId)) {
    return NextResponse.json({ error: 'invalid lineUserId' }, { status: 400 });
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
  const { text, quoteToken, quotedMessageId } = body as {
    text?: unknown;
    quoteToken?: unknown;
    quotedMessageId?: unknown;
  };
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LEN) {
    return NextResponse.json({ error: 'text too long' }, { status: 413 });
  }
  if (quoteToken !== undefined && (typeof quoteToken !== 'string' || quoteToken.length > MAX_QUOTE_TOKEN_LEN)) {
    return NextResponse.json({ error: 'invalid quoteToken' }, { status: 400 });
  }
  if (quotedMessageId !== undefined && (typeof quotedMessageId !== 'string' || quotedMessageId.length > 100)) {
    return NextResponse.json({ error: 'invalid quotedMessageId' }, { status: 400 });
  }

  let sentQuoteToken: string | undefined;
  try {
    const result = await pushMessage(lineUserId, text, {
      quoteToken: typeof quoteToken === 'string' ? quoteToken : undefined,
    });
    sentQuoteToken = result.sentQuoteToken;
  } catch (err) {
    // Log the upstream detail, return a generic body so we don't leak LINE
    // tokens / internal URLs / JWT state.
    console.error('[line push]', err);
    return NextResponse.json({ error: 'push failed' }, { status: 502 });
  }

  const ts = new Date().toISOString();
  const msg = {
    id: `om-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    lineUserId,
    direction: 'outgoing' as const,
    text,
    timestamp: ts,
    // Persist:
    //   - sentQuoteToken: lets *future* messages quote this outgoing message.
    //   - quotedMessageId: links this reply back to the message it quoted so
    //     the thread UI can render the source snippet above this bubble.
    quoteToken: sentQuoteToken,
    quotedMessageId: typeof quotedMessageId === 'string' ? quotedMessageId : undefined,
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

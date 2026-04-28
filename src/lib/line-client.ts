import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

function secret() {
  const s = process.env.LINE_CHANNEL_SECRET;
  if (!s) throw new Error('LINE_CHANNEL_SECRET not set');
  return s;
}

function token() {
  const t = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!t) throw new Error('LINE_CHANNEL_ACCESS_TOKEN not set');
  return t;
}

const ATTACHMENTS_DIR = path.join(process.cwd(), 'data', 'attachments');

export function attachmentsDir(): string {
  return ATTACHMENTS_DIR;
}

function ensureAttachmentsDir() {
  if (!fs.existsSync(ATTACHMENTS_DIR)) {
    fs.mkdirSync(ATTACHMENTS_DIR, { recursive: true });
  }
}

// LINE content (image / video / audio / file) is retained by LINE for a limited
// window, so we cache it to disk on receipt. Returns the on-disk filename and
// metadata.
export async function fetchAndCacheLineContent(
  messageId: string,
): Promise<{ file: string; contentType: string; size: number } | null> {
  const res = await fetch(
    `https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`,
    { headers: { Authorization: `Bearer ${token()}` } },
  );
  if (!res.ok) {
    console.error('[LINE content] fetch failed', messageId, res.status);
    return null;
  }
  const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
  const buf = Buffer.from(await res.arrayBuffer());

  ensureAttachmentsDir();
  // File on disk is "<messageId>.bin" — we track the MIME in the message record.
  const fileName = `${messageId}.bin`;
  const filePath = path.join(ATTACHMENTS_DIR, fileName);
  fs.writeFileSync(filePath, buf);
  return { file: fileName, contentType, size: buf.byteLength };
}

export function readAttachment(fileName: string): { buf: Buffer; path: string } | null {
  // Guard against path traversal — only allow plain filenames.
  if (fileName.includes('/') || fileName.includes('..')) return null;
  const filePath = path.join(ATTACHMENTS_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  return { buf: fs.readFileSync(filePath), path: filePath };
}

export function validateSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false;
  const digest = crypto.createHmac('sha256', secret()).update(rawBody).digest('base64');
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Push a text message. When `opts.quoteToken` is supplied, LINE renders the
// outgoing bubble as a reply to the message that originated the token (the
// standard "引用返信" UI in the LINE app). Returns the outgoing sentMessages[0]
// quoteToken (if present) so the caller can store it — this lets future
// messages quote *this* outgoing message.
export async function pushMessage(
  userId: string,
  text: string,
  opts?: { quoteToken?: string },
): Promise<{ sentQuoteToken?: string }> {
  const message: Record<string, unknown> = { type: 'text', text };
  if (opts?.quoteToken) message.quoteToken = opts.quoteToken;
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: userId,
      messages: [message],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LINE push error: ${res.status} ${err}`);
  }
  const body = (await res.json().catch(() => ({}))) as {
    sentMessages?: Array<{ id?: string; quoteToken?: string }>;
  };
  return { sentQuoteToken: body.sentMessages?.[0]?.quoteToken };
}

// LINE image push requires two public HTTPS URLs per image:
//   originalContentUrl: JPEG/PNG, max 10MB
//   previewImageUrl:    JPEG/PNG, max 1MB
// LINE accepts up to 5 messages per push call — we batch beyond that.
// Image messages cannot be sent *as* a quote (LINE only supports text/sticker
// for the outgoing quoteToken field), but the push response still returns a
// quoteToken per sent image, which we surface so the caller can persist it —
// future messages can quote these outgoing images.
export async function pushImages(
  userId: string,
  images: Array<{ originalContentUrl: string; previewImageUrl: string }>,
): Promise<{ sentQuoteTokens: Array<string | undefined> }> {
  const sentQuoteTokens: Array<string | undefined> = [];
  if (images.length === 0) return { sentQuoteTokens };
  for (let i = 0; i < images.length; i += 5) {
    const batch = images.slice(i, i + 5);
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: userId,
        messages: batch.map((img) => ({
          type: 'image',
          originalContentUrl: img.originalContentUrl,
          previewImageUrl: img.previewImageUrl,
        })),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LINE image push error: ${res.status} ${err}`);
    }
    const body = (await res.json().catch(() => ({}))) as {
      sentMessages?: Array<{ id?: string; quoteToken?: string }>;
    };
    const sent = body.sentMessages ?? [];
    for (let j = 0; j < batch.length; j++) {
      sentQuoteTokens.push(sent[j]?.quoteToken);
    }
  }
  return { sentQuoteTokens };
}

export function saveOutgoingAttachment(
  buf: Buffer,
  fileName: string,
): void {
  ensureAttachmentsDir();
  fs.writeFileSync(path.join(ATTACHMENTS_DIR, fileName), buf);
}

export async function getUserProfile(
  userId: string,
): Promise<{ displayName: string; pictureUrl?: string }> {
  const res = await fetch(
    `https://api.line.me/v2/bot/profile/${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${token()}` },
    },
  );
  if (!res.ok) return { displayName: `LINE ${userId.slice(1, 7)}` };
  return res.json() as Promise<{ displayName: string; pictureUrl?: string }>;
}

import { NextResponse } from 'next/server';
import {
  addMessage,
  findCustomer,
  upsertCustomer,
  updateMessageQuoteToken,
} from '@/lib/line-store';
import { pushImages, saveOutgoingAttachment } from '@/lib/line-client';
import { appendChatMessage } from '@/lib/notion-chatlog';
import { getPublicBaseUrl } from '@/lib/public-tunnel';
import { requireStaffAuth, rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// Hard caps defended by LINE spec. Client should already pre-resize.
const MAX_ORIGINAL_BYTES = 10 * 1024 * 1024; // 10 MB per image
const MAX_PREVIEW_BYTES = 1 * 1024 * 1024; //  1 MB per preview
// Soft cap on batch size. LINE limits 5 messages per push call (we batch), but
// we also limit how many images one request can carry so a single upload cannot
// monopolize the tunnel / Notion logging.
const MAX_IMAGES_PER_REQUEST = 10;
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png']);
const LINE_USER_ID_RE = /^U[0-9a-f]{32}$/;

// Magic bytes confirm the file really is the claimed format, so a client that
// lies about MIME can't smuggle a non-image (executable, html, etc.) through
// our attachment store.
function detectImageMime(buf: Buffer): 'image/jpeg' | 'image/png' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) return 'image/png';
  return null;
}

function localPort(req: Request): number {
  const host = req.headers.get('host') ?? '';
  const m = host.match(/:(\d+)$/);
  if (m) return Number(m[1]);
  return Number(process.env.PORT) || 3000;
}

type PreparedImage = {
  msgId: string;
  origName: string;
  prevName: string;
  origBuf: Buffer;
  prevBuf: Buffer;
  displayName: string;
  contentType: string;
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ lineUserId: string }> },
) {
  const authFail = requireStaffAuth(req);
  if (authFail) return authFail;
  const rlFail = rateLimit(req, { bucket: 'line-image', max: 30, windowMs: 60_000 });
  if (rlFail) return rlFail;
  const { lineUserId } = await params;
  if (!LINE_USER_ID_RE.test(lineUserId)) {
    return NextResponse.json({ error: 'invalid lineUserId' }, { status: 400 });
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ error: 'multipart body required' }, { status: 400 });
  }

  const originals = fd.getAll('original').filter((v): v is File => v instanceof File);
  const previews = fd.getAll('preview').filter((v): v is File => v instanceof File);

  if (originals.length === 0 || previews.length === 0) {
    return NextResponse.json(
      { error: 'original and preview fields required' },
      { status: 400 },
    );
  }
  if (originals.length !== previews.length) {
    return NextResponse.json(
      {
        error: `original (${originals.length}) と preview (${previews.length}) の数が一致していません`,
      },
      { status: 400 },
    );
  }
  if (originals.length > MAX_IMAGES_PER_REQUEST) {
    return NextResponse.json(
      { error: `一度に送れる画像は ${MAX_IMAGES_PER_REQUEST} 枚までです (${originals.length} 枚)` },
      { status: 400 },
    );
  }

  // Validate each pair before saving anything.
  for (let i = 0; i < originals.length; i++) {
    const o = originals[i];
    const p = previews[i];
    if (!ALLOWED_IMAGE_MIME.has(o.type)) {
      return NextResponse.json(
        {
          error: `画像 #${i + 1}: JPEG/PNG のみ対応 (received: ${o.type || 'unknown'})`,
        },
        { status: 400 },
      );
    }
    if (o.size > MAX_ORIGINAL_BYTES) {
      return NextResponse.json(
        {
          error: `画像 #${i + 1} が 10MB を超えています (${(o.size / 1024 / 1024).toFixed(1)}MB)`,
        },
        { status: 413 },
      );
    }
    if (p.size > MAX_PREVIEW_BYTES) {
      return NextResponse.json(
        {
          error: `プレビュー #${i + 1} が 1MB を超えています (${(p.size / 1024 / 1024).toFixed(1)}MB)`,
        },
        { status: 413 },
      );
    }
  }

  let baseUrl: string;
  try {
    baseUrl = await getPublicBaseUrl(req, localPort(req));
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? `tunnel unavailable: ${err.message}`
            : 'tunnel unavailable',
      },
      { status: 500 },
    );
  }

  // Prepare + persist all images before touching LINE, so the URLs are live
  // when LINE fetches them.
  const prepared: PreparedImage[] = [];
  const baseTs = Date.now();
  for (let i = 0; i < originals.length; i++) {
    const original = originals[i];
    const preview = previews[i];
    const msgId = `om-${baseTs}-${i}-${Math.random().toString(36).slice(2, 6)}`;
    const origName = `${msgId}.bin`;
    const prevName = `${msgId}.preview.bin`;
    const origBuf = Buffer.from(await original.arrayBuffer());
    const prevBuf = Buffer.from(await preview.arrayBuffer());
    // Verify magic bytes — the declared MIME is client-supplied and trivially
    // spoofable. We require the preview to match the original's real format.
    const origMime = detectImageMime(origBuf);
    const prevMime = detectImageMime(prevBuf);
    if (!origMime || !prevMime) {
      return NextResponse.json(
        {
          error: `画像 #${i + 1} のフォーマットを検出できませんでした (JPEG/PNG のみ対応)`,
        },
        { status: 400 },
      );
    }
    saveOutgoingAttachment(origBuf, origName);
    saveOutgoingAttachment(prevBuf, prevName);
    prepared.push({
      msgId,
      origName,
      prevName,
      origBuf,
      prevBuf,
      displayName: original.name || 'image.jpg',
      // Trust the detected MIME, not the client-declared one, so
      // /api/line/content serves accurate Content-Type later.
      contentType: origMime,
    });
  }

  // Register each as a separate message record (image messages never batch in
  // the stored log, even when they share one LINE push call).
  for (let i = 0; i < prepared.length; i++) {
    const p = prepared[i];
    const ts = new Date(baseTs + i).toISOString(); // preserve ordering
    addMessage({
      id: p.msgId,
      lineUserId,
      direction: 'outgoing',
      text: '',
      timestamp: ts,
      type: 'image',
      attachmentFile: p.origName,
      previewFile: p.prevName,
      contentType: p.contentType,
      fileName: p.displayName,
      fileSize: p.origBuf.byteLength,
    });
  }

  const images = prepared.map((p) => ({
    originalContentUrl: `${baseUrl}/api/line/content/${encodeURIComponent(p.msgId)}`,
    previewImageUrl: `${baseUrl}/api/line/content/${encodeURIComponent(p.msgId)}?preview=1`,
  }));

  let sentQuoteTokens: Array<string | undefined> = [];
  try {
    const result = await pushImages(lineUserId, images);
    sentQuoteTokens = result.sentQuoteTokens;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'push failed' },
      { status: 502 },
    );
  }

  // Persist the returned quoteTokens so future messages can quote these
  // outgoing images (LINE doesn't let us *send* with an image quoteToken,
  // but the image itself can be quoted by the next text/sticker message).
  for (let i = 0; i < prepared.length; i++) {
    const token = sentQuoteTokens[i];
    if (token) updateMessageQuoteToken(lineUserId, prepared[i].msgId, token);
  }

  const lastTs = new Date(baseTs + prepared.length - 1).toISOString();
  const summary =
    prepared.length === 1
      ? `[画像] ${prepared[0].displayName}`
      : `[画像 ${prepared.length}枚]`;

  const existing = findCustomer(lineUserId);
  if (existing) {
    upsertCustomer({
      ...existing,
      lastMessageAt: lastTs,
      lastMessagePreview: summary,
      lastMessageDirection: 'outgoing',
    });
  }

  for (const p of prepared) {
    appendChatMessage({
      lineUserId,
      direction: 'STAFF',
      text: `[画像] ${p.displayName}`,
      messageType: 'image',
      timestamp: new Date(baseTs).toISOString(),
    }).catch((err) => console.error('[notion-chatlog STAFF image]', err));
  }

  return NextResponse.json({
    ok: true,
    count: prepared.length,
    messageIds: prepared.map((p) => p.msgId),
  });
}

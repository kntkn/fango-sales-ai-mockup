import { NextResponse } from 'next/server';
import { readAttachment, fetchAndCacheLineContent } from '@/lib/line-client';
import { getMessageById, updateMessageAttachment } from '@/lib/line-store';
import { requireStaffAuth, rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// Serves cached LINE message binaries (image/video/audio/file) to the mockup
// UI, so the frontend never has to carry a LINE access token.
//
// Auth story: this endpoint is intentionally open so LINE itself can fetch
// outgoing image URLs during a push. But the fallback "re-fetch from LINE
// content API" path burns our channel-access-token quota if abused, so that
// branch requires staff auth (when STAFF_API_TOKEN is set).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  const rlFail = rateLimit(req, { bucket: 'line-content', max: 300, windowMs: 60_000 });
  if (rlFail) return rlFail;
  const { messageId } = await params;
  if (!messageId || messageId.length > 200 || !/^[A-Za-z0-9_-]+$/.test(messageId)) {
    return new NextResponse('bad request', { status: 400 });
  }

  const record = getMessageById(messageId);
  if (!record) return new NextResponse('not found', { status: 404 });

  const wantPreview = new URL(req.url).searchParams.get('preview') === '1';

  // Outgoing images carry a preview variant; serve it when ?preview=1.
  if (wantPreview && record.previewFile) {
    const previewBuf = readAttachment(record.previewFile);
    if (!previewBuf) return new NextResponse('not found', { status: 404 });
    return new NextResponse(new Uint8Array(previewBuf.buf), {
      status: 200,
      headers: {
        'Content-Type': record.contentType ?? 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  }

  let fileName = record.attachmentFile;
  let contentType = record.contentType ?? 'application/octet-stream';

  // Fallback: re-fetch if the binary is missing on disk (e.g. legacy message
  // received before caching was wired up). Incoming direction only — outgoing
  // messages were stored by us, so fetching from LINE would fail.
  //
  // Guarded with staff auth: the re-fetch calls LINE's content API using our
  // channel access token, so leaving it open to anonymous callers would let
  // an attacker burn our token quota.
  const cached = fileName ? readAttachment(fileName) : null;
  if (
    !cached &&
    record.direction === 'incoming' &&
    (record.type === 'image' || record.type === 'video' || record.type === 'audio' || record.type === 'file')
  ) {
    const authFail = requireStaffAuth(req);
    if (authFail) return authFail;
    const refetched = await fetchAndCacheLineContent(messageId);
    if (!refetched) return new NextResponse('content unavailable', { status: 410 });
    fileName = refetched.file;
    contentType = refetched.contentType;
    updateMessageAttachment(record.lineUserId, messageId, {
      attachmentFile: fileName,
      contentType,
      fileSize: refetched.size,
    });
  }

  const served = fileName ? readAttachment(fileName) : null;
  if (!served) return new NextResponse('not found', { status: 404 });

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': 'private, max-age=3600',
  };
  if (record.type === 'file' && record.fileName) {
    headers['Content-Disposition'] = `inline; filename*=UTF-8''${encodeURIComponent(record.fileName)}`;
  }

  return new NextResponse(new Uint8Array(served.buf), { status: 200, headers });
}

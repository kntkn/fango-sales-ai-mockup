import { NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Maisoku PDFs are written by the bukaku-app REINS resolver to the shared SSD.
const MAISOKU_DIR =
  process.env.MAISOKU_DIR ??
  '/Volumes/AgentSSD/04_FANGO/FNG26_物確アプリ/data/maisoku';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reinsId: string }> },
) {
  const { reinsId } = await params;

  // Only digits — REINS IDs are 12-digit numbers. Anything else is an attempt
  // at path traversal.
  if (!/^\d{6,20}$/.test(reinsId)) {
    return NextResponse.json({ error: 'invalid reinsId' }, { status: 400 });
  }

  const pdfPath = path.join(MAISOKU_DIR, `${reinsId}.pdf`);

  try {
    await stat(pdfPath);
  } catch {
    return NextResponse.json({ error: 'maisoku not found' }, { status: 404 });
  }

  try {
    const buf = await readFile(pdfPath);
    // Magic-byte check: bukaku-app occasionally writes a partial file or an
    // HTML error page through the same path. Labelling HTML as
    // application/pdf would surface as a broken PDF dialog (correctness bug)
    // and, if the iframe host ever relaxed, an XSS vector.
    if (
      buf.length < 4 ||
      buf[0] !== 0x25 /* % */ ||
      buf[1] !== 0x50 /* P */ ||
      buf[2] !== 0x44 /* D */ ||
      buf[3] !== 0x46 /* F */
    ) {
      return NextResponse.json({ error: 'maisoku corrupt' }, { status: 502 });
    }
    const body = new Uint8Array(buf);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${reinsId}.pdf"`,
        'Cache-Control': 'private, max-age=60',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json({ error: 'read failed' }, { status: 500 });
  }
}

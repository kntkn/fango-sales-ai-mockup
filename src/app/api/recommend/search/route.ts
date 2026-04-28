import { NextResponse } from 'next/server';
import {
  createProject,
  uploadRequirements,
  searchProperties,
} from '@/lib/fango-recommend';
import { requireStaffAuth, rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

const ALLOWED_RESULT_COUNTS = [10, 20, 30, 40, 50] as const;
type ResultCount = (typeof ALLOWED_RESULT_COUNTS)[number];
const MAX_NAME_LEN = 200;
const MAX_REQUIREMENTS_LEN = 20_000;

function coerceResultCount(raw: unknown): ResultCount | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  return (ALLOWED_RESULT_COUNTS as readonly number[]).includes(raw)
    ? (raw as ResultCount)
    : undefined;
}

export async function POST(request: Request) {
  const authFail = requireStaffAuth(request);
  if (authFail) return authFail;
  // Each call triggers three upstream requests against Fango Recommend —
  // keep this tight.
  const rlFail = rateLimit(request, { bucket: 'recommend-search', max: 20, windowMs: 60_000 });
  if (rlFail) return rlFail;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  const { customerName, requirements, resultCount } = body as {
    customerName?: unknown;
    requirements?: unknown;
    resultCount?: unknown;
  };

  if (typeof requirements !== 'string' || !requirements.trim()) {
    return NextResponse.json({ error: 'requirements is required' }, { status: 400 });
  }
  if (requirements.length > MAX_REQUIREMENTS_LEN) {
    return NextResponse.json({ error: 'requirements too long' }, { status: 413 });
  }
  if (customerName !== undefined && (typeof customerName !== 'string' || customerName.length > MAX_NAME_LEN)) {
    return NextResponse.json({ error: 'customerName invalid' }, { status: 400 });
  }
  const validatedCount = coerceResultCount(resultCount);
  const name = typeof customerName === 'string' && customerName.trim() ? customerName : '新規顧客';

  try {
    // Match the Fango Recommend web UI flow exactly:
    //   1. POST /api/projects {name}
    //   2. POST /api/projects/:id/upload  (multipart, field=requirements)
    //   3. POST /api/projects/:id/search-properties {userRequirements, resultCount?}
    const project = await createProject(name);
    await uploadRequirements(project.id, requirements);
    const search = await searchProperties(project.id, requirements, validatedCount);

    return NextResponse.json({
      projectId: project.id,
      jobId: search.jobId,
      resultCount: validatedCount ?? null,
      message: search.message,
    });
  } catch (err) {
    console.error('Recommend search error:', err);
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }
}

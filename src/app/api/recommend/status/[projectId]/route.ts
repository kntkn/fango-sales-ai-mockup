import { NextResponse } from 'next/server';
import { getProject } from '@/lib/fango-recommend';
import { rateLimit } from '@/lib/api-guard';

export const dynamic = 'force-dynamic';

// Fango Recommend project ids are short opaque tokens. Rejecting anything else
// prevents a caller from smuggling path segments (../admin) into the upstream
// URL that gets authenticated with our bearer token.
const PROJECT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  // Mockup polls this every ~5s per active conversation — use a generous
  // limit so a couple of parallel searches aren't throttled, but still low
  // enough to contain abuse of upstream Fango Recommend.
  const rlFail = rateLimit(request, { bucket: 'recommend-status', max: 300, windowMs: 60_000 });
  if (rlFail) return rlFail;
  try {
    const { projectId } = await params;
    if (!PROJECT_ID_RE.test(projectId)) {
      return NextResponse.json({ error: 'invalid projectId' }, { status: 400 });
    }
    const project = await getProject(projectId);

    const results = (project.savedSearchResults || []).map((r) => ({
      reinsId: r.reins_id,
      predictedViews: r.predicted_views,
      searchedAt: r.searched_at,
      rent: r.rent ?? null,
      areaSqm: r.area_sqm ?? null,
      builtYear: r.built_year ?? null,
      walkMinutes: r.walk_minutes ?? null,
      address: r.address ?? null,
      floorPlan: r.floor_plan ?? null,
      propertyType: r.property_type ?? null,
      deposit: r.deposit ?? null,
      keyMoney: r.key_money ?? null,
    }));

    return NextResponse.json({
      status: results.length > 0 ? 'complete' : 'searching',
      results,
    });
  } catch (err) {
    // Log the real cause server-side, but return a generic body so we don't
    // leak upstream URLs, JWT state, or stack traces to the caller.
    console.error('Recommend status error:', err);
    return NextResponse.json({ error: 'upstream error' }, { status: 502 });
  }
}

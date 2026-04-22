import { NextResponse } from 'next/server';
import { getProject } from '@/lib/fango-recommend';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
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
    console.error('Recommend status error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

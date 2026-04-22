import { NextResponse } from 'next/server';
import {
  createProject,
  uploadRequirements,
  searchProperties,
} from '@/lib/fango-recommend';

export async function POST(request: Request) {
  try {
    const { customerName, requirements } = await request.json();

    if (!requirements) {
      return NextResponse.json(
        { error: 'requirements is required' },
        { status: 400 },
      );
    }

    // Match the Fango Recommend web UI flow exactly:
    //   1. POST /api/projects {name}
    //   2. POST /api/projects/:id/upload  (multipart, field=requirements)
    //   3. POST /api/projects/:id/search-properties {userRequirements}
    const project = await createProject(customerName || '新規顧客');
    await uploadRequirements(project.id, requirements);
    const search = await searchProperties(project.id, requirements);

    return NextResponse.json({
      projectId: project.id,
      jobId: search.jobId,
      message: search.message,
    });
  } catch (err) {
    console.error('Recommend search error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}

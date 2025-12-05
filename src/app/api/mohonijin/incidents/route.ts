import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { listIncidents } from '@/lib/db/incidents';
import type { IncidentStatus, IncidentSourceType } from '@/types/incidents';

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const sourceTypeParam = searchParams.get('sourceType');
    const since = searchParams.get('since') || undefined;
    const limitParam = searchParams.get('limit');

    const allowedStatuses: IncidentStatus[] = ['open', 'in_review', 'resolved'];
    const allowedSourceTypes: IncidentSourceType[] = ['emergency_report', 'crowdsource_submission'];

    const status = allowedStatuses.includes(statusParam as IncidentStatus)
      ? (statusParam as IncidentStatus)
      : undefined;

    const sourceType = allowedSourceTypes.includes(sourceTypeParam as IncidentSourceType)
      ? (sourceTypeParam as IncidentSourceType)
      : undefined;

    let limit = 100;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 200);
      }
    }

    const incidents = await listIncidents({
      status,
      sourceType,
      since,
      limit,
    });

    return NextResponse.json({ data: incidents });
  } catch (error: any) {
    console.error('GET /api/mohonijin/incidents error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

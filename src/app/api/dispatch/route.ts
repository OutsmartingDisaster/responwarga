import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { processNewReportDispatch } from '@/lib/services/dispatch';

// POST /api/dispatch - Process dispatch for a report (internal use)
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    
    // This endpoint can be called without auth for public reports
    // but we log if there's a user
    
    const body = await request.json();
    const { report_id, latitude, longitude, report_type } = body;

    if (!report_id || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'report_id, latitude, and longitude are required' },
        { status: 400 }
      );
    }

    const result = await processNewReportDispatch(
      report_id,
      latitude,
      longitude,
      report_type || 'emergency_report'
    );

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('POST /api/dispatch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

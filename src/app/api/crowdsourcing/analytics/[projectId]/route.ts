import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin' && role !== 'co_super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { projectId } = await params;

    // Status counts
    const { rows: statusCounts } = await query(
      `SELECT status, COUNT(*) as count 
       FROM crowdsource_submissions WHERE project_id = $1 
       GROUP BY status`,
      [projectId]
    );

    // Media type counts
    const { rows: mediaTypes } = await query(
      `SELECT media_type, COUNT(*) as count 
       FROM crowdsource_submissions WHERE project_id = $1 
       GROUP BY media_type`,
      [projectId]
    );

    // Daily submissions (last 30 days)
    const { rows: dailyStats } = await query(
      `SELECT DATE(submitted_at) as date, COUNT(*) as count
       FROM crowdsource_submissions 
       WHERE project_id = $1 AND submitted_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(submitted_at)
       ORDER BY date`,
      [projectId]
    );

    // Hourly distribution
    const { rows: hourlyStats } = await query(
      `SELECT EXTRACT(HOUR FROM submitted_at) as hour, COUNT(*) as count
       FROM crowdsource_submissions WHERE project_id = $1
       GROUP BY EXTRACT(HOUR FROM submitted_at)
       ORDER BY hour`,
      [projectId]
    );

    // Location clusters (for heatmap)
    const { rows: locations } = await query(
      `SELECT latitude, longitude, COUNT(*) as weight
       FROM crowdsource_submissions 
       WHERE project_id = $1 AND status = 'approved'
       GROUP BY latitude, longitude`,
      [projectId]
    );

    // Top submitters
    const { rows: topSubmitters } = await query(
      `SELECT submitter_name, COUNT(*) as count
       FROM crowdsource_submissions WHERE project_id = $1
       GROUP BY submitter_name
       ORDER BY count DESC LIMIT 10`,
      [projectId]
    );

    return NextResponse.json({
      data: {
        status_counts: statusCounts.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count) }), {}),
        media_types: mediaTypes.reduce((acc, r) => ({ ...acc, [r.media_type]: parseInt(r.count) }), {}),
        daily_stats: dailyStats.map(r => ({ date: r.date, count: parseInt(r.count) })),
        hourly_stats: hourlyStats.map(r => ({ hour: parseInt(r.hour), count: parseInt(r.count) })),
        heatmap_data: locations.map(r => ({ lat: parseFloat(r.latitude), lng: parseFloat(r.longitude), weight: parseInt(r.weight) })),
        top_submitters: topSubmitters.map(r => ({ name: r.submitter_name, count: parseInt(r.count) }))
      }
    });
  } catch (error: any) {
    console.error('[crowdsourcing/analytics] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

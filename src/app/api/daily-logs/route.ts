import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET /api/daily-logs - List daily logs for current responder
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const limit = parseInt(searchParams.get('limit') || '30');

    let sql = `
      SELECT dl.*, 
             p.full_name as responder_name,
             o.name as organization_name
      FROM daily_logs dl
      LEFT JOIN profiles p ON p.user_id = dl.responder_id
      LEFT JOIN organizations o ON o.id = p.organization_id
      WHERE dl.responder_id = $1
    `;
    const params: any[] = [user.id];
    let paramIndex = 2;

    if (date) {
      sql += ` AND dl.log_date = $${paramIndex++}`;
      params.push(date);
    }

    sql += ` ORDER BY dl.log_date DESC, dl.created_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(sql, params);
    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('GET /api/daily-logs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/daily-logs - Create new daily log entry
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      log_date,
      log_content,
      activity_type,
      duration_minutes,
      location_lat,
      location_lng,
      photos,
      assignment_id,  // Link to assignment if applicable
      resources
    } = body;

    if (!log_content || !activity_type) {
      return NextResponse.json({ error: 'log_content and activity_type are required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO daily_logs (
        responder_id, log_date, log_content, activity_type, 
        duration_minutes, location_lat, location_lng, photos, 
        resources, sync_status, status
      ) VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8::jsonb, $9, 'synced', 'active')
      RETURNING *`,
      [
        user.id,
        log_date || new Date().toISOString().split('T')[0],
        log_content,
        activity_type,
        duration_minutes || null,
        location_lat || null,
        location_lng || null,
        photos ? JSON.stringify(photos) : null,
        resources || null
      ]
    );

    // If linked to an assignment, update assignment with log reference
    if (assignment_id) {
      await query(
        `UPDATE report_assignments SET response_notes = COALESCE(response_notes, '') || $1 WHERE id = $2`,
        [`\n[Log ${result.rows[0].id}] ${log_content.substring(0, 100)}...`, assignment_id]
      );
    }

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/daily-logs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import { InviteTeamMemberRequest } from '@/types/operations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/operations/[id]/members - List team members
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT 
        rtm.*,
        p.full_name as user_name,
        p.phone as user_phone,
        p.status as user_status,
        p.latitude as user_lat,
        p.longitude as user_lng,
        inv.full_name as invited_by_name
      FROM response_team_members rtm
      JOIN profiles p ON p.user_id = rtm.user_id
      LEFT JOIN profiles inv ON inv.user_id = rtm.invited_by
      WHERE rtm.response_operation_id = $1
      ORDER BY rtm.status ASC, rtm.invited_at DESC`,
      [id]
    );

    return NextResponse.json({ data: result.rows });
  } catch (error: any) {
    console.error('GET /api/operations/[id]/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/operations/[id]/members - Invite team member
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only org_admin can invite members
    if (user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: InviteTeamMemberRequest = await request.json();

    if (!body.user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Check operation exists and belongs to user's org
    const opResult = await query(
      'SELECT organization_id FROM response_operations WHERE id = $1',
      [id]
    );

    if (opResult.rows.length === 0) {
      return NextResponse.json({ error: 'Operation not found' }, { status: 404 });
    }

    // Check user to invite is from same org
    const inviteeResult = await query(
      'SELECT organization_id FROM profiles WHERE user_id = $1',
      [body.user_id]
    );

    if (inviteeResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (inviteeResult.rows[0].organization_id !== opResult.rows[0].organization_id) {
      return NextResponse.json({ error: 'User is not from the same organization' }, { status: 400 });
    }

    // Check if already invited
    const existingResult = await query(
      'SELECT id FROM response_team_members WHERE response_operation_id = $1 AND user_id = $2',
      [id, body.user_id]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json({ error: 'User already invited' }, { status: 400 });
    }

    // Insert team member
    const result = await query(
      `INSERT INTO response_team_members (response_operation_id, user_id, role, invited_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, body.user_id, body.role || 'responder', user.id]
    );

    // Create notification for invitee
    await query(
      `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
       VALUES ($1, 'team_invitation', $2, $3, 'response_operation', $4)`,
      [
        body.user_id,
        'Undangan Tim Respon',
        `Anda diundang untuk bergabung dengan operasi respon bencana`,
        id
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/operations/[id]/members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

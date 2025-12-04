import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// POST /api/my-operations/[id]/respond - Accept or decline operation invitation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const operationId = params.id;
    const { accept } = await request.json();

    // Find the team member record
    const memberResult = await query(
      `SELECT id, status FROM response_team_members 
       WHERE response_operation_id = $1 AND user_id = $2`,
      [operationId, user.id]
    );

    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const member = memberResult.rows[0];
    if (member.status !== 'invited') {
      return NextResponse.json({ error: 'Already responded to this invitation' }, { status: 400 });
    }

    // Update status
    const newStatus = accept ? 'accepted' : 'declined';
    const result = await query(
      `UPDATE response_team_members 
       SET status = $1, responded_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, member.id]
    );

    // Notify operation creator
    const opResult = await query(
      'SELECT created_by, name FROM response_operations WHERE id = $1',
      [operationId]
    );

    if (opResult.rows.length > 0) {
      const op = opResult.rows[0];
      await query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, 'invitation_response', $2, $3, 'response_operation', $4)`,
        [
          op.created_by,
          accept ? 'Undangan Diterima' : 'Undangan Ditolak',
          `Anggota tim ${accept ? 'menerima' : 'menolak'} undangan untuk operasi "${op.name}"`,
          operationId
        ]
      );
    }

    return NextResponse.json({ 
      data: result.rows[0],
      message: accept ? 'Undangan diterima' : 'Undangan ditolak'
    });
  } catch (error: any) {
    console.error('POST /api/my-operations/[id]/respond error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

// PATCH /api/operations/[id]/members/[userId] - Update member status (accept/decline)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, userId } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, role } = body;

    // Check if user is updating their own membership or is admin
    const isOwnMembership = user.id === userId;
    const isAdmin = user.role === 'org_admin' || user.role === 'admin';

    if (!isOwnMembership && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only allow certain status updates based on role
    if (isOwnMembership && !isAdmin) {
      // Responders can only accept or decline
      if (status && !['accepted', 'declined'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
    }

    // Build update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (status) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
      
      if (status === 'accepted') {
        updates.push(`joined_at = NOW()`);
      }
    }

    if (role && isAdmin) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(id, userId);
    const result = await query(
      `UPDATE response_team_members 
       SET ${updates.join(', ')} 
       WHERE response_operation_id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    // Create notification for admin when member accepts/declines
    if (isOwnMembership && status) {
      const opResult = await query(
        'SELECT created_by, name FROM response_operations WHERE id = $1',
        [id]
      );
      
      if (opResult.rows.length > 0 && opResult.rows[0].created_by) {
        const notifType = status === 'accepted' ? 'invitation_accepted' : 'invitation_declined';
        const notifTitle = status === 'accepted' ? 'Undangan Diterima' : 'Undangan Ditolak';
        
        await query(
          `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
           VALUES ($1, $2, $3, $4, 'response_operation', $5)`,
          [
            opResult.rows[0].created_by,
            notifType,
            notifTitle,
            `Anggota tim telah ${status === 'accepted' ? 'menerima' : 'menolak'} undangan untuk ${opResult.rows[0].name}`,
            id
          ]
        );
      }
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('PATCH /api/operations/[id]/members/[userId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/operations/[id]/members/[userId] - Remove member
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, userId } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only org_admin can remove members (or user can remove themselves)
    const isOwnMembership = user.id === userId;
    const isAdmin = user.role === 'org_admin' || user.role === 'admin';

    if (!isOwnMembership && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await query(
      'DELETE FROM response_team_members WHERE response_operation_id = $1 AND user_id = $2',
      [id, userId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/operations/[id]/members/[userId] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

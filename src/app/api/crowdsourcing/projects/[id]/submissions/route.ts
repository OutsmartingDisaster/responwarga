import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import type { CrowdsourceSubmission } from '@/lib/crowdsourcing/types';

// GET - List submissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const all = searchParams.get('all') === 'true';

    // Check if user is admin/moderator for viewing all submissions
    let canViewAll = false;
    if (all) {
      const user = await getSessionFromCookies(request.cookies);
      if (user) {
        const role = user.profile?.role || user.role;
        if (role === 'admin' || role === 'super_admin' || role === 'co_super_admin') {
          canViewAll = true;
        } else {
          // Check if user is moderator for this project
          const { rows: mods } = await query(
            `SELECT * FROM crowdsource_moderators 
             WHERE user_id = $1 AND project_id = $2 AND status = 'active'`,
            [user.id, projectId]
          );
          if (mods.length) canViewAll = true;
        }
      }
    }

    let sql = 'SELECT * FROM crowdsource_submissions WHERE project_id = $1';
    const values: any[] = [projectId];

    if (!canViewAll) {
      // Public can only see approved
      sql += ' AND status = $2';
      values.push('approved');
    } else if (status) {
      sql += ' AND status = $2';
      values.push(status);
    }

    sql += ' ORDER BY submitted_at DESC';

    const { rows } = await query<CrowdsourceSubmission>(sql, values);

    // Hide submitter info for public view
    const data = canViewAll ? rows : rows.map(r => ({
      ...r,
      submitter_email: undefined,
      submitter_whatsapp: undefined
    }));

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('[crowdsourcing/submissions] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

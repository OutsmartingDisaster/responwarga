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
    let canExport = role === 'admin' || role === 'super_admin' || role === 'co_super_admin';

    const { projectId } = await params;

    // Check if moderator with export permission
    if (!canExport) {
      const { rows: mods } = await query(
        `SELECT * FROM crowdsource_moderators 
         WHERE user_id = $1 AND project_id = $2 AND status = 'active' AND can_export = true`,
        [user.id, projectId]
      );
      canExport = mods.length > 0;
    }

    if (!canExport) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const status = searchParams.get('status');

    // Get project info
    const { rows: projects } = await query(
      'SELECT title, disaster_type, location_name FROM crowdsource_projects WHERE id = $1',
      [projectId]
    );
    if (!projects.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get submissions
    let sql = `SELECT id, submitter_name, submitter_email, submitter_whatsapp,
                      media_type, media_url, caption, latitude, longitude, address, address_detail,
                      status, submitted_at, verified_at
               FROM crowdsource_submissions WHERE project_id = $1`;
    const values: any[] = [projectId];

    if (status) {
      sql += ' AND status = $2';
      values.push(status);
    }
    sql += ' ORDER BY submitted_at DESC';

    const { rows: submissions } = await query(sql, values);

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'ID', 'Nama', 'Email', 'WhatsApp', 'Tipe Media', 'URL Media',
        'Caption', 'Latitude', 'Longitude', 'Alamat', 'Detail Alamat',
        'Status', 'Tanggal Submit', 'Tanggal Verifikasi'
      ];
      
      const csvRows = [headers.join(',')];
      for (const s of submissions) {
        csvRows.push([
          s.id,
          `"${(s.submitter_name || '').replace(/"/g, '""')}"`,
          s.submitter_email,
          s.submitter_whatsapp,
          s.media_type,
          s.media_url,
          `"${(s.caption || '').replace(/"/g, '""')}"`,
          s.latitude,
          s.longitude,
          `"${(s.address || '').replace(/"/g, '""')}"`,
          `"${(s.address_detail || '').replace(/"/g, '""')}"`,
          s.status,
          s.submitted_at,
          s.verified_at || ''
        ].join(','));
      }

      const csv = csvRows.join('\n');
      const filename = `crowdsource_${projects[0].title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // JSON format
    return NextResponse.json({
      project: projects[0],
      exported_at: new Date().toISOString(),
      total: submissions.length,
      submissions
    });
  } catch (error: any) {
    console.error('[crowdsourcing/export] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// GET - List form fields for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { rows } = await query(
      `SELECT * FROM crowdsource_form_fields 
       WHERE project_id = $1 AND is_active = true
       ORDER BY display_order ASC`,
      [projectId]
    );
    return NextResponse.json({ data: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new form field
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: projectId } = await params;
    const body = await request.json();

    const { rows } = await query(
      `INSERT INTO crowdsource_form_fields 
       (project_id, field_name, field_label, field_type, placeholder, helper_text, 
        options, is_required, min_length, max_length, min_value, max_value, pattern, 
        max_file_size_mb, allowed_formats, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
               COALESCE($16, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM crowdsource_form_fields WHERE project_id = $1)))
       RETURNING *`,
      [
        projectId, body.field_name, body.field_label, body.field_type,
        body.placeholder, body.helper_text, JSON.stringify(body.options || []),
        body.is_required || false, body.min_length, body.max_length,
        body.min_value, body.max_value, body.pattern,
        body.max_file_size_mb || 10, JSON.stringify(body.allowed_formats || []),
        body.display_order
      ]
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update field order (bulk)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fields } = await request.json(); // [{id, display_order}, ...]

    for (const f of fields) {
      await query(
        'UPDATE crowdsource_form_fields SET display_order = $1 WHERE id = $2',
        [f.display_order, f.id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

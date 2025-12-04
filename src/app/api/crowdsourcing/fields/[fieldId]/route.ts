import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';

// PUT - Update a form field
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fieldId } = await params;
    const body = await request.json();

    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const allowedFields = [
      'field_name', 'field_label', 'field_type', 'placeholder', 'helper_text',
      'is_required', 'min_length', 'max_length', 'min_value', 'max_value',
      'pattern', 'display_order', 'is_active', 'max_file_size_mb'
    ];

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates.push(`${key} = $${idx++}`);
        values.push(body[key]);
      }
    }

    // Handle JSON fields
    if (body.options !== undefined) {
      updates.push(`options = $${idx++}`);
      values.push(JSON.stringify(body.options));
    }
    if (body.allowed_formats !== undefined) {
      updates.push(`allowed_formats = $${idx++}`);
      values.push(JSON.stringify(body.allowed_formats));
    }

    if (!updates.length) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(fieldId);

    const { rows } = await query(
      `UPDATE crowdsource_form_fields SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (!rows.length) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    return NextResponse.json({ data: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove a form field
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> }
) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = user.profile?.role || user.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fieldId } = await params;
    await query('DELETE FROM crowdsource_form_fields WHERE id = $1', [fieldId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

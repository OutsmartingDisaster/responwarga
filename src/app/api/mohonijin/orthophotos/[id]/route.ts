import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';
import { unlink } from 'fs/promises';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/mohonijin/orthophotos/[id] - Get orthophoto details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT 
        o.*,
        org.name as organization_name,
        p.full_name as uploaded_by_name
       FROM orthophotos o
       LEFT JOIN organizations org ON org.id = o.organization_id
       LEFT JOIN profiles p ON p.user_id = o.uploaded_by
       WHERE o.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Orthophoto not found' }, { status: 404 });
    }

    // Get processing queue status
    const queueResult = await query(
      `SELECT job_type, status, error_message, created_at, completed_at
       FROM orthophoto_processing_queue
       WHERE orthophoto_id = $1
       ORDER BY created_at DESC`,
      [id]
    );

    return NextResponse.json({
      data: {
        ...result.rows[0],
        processing_jobs: queueResult.rows
      }
    });
  } catch (error: any) {
    console.error('GET /api/mohonijin/orthophotos/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/mohonijin/orthophotos/[id] - Update orthophoto
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const allowedFields = ['name', 'description', 'disaster_type', 'capture_date', 'status', 
                          'visibility', 'is_public', 'bounds_west', 'bounds_east', 'bounds_south', 'bounds_north'];
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE orthophotos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Orthophoto not found' }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (error: any) {
    console.error('PATCH /api/mohonijin/orthophotos/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/mohonijin/orthophotos/[id] - Delete orthophoto
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get file paths before deleting
    const fileResult = await query(
      'SELECT original_file_path, processed_file_path, thumbnail_path FROM orthophotos WHERE id = $1',
      [id]
    );

    if (fileResult.rows.length === 0) {
      return NextResponse.json({ error: 'Orthophoto not found' }, { status: 404 });
    }

    const { original_file_path, processed_file_path, thumbnail_path } = fileResult.rows[0];

    // Delete database record (cascades to processing queue)
    await query('DELETE FROM orthophotos WHERE id = $1', [id]);

    // Try to delete files (don't fail if files don't exist)
    const filesToDelete = [original_file_path, processed_file_path, thumbnail_path].filter(Boolean);
    for (const filePath of filesToDelete) {
      try {
        const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
        await unlink(fullPath);
      } catch (err) {
        console.warn(`Failed to delete file ${filePath}:`, err);
      }
    }

    return NextResponse.json({ message: 'Orthophoto deleted successfully' });
  } catch (error: any) {
    console.error('DELETE /api/mohonijin/orthophotos/[id] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET /api/mohonijin/orthophotos - List orthophotos
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const organizationId = searchParams.get('organizationId');
    const disasterType = searchParams.get('disasterType');

    let sql = `
      SELECT 
        o.*,
        org.name as organization_name,
        p.full_name as uploaded_by_name
      FROM orthophotos o
      LEFT JOIN organizations org ON org.id = o.organization_id
      LEFT JOIN profiles p ON p.user_id = o.uploaded_by
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND o.status = $${paramIndex++}`;
      params.push(status);
    }
    if (organizationId) {
      sql += ` AND o.organization_id = $${paramIndex++}`;
      params.push(organizationId);
    }
    if (disasterType) {
      sql += ` AND o.disaster_type = $${paramIndex++}`;
      params.push(disasterType);
    }

    sql += ' ORDER BY o.created_at DESC';

    const { rows } = await query(sql, params);

    return NextResponse.json({ data: rows });
  } catch (error: any) {
    console.error('GET /api/mohonijin/orthophotos error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/mohonijin/orthophotos - Upload new orthophoto
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const organizationId = formData.get('organization_id') as string | null;
    const disasterType = formData.get('disaster_type') as string | null;
    const captureDate = formData.get('capture_date') as string | null;
    
    // Bounds (optional, can be extracted from file later)
    const boundsWest = formData.get('bounds_west') as string | null;
    const boundsEast = formData.get('bounds_east') as string | null;
    const boundsSouth = formData.get('bounds_south') as string | null;
    const boundsNorth = formData.get('bounds_north') as string | null;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    let originalFilePath = null;
    let fileSize = null;

    // Handle file upload if provided
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Create upload directory
      const uploadDir = path.join(process.cwd(), 'uploads', 'orthophotos');
      await mkdir(uploadDir, { recursive: true });
      
      // Generate unique filename
      const ext = path.extname(file.name);
      const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
      const filePath = path.join(uploadDir, filename);
      
      await writeFile(filePath, buffer);
      originalFilePath = `/uploads/orthophotos/${filename}`;
      fileSize = buffer.length;
    }

    // Insert record
    const result = await query(
      `INSERT INTO orthophotos (
        name, description, organization_id, disaster_type, capture_date,
        original_file_path, file_size_bytes,
        bounds_west, bounds_east, bounds_south, bounds_north,
        uploaded_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        name,
        description || null,
        organizationId || null,
        disasterType || null,
        captureDate || null,
        originalFilePath,
        fileSize,
        boundsWest ? parseFloat(boundsWest) : null,
        boundsEast ? parseFloat(boundsEast) : null,
        boundsSouth ? parseFloat(boundsSouth) : null,
        boundsNorth ? parseFloat(boundsNorth) : null,
        user.id,
        file ? 'pending' : 'ready' // If no file, mark as ready (external reference)
      ]
    );

    // If file uploaded, queue for processing
    if (file) {
      await query(
        `INSERT INTO orthophoto_processing_queue (orthophoto_id, job_type, priority)
         VALUES ($1, 'extract_bounds', 1), ($1, 'generate_thumbnail', 0)`,
        [result.rows[0].id]
      );
    }

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/mohonijin/orthophotos error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

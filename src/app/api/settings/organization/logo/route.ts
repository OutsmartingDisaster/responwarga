import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionFromCookies } from '@/lib/auth/session';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// POST /api/settings/organization/logo - Upload organization logo
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'org_admin' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's organization
    const profileResult = await query(
      'SELECT organization_id FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0 || !profileResult.rows[0].organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 });
    }

    const orgId = profileResult.rows[0].organization_id;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPG, PNG, GIF, or WebP' }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Max 2MB' }, { status: 400 });
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'organizations');
    await mkdir(uploadDir, { recursive: true });

    // Generate filename
    const ext = file.name.split('.').pop();
    const filename = `${orgId}-logo.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    // Update organization logo_url
    const logoUrl = `/uploads/organizations/${filename}`;
    await query(
      'UPDATE organizations SET logo_url = $1, updated_at = NOW() WHERE id = $2',
      [logoUrl, orgId]
    );

    return NextResponse.json({ data: { logo_url: logoUrl } });
  } catch (error: any) {
    console.error('POST /api/settings/organization/logo error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

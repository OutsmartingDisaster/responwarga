import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { isWithinGeofence } from '@/lib/crowdsourcing/geofence';
import { checkRateLimit, getRateLimitKey, RATE_LIMITS } from '@/lib/crowdsourcing/ratelimit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // Rate limiting
    const rateLimitKey = getRateLimitKey(request, projectId);
    const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.submission);
    if (!rateLimit.allowed) {
      return NextResponse.json({ 
        error: `Terlalu banyak pengiriman. Coba lagi dalam ${Math.ceil((rateLimit.retryAfterMs || 0) / 60000)} menit.` 
      }, { status: 429 });
    }

    // Get project
    const { rows: projects } = await query(
      'SELECT * FROM crowdsource_projects WHERE id = $1 AND status = $2',
      [projectId, 'active']
    );

    if (!projects.length) {
      return NextResponse.json({ error: 'Project not found or not active' }, { status: 404 });
    }

    const project = projects[0];
    const formData = await request.formData();

    // Extract form fields
    const media = formData.get('media') as File;
    const mediaType = formData.get('media_type') as string;
    const caption = formData.get('caption') as string;
    const latitude = parseFloat(formData.get('latitude') as string);
    const longitude = parseFloat(formData.get('longitude') as string);
    const address = formData.get('address') as string;
    const addressDetail = formData.get('address_detail') as string;
    const locationUncertain = formData.get('location_uncertain') === 'true';
    const locationLevel = formData.get('location_level') as string || 'exact';
    const submitterName = formData.get('submitter_name') as string || '';
    const submitterEmail = formData.get('submitter_email') as string || '';
    const submitterWhatsapp = formData.get('submitter_whatsapp') as string || '';
    const consentPublishName = formData.get('consent_publish_name') === 'true';

    // Validate required fields
    if (!media || !mediaType || !caption || !latitude || !longitude || !address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Submitter info is now optional
    // Validate email format if provided
    if (submitterEmail && !submitterEmail.includes('@')) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }
    // Validate caption length (longer if location uncertain)
    const minCaptionLength = locationUncertain ? 50 : 20;
    if (caption.length < minCaptionLength) {
      return NextResponse.json({ 
        error: locationUncertain 
          ? 'Lokasi tidak pasti: Deskripsi minimal 50 karakter' 
          : 'Caption must be at least 20 characters' 
      }, { status: 400 });
    }
    
    // Validate location level if uncertain
    if (locationUncertain && locationLevel === 'exact') {
      return NextResponse.json({ error: 'Pilih level lokasi yang diketahui' }, { status: 400 });
    }

    // Validate media type
    if (!['photo', 'video'].includes(mediaType)) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
    }
    if (mediaType === 'photo' && !project.allow_photo) {
      return NextResponse.json({ error: 'Photo not allowed for this project' }, { status: 400 });
    }
    if (mediaType === 'video' && !project.allow_video) {
      return NextResponse.json({ error: 'Video not allowed for this project' }, { status: 400 });
    }

    // Validate file size
    const maxSize = (project.max_file_size_mb || 10) * 1024 * 1024;
    if (media.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Max ${project.max_file_size_mb}MB` 
      }, { status: 400 });
    }

    // Validate geofence
    if (project.require_location) {
      const geofenceCheck = isWithinGeofence(latitude, longitude, project);
      if (!geofenceCheck.valid) {
        return NextResponse.json({ error: geofenceCheck.message }, { status: 400 });
      }
    }

    // Save file
    const uploadDir = path.join(process.cwd(), 'public/uploads/crowdsource', projectId);
    await mkdir(uploadDir, { recursive: true });

    const ext = media.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = path.join(uploadDir, fileName);
    const buffer = Buffer.from(await media.arrayBuffer());
    await writeFile(filePath, buffer);

    const mediaUrl = `/uploads/crowdsource/${projectId}/${fileName}`;

    // Determine initial status
    const status = project.auto_approve ? 'approved' : 'pending';

    // Get device info from headers
    const deviceInfo = {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    };

    // Insert submission with location uncertainty info and consent
    const { rows } = await query(
      `INSERT INTO crowdsource_submissions (
        project_id, submitter_name, submitter_email, submitter_whatsapp,
        media_type, media_url, caption,
        latitude, longitude, address, address_detail,
        location_uncertain, location_level, location_verified,
        consent_publish_name, status, device_info
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [
        projectId, submitterName || null, submitterEmail || null, submitterWhatsapp || null,
        mediaType, mediaUrl, caption,
        latitude, longitude, address, addressDetail || null,
        locationUncertain, locationLevel, false, // location_verified starts as false
        consentPublishName, status, JSON.stringify(deviceInfo)
      ]
    );

    return NextResponse.json({ 
      data: rows[0],
      message: status === 'approved' 
        ? 'Dokumentasi berhasil dikirim dan dipublikasikan'
        : 'Dokumentasi berhasil dikirim dan menunggu verifikasi'
    }, { status: 201 });
  } catch (error: any) {
    console.error('[crowdsourcing/submit] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/mohonijin/orthophotos/[id]/tiles - Queue tile generation
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const minZoom = body.min_zoom || 10;
    const maxZoom = body.max_zoom || 16;

    // Check orthophoto exists and is ready
    const orthoResult = await query(
      'SELECT id, status, bounds_west, bounds_east, bounds_south, bounds_north FROM orthophotos WHERE id = $1',
      [id]
    );

    if (orthoResult.rows.length === 0) {
      return NextResponse.json({ error: 'Orthophoto not found' }, { status: 404 });
    }

    const ortho = orthoResult.rows[0];
    if (ortho.status !== 'ready') {
      return NextResponse.json({ error: 'Orthophoto must be ready before tiling' }, { status: 400 });
    }

    // Check if already queued
    const existingQueue = await query(
      `SELECT id, status FROM tile_generation_queue WHERE orthophoto_id = $1 AND status IN ('pending', 'processing')`,
      [id]
    );

    if (existingQueue.rows.length > 0) {
      return NextResponse.json({ error: 'Tile generation already queued', queue_id: existingQueue.rows[0].id }, { status: 409 });
    }

    // Estimate total tiles (rough calculation)
    const bounds = {
      west: parseFloat(ortho.bounds_west),
      east: parseFloat(ortho.bounds_east),
      south: parseFloat(ortho.bounds_south),
      north: parseFloat(ortho.bounds_north),
    };

    let totalTiles = 0;
    for (let z = minZoom; z <= maxZoom; z++) {
      const n = Math.pow(2, z);
      const xMin = Math.floor((bounds.west + 180) / 360 * n);
      const xMax = Math.floor((bounds.east + 180) / 360 * n);
      const yMin = Math.floor((1 - Math.log(Math.tan(bounds.north * Math.PI / 180) + 1 / Math.cos(bounds.north * Math.PI / 180)) / Math.PI) / 2 * n);
      const yMax = Math.floor((1 - Math.log(Math.tan(bounds.south * Math.PI / 180) + 1 / Math.cos(bounds.south * Math.PI / 180)) / Math.PI) / 2 * n);
      totalTiles += (xMax - xMin + 1) * (yMax - yMin + 1);
    }

    // Queue the job
    const result = await query(
      `INSERT INTO tile_generation_queue (orthophoto_id, min_zoom, max_zoom, total_tiles)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, minZoom, maxZoom, totalTiles]
    );

    return NextResponse.json({
      data: result.rows[0],
      message: 'Tile generation queued. A background worker will process this job.'
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/mohonijin/orthophotos/[id]/tiles error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// GET /api/mohonijin/orthophotos/[id]/tiles - Get tile generation status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get queue status
    const queueResult = await query(
      `SELECT * FROM tile_generation_queue WHERE orthophoto_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );

    // Get tile count
    const tileCount = await query(
      `SELECT COUNT(*) as count, COUNT(DISTINCT z) as zoom_levels FROM orthophoto_tiles WHERE orthophoto_id = $1`,
      [id]
    );

    return NextResponse.json({
      data: {
        queue: queueResult.rows[0] || null,
        tiles: {
          count: parseInt(tileCount.rows[0]?.count || '0'),
          zoom_levels: parseInt(tileCount.rows[0]?.zoom_levels || '0'),
        }
      }
    });
  } catch (error: any) {
    console.error('GET /api/mohonijin/orthophotos/[id]/tiles error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth/session';
import { query } from '@/lib/db/pool';

// Anonymization helpers
function anonymizePhone(phone: string | null): string {
  if (!phone) return '';
  return phone.slice(0, 4) + '****' + phone.slice(-2);
}

function anonymizeName(name: string | null): string {
  if (!name) return '';
  const parts = name.split(' ');
  return parts.map(p => p.charAt(0) + '***').join(' ');
}

// GET /api/org/export - Export org-scoped incidents
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization and verify org_admin role
    const profileResult = await query(
      'SELECT organization_id, role FROM profiles WHERE user_id = $1',
      [user.id]
    );

    if (profileResult.rows.length === 0 || !profileResult.rows[0].organization_id) {
      return NextResponse.json({ error: 'No organization assigned' }, { status: 403 });
    }

    const { organization_id: orgId, role } = profileResult.rows[0];
    if (role !== 'org_admin' && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden - org_admin required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const status = searchParams.get('status');
    const sourceType = searchParams.get('sourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const anonymize = searchParams.get('anonymize') !== 'false';
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000);

    // Build query - always scoped to org
    let sql = `SELECT * FROM incident_events WHERE organization_id = $1`;
    const params: any[] = [orgId];
    let paramIndex = 2;

    if (status) {
      sql += ` AND incident_status = $${paramIndex++}`;
      params.push(status);
    }
    if (sourceType) {
      sql += ` AND source_type = $${paramIndex++}`;
      params.push(sourceType);
    }
    if (startDate) {
      sql += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit);

    const { rows } = await query(sql, params);

    // Apply anonymization
    const processedRows = rows.map(row => {
      if (anonymize) {
        return {
          ...row,
          phone: row.phone ? anonymizePhone(row.phone) : null,
          full_name: row.full_name ? anonymizeName(row.full_name) : null,
        };
      }
      return row;
    });

    // Log export
    await query(
      `INSERT INTO export_history (user_id, organization_id, export_type, format, filters, record_count, anonymized)
       VALUES ($1, $2, 'incidents', $3, $4, $5, $6)`,
      [user.id, orgId, format, JSON.stringify({ status, sourceType, startDate, endDate }), rows.length, anonymize]
    ).catch(err => console.error('Failed to log export:', err));

    // Format response
    if (format === 'csv') {
      const headers = ['id', 'source_type', 'disaster_type', 'assistance_type', 
                       'incident_status', 'latitude', 'longitude', 'location_name', 'created_at'];
      const csvRows = [headers.join(',')];
      
      for (const row of processedRows) {
        csvRows.push(headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(','));
      }

      const filename = `org_incidents_${new Date().toISOString().split('T')[0]}.csv`;
      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    if (format === 'geojson') {
      const features = processedRows
        .filter(row => row.latitude && row.longitude)
        .map(row => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)] },
          properties: {
            id: row.id, source_type: row.source_type, disaster_type: row.disaster_type,
            incident_status: row.incident_status, location_name: row.location_name, created_at: row.created_at
          }
        }));

      const geojson = { type: 'FeatureCollection', features, metadata: { exported_at: new Date().toISOString(), total: features.length, anonymized: anonymize } };
      const filename = `org_incidents_${new Date().toISOString().split('T')[0]}.geojson`;
      return new NextResponse(JSON.stringify(geojson, null, 2), {
        headers: { 'Content-Type': 'application/geo+json', 'Content-Disposition': `attachment; filename="${filename}"` }
      });
    }

    return NextResponse.json({ exported_at: new Date().toISOString(), total: processedRows.length, anonymized: anonymize, data: processedRows });
  } catch (error: any) {
    console.error('GET /api/org/export error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

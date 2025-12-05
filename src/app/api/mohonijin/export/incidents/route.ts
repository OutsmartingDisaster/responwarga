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

function anonymizeEmail(email: string | null): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.***';
  return local.charAt(0) + '***@' + domain.charAt(0) + '***.' + domain.split('.').pop();
}

// GET /api/mohonijin/export/incidents - Export incidents with filters
export async function GET(request: NextRequest) {
  try {
    const user = await getSessionFromCookies(request.cookies);
    if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json'; // json, csv, geojson
    const status = searchParams.get('status'); // open, in_review, resolved
    const sourceType = searchParams.get('sourceType'); // emergency_report, crowdsource_submission
    const disasterType = searchParams.get('disasterType');
    const organizationId = searchParams.get('organizationId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const anonymize = searchParams.get('anonymize') !== 'false'; // Default true
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 10000);

    // Build query
    let sql = `SELECT * FROM incident_events WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND incident_status = $${paramIndex++}`;
      params.push(status);
    }
    if (sourceType) {
      sql += ` AND source_type = $${paramIndex++}`;
      params.push(sourceType);
    }
    if (disasterType) {
      sql += ` AND disaster_type = $${paramIndex++}`;
      params.push(disasterType);
    }
    if (organizationId) {
      sql += ` AND organization_id = $${paramIndex++}`;
      params.push(organizationId);
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

    // Apply anonymization if enabled
    const processedRows = rows.map(row => {
      if (anonymize) {
        return {
          ...row,
          // Anonymize sensitive fields based on source
          phone: row.phone ? anonymizePhone(row.phone) : null,
          full_name: row.full_name ? anonymizeName(row.full_name) : null,
          email: row.email ? anonymizeEmail(row.email) : null,
        };
      }
      return row;
    });

    // Log export
    await query(
      `INSERT INTO export_history (user_id, export_type, format, filters, record_count, anonymized)
       VALUES ($1, 'incidents', $2, $3, $4, $5)`,
      [user.id, format, JSON.stringify({ status, sourceType, disasterType, organizationId, startDate, endDate }), rows.length, anonymize]
    ).catch(err => console.error('Failed to log export:', err));

    // Format response
    if (format === 'csv') {
      const headers = ['id', 'source_type', 'organization_id', 'disaster_type', 'assistance_type', 
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

      const filename = `incidents_export_${new Date().toISOString().split('T')[0]}.csv`;
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
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(row.longitude), parseFloat(row.latitude)]
          },
          properties: {
            id: row.id,
            source_type: row.source_type,
            disaster_type: row.disaster_type,
            assistance_type: row.assistance_type,
            incident_status: row.incident_status,
            location_name: row.location_name,
            created_at: row.created_at
          }
        }));

      const geojson = {
        type: 'FeatureCollection',
        features,
        metadata: {
          exported_at: new Date().toISOString(),
          total: features.length,
          anonymized: anonymize
        }
      };

      const filename = `incidents_export_${new Date().toISOString().split('T')[0]}.geojson`;
      return new NextResponse(JSON.stringify(geojson, null, 2), {
        headers: {
          'Content-Type': 'application/geo+json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }

    // Default JSON format
    return NextResponse.json({
      exported_at: new Date().toISOString(),
      total: processedRows.length,
      anonymized: anonymize,
      filters: { status, sourceType, disasterType, organizationId, startDate, endDate },
      data: processedRows
    });
  } catch (error: any) {
    console.error('GET /api/mohonijin/export/incidents error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}

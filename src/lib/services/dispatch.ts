import { query } from '@/lib/db/pool';
import { DispatchResult } from '@/types/operations';

/**
 * Auto-dispatch a report to the nearest active response operation
 * 
 * @param reportId - ID of the emergency report or contribution
 * @param latitude - Latitude of the report location
 * @param longitude - Longitude of the report location
 * @param reportType - Type of report ('emergency_report' or 'contribution')
 * @returns DispatchResult with dispatch status
 */
export async function dispatchReport(
  reportId: string,
  latitude: number,
  longitude: number,
  reportType: 'emergency_report' | 'contribution' = 'emergency_report'
): Promise<DispatchResult> {
  try {
    // Find active operations within radius using the helper function
    const operationsResult = await query(
      `SELECT * FROM find_operations_within_radius($1, $2)`,
      [latitude, longitude]
    );

    if (operationsResult.rows.length === 0) {
      // No active operations cover this location
      return {
        dispatched: false,
        message: 'No active response operations cover this location'
      };
    }

    // Get the nearest operation (already sorted by distance)
    const nearestOp = operationsResult.rows[0];

    // Update the report with dispatch info
    const tableName = reportType === 'emergency_report' ? 'emergency_reports' : 'contributions';
    
    await query(
      `UPDATE ${tableName} 
       SET dispatched_to = $1, 
           dispatched_at = NOW(), 
           dispatch_status = 'dispatched'
       WHERE id = $2`,
      [nearestOp.organization_id, reportId]
    );

    // Get org admins to notify
    const adminsResult = await query(
      `SELECT user_id FROM profiles 
       WHERE organization_id = $1 AND role = 'org_admin'`,
      [nearestOp.organization_id]
    );

    // Create notifications for org admins
    for (const admin of adminsResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, 'new_report_dispatched', $2, $3, $4, $5)`,
        [
          admin.user_id,
          'Laporan Baru',
          `Laporan warga baru telah di-dispatch ke organisasi Anda`,
          reportType,
          reportId
        ]
      );
    }

    return {
      dispatched: true,
      operation_id: nearestOp.operation_id,
      organization_id: nearestOp.organization_id,
      distance_km: parseFloat(nearestOp.distance_km),
      message: 'Report dispatched successfully'
    };
  } catch (error: any) {
    console.error('Dispatch error:', error);
    return {
      dispatched: false,
      message: `Dispatch failed: ${error.message}`
    };
  }
}

/**
 * Notify super admin about unassigned reports
 * Called when a report cannot be dispatched to any operation
 */
export async function notifySuperAdminUnassigned(
  reportId: string,
  reportType: 'emergency_report' | 'contribution'
): Promise<void> {
  try {
    // Get super admins
    const adminsResult = await query(
      `SELECT user_id FROM profiles WHERE role = 'admin'`
    );

    for (const admin of adminsResult.rows) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, reference_type, reference_id)
         VALUES ($1, 'report_unassigned', $2, $3, $4, $5)`,
        [
          admin.user_id,
          'Laporan Tidak Ter-assign',
          'Ada laporan warga yang tidak ter-cover oleh operasi respon aktif',
          reportType,
          reportId
        ]
      );
    }
  } catch (error) {
    console.error('Failed to notify super admin:', error);
  }
}

/**
 * Process dispatch for a newly created report
 * This should be called after a report is created
 */
export async function processNewReportDispatch(
  reportId: string,
  latitude: number,
  longitude: number,
  reportType: 'emergency_report' | 'contribution' = 'emergency_report'
): Promise<DispatchResult> {
  const result = await dispatchReport(reportId, latitude, longitude, reportType);
  
  if (!result.dispatched) {
    // Notify super admin about unassigned report
    await notifySuperAdminUnassigned(reportId, reportType);
  }
  
  return result;
}

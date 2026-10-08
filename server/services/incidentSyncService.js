const { getPool } = require('../db');
const { queryHosxpAccidentPatients } = require('../hosxpDb');

/**
 * Automatically sync an incident with HOSxP based strictly on incident_date and start_time / end_time.
 * Automatically adds new cases, updates existing cases, and removes cases that no longer fall into the time window.
 * @param {number|string} incidentId
 * @param {object} [io] Socket.io server instance
 * @returns {Promise<{success: boolean, newCount: number, updatedCount: number, deletedCount: number, total: number}>}
 */
async function syncIncidentWithHosxp(incidentId, io = null) {
  if (!incidentId) return { success: false, reason: 'missing_incident_id' };

  try {
    const pool = getPool();
    const [incidents] = await pool.query('SELECT * FROM incidents WHERE id = ?', [incidentId]);
    if (incidents.length === 0) {
      return { success: false, reason: 'incident_not_found' };
    }

    const incident = incidents[0];
    if (incident.is_auto_sync === 0) {
      return { success: false, reason: 'auto_sync_disabled' };
    }

    // Format start and end dates/times for HOSxP filtering
    const startDateFilter = incident.incident_date ? String(incident.incident_date).slice(0, 10) : undefined;
    const endDateFilter = incident.end_date ? String(incident.end_date).slice(0, 10) : undefined;
    const startTimeFilter = incident.start_time ? incident.start_time.trim() : undefined;
    const endTimeFilter = incident.end_time ? incident.end_time.trim() : undefined;

    // Query HOSxP accident patients (er_pt_type = 2) from incident start date & time up to end date & time (or present)
    const hosxpPatients = await queryHosxpAccidentPatients({
      startDate: startDateFilter,
      endDate: endDateFilter,
      startTime: startTimeFilter,
      endTime: endTimeFilter
    });

    if (!Array.isArray(hosxpPatients)) {
      return { success: false, reason: 'hosxp_query_failed' };
    }

    // Build sets of active HOSxP VNs and HNs
    const hosxpVnSet = new Set(hosxpPatients.map((p) => p.vn).filter(Boolean));
    const hosxpHnSet = new Set(hosxpPatients.map((p) => p.hn).filter(Boolean));

    // Fetch existing patients currently stored in this incident
    const [existingPatients] = await pool.query(`
      SELECT id, tag_number, display_order, vn, hn, pt_name, sex, age, triage_level, triage_color, injury_info, current_status
      FROM incident_patients 
      WHERE incident_id = ? 
      ORDER BY display_order ASC, id ASC
    `, [incidentId]);

    let hasChanges = false;
    let newCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    // 1. AUTO-PRUNE: Remove patients that were synced from HOSxP but are no longer in the time window
    const patientsToDelete = existingPatients.filter((p) => {
      if (p.vn && !hosxpVnSet.has(p.vn)) {
        return true;
      }
      return false;
    });

    if (patientsToDelete.length > 0) {
      const deleteIds = patientsToDelete.map((p) => p.id);
      await pool.query('DELETE FROM incident_patients WHERE id IN (?)', [deleteIds]);
      hasChanges = true;
      deletedCount += patientsToDelete.length;
    }

    // Refresh remaining existing patients after pruning
    const existingByVn = new Map();
    const existingByHn = new Map();
    existingPatients
      .filter((p) => !patientsToDelete.some((del) => del.id === p.id))
      .forEach((p) => {
        if (p.vn) existingByVn.set(p.vn, p);
        if (p.hn) existingByHn.set(p.hn, p);
      });

    // 2. INSERT OR UPDATE: Process every patient matching the current HOSxP filter
    for (let i = 0; i < hosxpPatients.length; i++) {
      const hp = hosxpPatients[i];
      const existing = existingByVn.get(hp.vn) || (hp.hn ? existingByHn.get(hp.hn) : null);

      if (existing) {
        // Check if clinical info or names were updated in HOSxP
        const norm = (v) => (v === null || v === undefined ? '' : String(v)).trim();
        const isNameChanged = norm(hp.pt_name) && norm(hp.pt_name) !== norm(existing.pt_name);
        const isTriageChanged = norm(hp.triage_color) && norm(hp.triage_color) !== norm(existing.triage_color);
        const isLevelChanged = norm(hp.triage_level) && norm(hp.triage_level) !== norm(existing.triage_level);
        const isStatusChanged = norm(hp.current_status) && norm(hp.current_status) !== norm(existing.current_status);
        const isInjuryChanged = norm(hp.injury_info) !== norm(existing.injury_info);
        const isTransportChanged = norm(hp.transport) !== norm(existing.transport);
        const isDiagChanged = norm(hp.diag) !== norm(existing.diag);
        const isSexChanged = norm(hp.sex) && norm(hp.sex) !== norm(existing.sex);
        const isAgeChanged = norm(hp.age) && norm(hp.age) !== norm(existing.age);

        if (isNameChanged || isTriageChanged || isLevelChanged || isStatusChanged || isInjuryChanged || isTransportChanged || isDiagChanged || isSexChanged || isAgeChanged) {
          await pool.query(`
            UPDATE incident_patients SET
              pt_name = ?,
              sex = ?,
              age = ?,
              triage_level = ?,
              triage_color = ?,
              injury_info = ?,
              transport = ?,
              diag = ?,
              current_status = ?,
              hn = COALESCE(hn, ?),
              vn = COALESCE(vn, ?)
            WHERE id = ?
          `, [
            hp.pt_name,
            hp.sex,
            hp.age,
            hp.triage_level,
            hp.triage_color,
            hp.injury_info,
            hp.transport || '-',
            hp.diag || '-',
            hp.current_status,
            hp.hn,
            hp.vn,
            existing.id
          ]);
          hasChanges = true;
          updatedCount++;
        }
      } else {
        // Auto-insert new incoming patient
        const tempOrder = existingByVn.size + 1;
        const tempTag = String(tempOrder).padStart(2, '0');

        await pool.query(`
          INSERT INTO incident_patients 
            (incident_id, tag_number, display_order, vn, hn, pt_name, sex, age, triage_level, triage_color, injury_info, transport, diag, current_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          incidentId,
          tempTag,
          tempOrder,
          hp.vn || null,
          hp.hn || null,
          hp.pt_name || 'ไม่ระบุชื่อ',
          hp.sex || 'ไม่ระบุ',
          hp.age || '-',
          hp.triage_level || 'ไม่เร่งด่วน',
          hp.triage_color || 'green',
          hp.injury_info || '',
          hp.transport || '-',
          hp.diag || '-',
          hp.current_status || 'ห้องฉุกเฉิน (ER)'
        ]);

        existingByVn.set(hp.vn, { id: null, vn: hp.vn });
        hasChanges = true;
        newCount++;
      }
    }

    // 3. AUTO RE-SEQUENCE: Keep display_order and numeric tag numbers cleanly ordered (01, 02, 03...)
    const [finalList] = await pool.query(
      'SELECT id, tag_number, display_order FROM incident_patients WHERE incident_id = ? ORDER BY display_order ASC, id ASC',
      [incidentId]
    );

    if (newCount > 0 || deletedCount > 0) {
      for (let i = 0; i < finalList.length; i++) {
        const item = finalList[i];
        const correctOrder = i + 1;
        const defaultTag = String(correctOrder).padStart(2, '0');
        const isNumericOnly = /^\d+$/.test(item.tag_number);
        const correctTag = isNumericOnly ? defaultTag : item.tag_number;

        if (item.display_order !== correctOrder || (isNumericOnly && item.tag_number !== defaultTag)) {
          await pool.query('UPDATE incident_patients SET display_order = ?, tag_number = ? WHERE id = ?', [
            correctOrder,
            correctTag,
            item.id
          ]);
          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      await pool.query('UPDATE incidents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [incidentId]);
      
      console.log(`[Auto-Sync HOSxP] Incident #${incidentId} (${incident.title}) updated: +${newCount} new, ~${updatedCount} updated, -${deletedCount} removed. Total on board: ${finalList.length}`);

      if (io) {
        io.emit('incident_updated', {
          incidentId,
          newCount,
          updatedCount,
          deletedCount,
          total: finalList.length,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      success: true,
      hasChanges,
      newCount,
      updatedCount,
      deletedCount,
      total: finalList.length,
      totalHosxp: hosxpPatients.length
    };
  } catch (error) {
    console.error(`[Auto-Sync HOSxP] Error syncing incident #${incidentId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Sync all active incidents that have is_auto_sync = 1
 * @param {object} [io] 
 */
async function syncAllActiveIncidents(io = null) {
  try {
    const pool = getPool();
    const [activeIncidents] = await pool.query(`
      SELECT id, title, incident_date, start_time, end_time, is_auto_sync 
      FROM incidents 
      WHERE is_active = 1 AND is_auto_sync = 1
    `);

    for (const inc of activeIncidents) {
      await syncIncidentWithHosxp(inc.id, io);
    }
  } catch (error) {
    console.error('[Auto-Sync HOSxP] Error in syncAllActiveIncidents:', error.message);
  }
}

let syncWorkerInterval = null;

/**
 * Start background worker to auto-sync active incidents periodically
 * @param {object} io Socket.io instance
 * @param {number} intervalMs Defaults to 15000 (15 seconds)
 */
function startIncidentAutoSyncWorker(io, intervalMs = 15000) {
  if (syncWorkerInterval) {
    clearInterval(syncWorkerInterval);
  }

  // Initial immediate sync
  setTimeout(() => {
    syncAllActiveIncidents(io);
  }, 2000);

  // Periodic sync
  syncWorkerInterval = setInterval(() => {
    syncAllActiveIncidents(io);
  }, intervalMs);

  console.log(`[Auto-Sync HOSxP Worker] Started. Polling active incidents every ${intervalMs / 1000}s.`);
}

module.exports = {
  syncIncidentWithHosxp,
  syncAllActiveIncidents,
  startIncidentAutoSyncWorker
};

const express = require('express');
const { getPool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { queryHosxpAccidentPatients, mapTriageColor } = require('../hosxpDb');
const { syncIncidentWithHosxp } = require('../services/incidentSyncService');
const { generateIncidentExcelWorkbook } = require('../services/incidentExportService');

const router = express.Router();

/**
 * Helper to compute summary counts for an incident
 */
function calculateIncidentSummary(patients = [], refuseTreatmentCount = 0) {
  let red = 0;
  let yellow = 0;
  let green = 0;
  let black = 0;

  patients.forEach((p) => {
    const col = (p.triage_color || 'green').toLowerCase();
    if (col === 'red') red++;
    else if (col === 'yellow') yellow++;
    else if (col === 'black' || col === 'white') black++;
    else green++;
  });

  const registeredCount = patients.length;
  const refuseCount = parseInt(refuseTreatmentCount) || 0;
  const totalCount = registeredCount + refuseCount;

  return {
    red,
    yellow,
    green,
    black,
    refuse_treatment: refuseCount,
    registered_count: registeredCount,
    total: totalCount
  };
}

// -------------------------------------------------------------
// PUBLIC ENDPOINTS (FOR TV SCREENS & PUBLIC DASHBOARD)
// -------------------------------------------------------------

/**
 * GET /api/incidents/active/display
 * Fetch currently active broadcast incident (or latest active incident)
 */
router.get('/active/display', async (req, res) => {
  try {
    const pool = getPool();
    const [incidents] = await pool.query(`
      SELECT * FROM incidents 
      WHERE is_active = 1 
      ORDER BY updated_at DESC 
      LIMIT 1
    `);

    if (incidents.length === 0) {
      // If no active incident, get the most recent one for reference
      const [latest] = await pool.query(`
        SELECT * FROM incidents 
        ORDER BY incident_date DESC, id DESC 
        LIMIT 1
      `);
      if (latest.length === 0) {
        return res.json({ incident: null, summary: null, patients: [] });
      }
      const inc = latest[0];
      
      // Attempt background auto-sync if enabled
      if (inc.is_auto_sync) {
        await syncIncidentWithHosxp(inc.id, req.io);
      }

      const [patients] = await pool.query(`
        SELECT * FROM incident_patients 
        WHERE incident_id = ? 
        ORDER BY display_order ASC, id ASC
      `, [inc.id]);
      const summary = calculateIncidentSummary(patients, inc.refuse_treatment_count);
      return res.json({ incident: inc, summary, patients });
    }

    const incident = incidents[0];

    // Attempt background auto-sync if enabled
    if (incident.is_auto_sync) {
      await syncIncidentWithHosxp(incident.id, req.io);
    }

    const [patients] = await pool.query(`
      SELECT * FROM incident_patients 
      WHERE incident_id = ? 
      ORDER BY display_order ASC, id ASC
    `, [incident.id]);

    const summary = calculateIncidentSummary(patients, incident.refuse_treatment_count);

    res.json({
      incident,
      summary,
      patients
    });
  } catch (error) {
    console.error('Error fetching active incident for display:', error);
    res.status(500).json({ error: 'Failed to load active incident display' });
  }
});

/**
 * GET /api/incidents/display/:id
 * Fetch specific incident by ID for TV display
 */
router.get('/display/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [incidents] = await pool.query('SELECT * FROM incidents WHERE id = ?', [id]);
    if (incidents.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    const incident = incidents[0];

    // Attempt background auto-sync if enabled
    if (incident.is_auto_sync) {
      await syncIncidentWithHosxp(incident.id, req.io);
    }

    const [patients] = await pool.query(`
      SELECT * FROM incident_patients 
      WHERE incident_id = ? 
      ORDER BY display_order ASC, id ASC
    `, [incident.id]);

    const summary = calculateIncidentSummary(patients, incident.refuse_treatment_count);

    res.json({
      incident,
      summary,
      patients
    });
  } catch (error) {
    console.error('Error fetching incident display:', error);
    res.status(500).json({ error: 'Failed to load incident' });
  }
});

// -------------------------------------------------------------
// ADMIN PROTECTED ENDPOINTS
// -------------------------------------------------------------

/**
 * GET /api/incidents/hosxp
 * Query HOSxP accident patients (er_pt_type=2) for preview/import
 */
router.get('/hosxp', authenticateToken, async (req, res) => {
  const { startDate, endDate, startTime, endTime, search } = req.query;
  try {
    const patients = await queryHosxpAccidentPatients({
      startDate: startDate || new Date().toISOString().slice(0, 10),
      endDate: endDate || startDate || new Date().toISOString().slice(0, 10),
      startTime,
      endTime,
      search
    });

    res.json({
      success: true,
      count: patients.length,
      patients
    });
  } catch (error) {
    console.error('Error querying HOSxP:', error);
    res.status(500).json({ error: 'Failed to query HOSxP database: ' + error.message });
  }
});

/**
 * GET /api/incidents
 * List all incidents
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const [incidents] = await pool.query(`
      SELECT i.*, 
        (SELECT COUNT(*) FROM incident_patients p WHERE p.incident_id = i.id) as patient_count
      FROM incidents i
      ORDER BY i.incident_date DESC, i.id DESC
    `);

    res.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to fetch incidents' });
  }
});

/**
 * POST /api/incidents
 * Create new incident
 */
router.post('/', authenticateToken, async (req, res) => {
  const {
    title,
    location,
    incident_date,
    end_date,
    start_time,
    end_time,
    refuse_treatment_count,
    road_conditions,
    incident_frequency,
    frequency_detail,
    management_actions,
    ems_units,
    notes,
    is_auto_sync
  } = req.body;

  if (!title || !incident_date) {
    return res.status(400).json({ error: 'ชื่อเหตุการณ์ และ วันที่เกิดเหตุ จำเป็นต้องระบุ' });
  }

  try {
    const pool = getPool();
    const roadCondStr = Array.isArray(road_conditions) ? JSON.stringify(road_conditions) : (road_conditions || '[]');
    const mgmtActStr = Array.isArray(management_actions) ? JSON.stringify(management_actions) : (management_actions || '[]');

    const [result] = await pool.query(`
      INSERT INTO incidents (title, location, incident_date, end_date, start_time, end_time, refuse_treatment_count, road_conditions, incident_frequency, frequency_detail, management_actions, ems_units, notes, is_auto_sync)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      title.trim(),
      location ? location.trim() : '',
      incident_date,
      end_date ? String(end_date).slice(0, 10) : null,
      start_time || '',
      end_time || '',
      parseInt(refuse_treatment_count) || 0,
      roadCondStr,
      incident_frequency ? incident_frequency.trim() : '',
      frequency_detail ? frequency_detail.trim() : '',
      mgmtActStr,
      ems_units ? ems_units.trim() : '',
      notes || '',
      is_auto_sync === false || is_auto_sync === 0 ? 0 : 1
    ]);

    const newId = result.insertId;

    // Immediately run auto-sync from HOSxP if enabled
    if (is_auto_sync !== false && is_auto_sync !== 0) {
      await syncIncidentWithHosxp(newId, req.io);
    }

    const [newIncident] = await pool.query('SELECT * FROM incidents WHERE id = ?', [newId]);

    res.status(201).json(newIncident[0]);
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ error: 'Failed to create incident' });
  }
});

/**
 * GET /api/incidents/:id
 * Get incident detail + patients list
 */
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [incidents] = await pool.query('SELECT * FROM incidents WHERE id = ?', [id]);
    if (incidents.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    const incident = incidents[0];

    // Attempt background auto-sync if enabled
    if (incident.is_auto_sync) {
      await syncIncidentWithHosxp(incident.id, req.io);
    }

    const [patients] = await pool.query(`
      SELECT * FROM incident_patients 
      WHERE incident_id = ? 
      ORDER BY display_order ASC, id ASC
    `, [incident.id]);

    const summary = calculateIncidentSummary(patients, incident.refuse_treatment_count);

    res.json({
      incident,
      summary,
      patients
    });
  } catch (error) {
    console.error('Error fetching incident detail:', error);
    res.status(500).json({ error: 'Failed to fetch incident details' });
  }
});

/**
 * PUT /api/incidents/:id
 * Update incident details
 */
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    title,
    location,
    incident_date,
    end_date,
    start_time,
    end_time,
    refuse_treatment_count,
    road_conditions,
    incident_frequency,
    frequency_detail,
    management_actions,
    ems_units,
    notes,
    is_active,
    is_auto_sync
  } = req.body;

  try {
    const pool = getPool();
    const updates = [];
    const params = [];

    if (title !== undefined) { updates.push('title = ?'); params.push(title.trim()); }
    if (location !== undefined) { updates.push('location = ?'); params.push(location.trim()); }
    if (incident_date !== undefined) { updates.push('incident_date = ?'); params.push(incident_date); }
    if (end_date !== undefined) { updates.push('end_date = ?'); params.push(end_date ? String(end_date).slice(0, 10) : null); }
    if (start_time !== undefined) { updates.push('start_time = ?'); params.push(start_time); }
    if (end_time !== undefined) { updates.push('end_time = ?'); params.push(end_time); }
    if (refuse_treatment_count !== undefined) { updates.push('refuse_treatment_count = ?'); params.push(parseInt(refuse_treatment_count) || 0); }
    if (road_conditions !== undefined) {
      updates.push('road_conditions = ?');
      params.push(Array.isArray(road_conditions) ? JSON.stringify(road_conditions) : (road_conditions || '[]'));
    }
    if (incident_frequency !== undefined) { updates.push('incident_frequency = ?'); params.push(incident_frequency ? incident_frequency.trim() : ''); }
    if (frequency_detail !== undefined) { updates.push('frequency_detail = ?'); params.push(frequency_detail ? frequency_detail.trim() : ''); }
    if (management_actions !== undefined) {
      updates.push('management_actions = ?');
      params.push(Array.isArray(management_actions) ? JSON.stringify(management_actions) : (management_actions || '[]'));
    }
    if (ems_units !== undefined) { updates.push('ems_units = ?'); params.push(ems_units ? ems_units.trim() : ''); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (is_auto_sync !== undefined) { updates.push('is_auto_sync = ?'); params.push(is_auto_sync ? 1 : 0); }

    if (updates.length > 0) {
      params.push(id);
      await pool.query(`UPDATE incidents SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Trigger auto-sync if enabled
    if (is_auto_sync !== 0) {
      await syncIncidentWithHosxp(id, req.io);
    }

    const [updated] = await pool.query('SELECT * FROM incidents WHERE id = ?', [id]);

    // Real-time broadcast notification
    if (req.io) {
      req.io.emit('incident_updated', { incidentId: id });
    }

    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Failed to update incident' });
  }
});

/**
 * POST /api/incidents/:id/auto-sync
 * Manually trigger immediate auto-sync with HOSxP
 */
router.post('/:id/auto-sync', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await syncIncidentWithHosxp(id, req.io);
    res.json(result);
  } catch (error) {
    console.error('Error in manual auto-sync:', error);
    res.status(500).json({ error: 'Failed to sync with HOSxP: ' + error.message });
  }
});

/**
 * DELETE /api/incidents/:id
 * Delete incident
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    // Also clear tvs override pointing to this incident
    await pool.query('UPDATE tvs SET is_incident_override = 0, active_incident_id = NULL WHERE active_incident_id = ?', [id]);
    await pool.query('DELETE FROM incidents WHERE id = ?', [id]);

    if (req.io) {
      req.io.emit('incident_updated', { incidentId: id });
      req.io.emit('tv_config_changed', {});
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({ error: 'Failed to delete incident' });
  }
});

/**
 * POST /api/incidents/:id/sync-hosxp
 * Import / Sync selected patients from HOSxP into this incident
 */
router.post('/:id/sync-hosxp', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { selectedVns, autoTagPrefix } = req.body;

  if (!Array.isArray(selectedVns) || selectedVns.length === 0) {
    return res.status(400).json({ error: 'กรุณาเลือกรายชื่อผู้ป่วยจาก HOSxP อย่างน้อย 1 รายการ' });
  }

  try {
    const pool = getPool();
    const [incidents] = await pool.query('SELECT * FROM incidents WHERE id = ?', [id]);
    if (incidents.length === 0) return res.status(404).json({ error: 'Incident not found' });
    const incident = incidents[0];

    // Fetch details for these VNs from HOSxP
    const hosxpPatients = await queryHosxpAccidentPatients({
      startDate: incident.incident_date ? String(incident.incident_date).slice(0, 10) : undefined,
      endDate: incident.end_date ? String(incident.end_date).slice(0, 10) : (incident.incident_date ? String(incident.incident_date).slice(0, 10) : undefined),
      startTime: incident.start_time,
      endTime: incident.end_time
    });

    const selectedMap = new Map();
    hosxpPatients.forEach((p) => {
      if (selectedVns.includes(p.vn)) {
        selectedMap.set(p.vn, p);
      }
    });

    // Get current max display_order and tag count in this incident
    const [existingPatients] = await pool.query(
      'SELECT tag_number, display_order, vn FROM incident_patients WHERE incident_id = ? ORDER BY display_order ASC',
      [id]
    );

    let nextOrder = existingPatients.length > 0 ? Math.max(...existingPatients.map(p => p.display_order || 0)) + 1 : 1;
    let tagCounter = existingPatients.length + 1;
    const existingVnSet = new Set(existingPatients.map(p => p.vn).filter(Boolean));

    const prefix = autoTagPrefix || '';

    for (const vn of selectedVns) {
      const pData = selectedMap.get(vn);
      if (!pData) continue;

      if (existingVnSet.has(vn)) {
        // Update existing record with fresh data from HOSxP
        await pool.query(`
          UPDATE incident_patients SET 
            hn = ?, pt_name = ?, sex = ?, age = ?, triage_level = ?, triage_color = ?, 
            injury_info = ?, current_status = ?
          WHERE incident_id = ? AND vn = ?
        `, [
          pData.hn,
          pData.pt_name,
          pData.sex,
          pData.age,
          pData.triage_level,
          pData.triage_color,
          pData.injury_info,
          pData.current_status,
          id,
          vn
        ]);
      } else {
        // Insert new patient with generated tag number (e.g. 01, 02)
        const tagNum = prefix ? `${prefix}${tagCounter}` : String(tagCounter).padStart(2, '0');
        tagCounter++;

        await pool.query(`
          INSERT INTO incident_patients 
            (incident_id, tag_number, display_order, vn, hn, pt_name, sex, age, triage_level, triage_color, injury_info, current_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          tagNum,
          nextOrder++,
          pData.vn,
          pData.hn,
          pData.pt_name,
          pData.sex,
          pData.age,
          pData.triage_level,
          pData.triage_color,
          pData.injury_info,
          pData.current_status
        ]);
      }
    }

    if (req.io) {
      req.io.emit('incident_updated', { incidentId: id });
    }

    res.json({ success: true, imported: selectedVns.length });
  } catch (error) {
    console.error('Error syncing HOSxP patients:', error);
    res.status(500).json({ error: 'Failed to sync HOSxP patients: ' + error.message });
  }
});

/**
 * POST /api/incidents/:id/patients
 * Manually add a patient (e.g. unregistered wristband victim)
 */
router.post('/:id/patients', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { tag_number, vn, hn, pt_name, sex, age, triage_level, triage_color, injury_info, current_status, notes } = req.body;

  if (!tag_number && !pt_name) {
    return res.status(400).json({ error: 'ต้องระบุหมายเลขสายรัด หรือ ชื่อ-สกุล' });
  }

  try {
    const pool = getPool();
    const [existing] = await pool.query('SELECT display_order FROM incident_patients WHERE incident_id = ? ORDER BY display_order DESC LIMIT 1', [id]);
    const nextOrder = existing.length > 0 ? (existing[0].display_order || 0) + 1 : 1;

    const [result] = await pool.query(`
      INSERT INTO incident_patients 
        (incident_id, tag_number, display_order, vn, hn, pt_name, sex, age, triage_level, triage_color, injury_info, current_status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      tag_number ? tag_number.trim() : String(nextOrder).padStart(2, '0'),
      nextOrder,
      vn || null,
      hn || null,
      pt_name ? pt_name.trim() : 'ไม่ระบุชื่อ',
      sex || 'ไม่ระบุ',
      age || '-',
      triage_level || 'เขียว',
      triage_color || 'green',
      injury_info || '',
      current_status || 'ห้องฉุกเฉิน (ER)',
      notes || ''
    ]);

    if (req.io) {
      req.io.emit('incident_updated', { incidentId: id });
    }

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    console.error('Error adding patient:', error);
    res.status(500).json({ error: 'Failed to add patient' });
  }
});

/**
 * PUT /api/incidents/:id/patients/:patientId
 * Update patient details
 */
router.put('/:id/patients/:patientId', authenticateToken, async (req, res) => {
  const { id, patientId } = req.params;
  const { tag_number, vn, hn, pt_name, sex, age, triage_level, triage_color, injury_info, current_status, notes, display_order } = req.body;

  try {
    const pool = getPool();
    const updates = [];
    const params = [];

    if (tag_number !== undefined) { updates.push('tag_number = ?'); params.push(tag_number.trim()); }
    if (vn !== undefined) { updates.push('vn = ?'); params.push(vn || null); }
    if (hn !== undefined) { updates.push('hn = ?'); params.push(hn || null); }
    if (pt_name !== undefined) { updates.push('pt_name = ?'); params.push(pt_name.trim()); }
    if (sex !== undefined) { updates.push('sex = ?'); params.push(sex); }
    if (age !== undefined) { updates.push('age = ?'); params.push(age); }
    if (triage_level !== undefined) { updates.push('triage_level = ?'); params.push(triage_level); }
    if (triage_color !== undefined) { updates.push('triage_color = ?'); params.push(triage_color); }
    if (injury_info !== undefined) { updates.push('injury_info = ?'); params.push(injury_info); }
    if (current_status !== undefined) { updates.push('current_status = ?'); params.push(current_status); }
    if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
    if (display_order !== undefined) { updates.push('display_order = ?'); params.push(parseInt(display_order) || 0); }

    if (updates.length > 0) {
      params.push(patientId, id);
      await pool.query(`UPDATE incident_patients SET ${updates.join(', ')} WHERE id = ? AND incident_id = ?`, params);
    }

    if (req.io) {
      req.io.emit('incident_updated', { incidentId: id });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

/**
 * DELETE /api/incidents/:id/patients/:patientId
 * Delete patient
 */
router.delete('/:id/patients/:patientId', authenticateToken, async (req, res) => {
  const { id, patientId } = req.params;
  try {
    const pool = getPool();
    await pool.query('DELETE FROM incident_patients WHERE id = ? AND incident_id = ?', [patientId, id]);

    if (req.io) {
      req.io.emit('incident_updated', { incidentId: id });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

/**
 * POST /api/incidents/:id/broadcast
 * Broadcast incident to selected TVs or Stop Broadcast
 * body: { active: boolean, tvIds: number[] }
 */
router.post('/:id/broadcast', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { active, tvIds } = req.body;

  try {
    const pool = getPool();
    const isActive = active ? 1 : 0;
    const selectedTvIds = Array.isArray(tvIds) ? tvIds : [];

    // 1. Update incident active status and list of broadcast TVs
    await pool.query('UPDATE incidents SET is_active = ?, broadcast_tvs = ? WHERE id = ?', [
      isActive,
      JSON.stringify(selectedTvIds),
      id
    ]);

    // 2. Clear old broadcast overrides for this incident
    await pool.query('UPDATE tvs SET is_incident_override = 0, active_incident_id = NULL WHERE active_incident_id = ?', [id]);

    // 3. If active, assign override to selected TVs
    if (isActive && selectedTvIds.length > 0) {
      const placeholders = selectedTvIds.map(() => '?').join(',');
      await pool.query(
        `UPDATE tvs SET is_incident_override = 1, active_incident_id = ? WHERE id IN (${placeholders})`,
        [id, ...selectedTvIds]
      );
    }

    // 4. Notify all TV clients and admin consoles
    if (req.io) {
      req.io.emit('tv_config_changed', {});
      req.io.emit('incident_updated', { incidentId: id, is_active: isActive });
      req.io.emit('incident_broadcast_toggled', { incidentId: id, is_active: isActive, tvIds: selectedTvIds });
    }

    res.json({ success: true, is_active: isActive, broadcast_tvs: selectedTvIds });
  } catch (error) {
    console.error('Error setting incident broadcast:', error);
    res.status(500).json({ error: 'Failed to broadcast incident' });
  }
});

/**
 * GET /api/incidents/:id/export/excel
 * Export incident report as formatted Excel (.xlsx) file matching the official template
 */
router.get('/:id/export/excel', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    const [incidents] = await pool.query('SELECT * FROM incidents WHERE id = ?', [id]);
    if (incidents.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    const incident = incidents[0];

    const [patients] = await pool.query(`
      SELECT * FROM incident_patients 
      WHERE incident_id = ? 
      ORDER BY display_order ASC, id ASC
    `, [incident.id]);

    const summary = calculateIncidentSummary(patients, incident.refuse_treatment_count);

    const workbook = await generateIncidentExcelWorkbook(incident, summary, patients);

    const safeTitle = (incident.title || 'MCI_Report').replace(/[/\\?%*:|"<>]/g, '_');
    const dateStr = incident.incident_date ? String(incident.incident_date).slice(0, 10) : '';
    const filename = encodeURIComponent(`รายงานอุบัติเหตุหมู่_${safeTitle}_${dateStr}.xlsx`);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting incident Excel:', error);
    res.status(500).json({ error: 'Failed to generate Excel report: ' + error.message });
  }
});

module.exports = router;

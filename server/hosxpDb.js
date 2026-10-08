const mysql = require('mysql2/promise');
require('dotenv').config();

const hosxpConfig = {
  host: process.env.HOSXP_DB_HOST || '192.168.1.4',
  port: parseInt(process.env.HOSXP_DB_PORT || '3306'),
  user: process.env.HOSXP_DB_USER || 'guest',
  password: process.env.HOSXP_DB_PASSWORD || 'guest',
  database: process.env.HOSXP_DB_NAME || 'hos',
  charset: 'utf8mb4',
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  connectTimeout: 10000
};

let hosxpPool = null;

function getHosxpPool() {
  if (!hosxpPool) {
    hosxpPool = mysql.createPool(hosxpConfig);
    hosxpPool.on('connection', (conn) => {
      conn.query("SET NAMES 'utf8mb4'");
    });
  }
  return hosxpPool;
}

/**
 * Map emergency level / triage level name to standard color
 * @param {string} triageName
 * @returns {'red'|'yellow'|'green'|'black'|'white'}
 */
function mapTriageColor(triageName, dead) {
  if (dead && (dead.includes('เสียชีวิต') || dead.includes('ตาย'))) {
    return 'black';
  }
  if (!triageName) return 'green';
  const lower = triageName.toLowerCase();
  if (lower.includes('แดง') || lower.includes('resuscitate') || lower.includes('emergency') || lower.includes('วิกฤต')) {
    return 'red';
  }
  if (lower.includes('เหลือง') || lower.includes('urgency') || lower.includes('เร่งด่วน')) {
    return 'yellow';
  }
  if (lower.includes('เขียว') || lower.includes('semi') || lower.includes('non') || lower.includes('ไม่เร่งด่วน')) {
    return 'green';
  }
  if (lower.includes('ขาว') || lower.includes('ดำ') || lower.includes('dead')) {
    return 'black';
  }
  return 'green';
}

/**
 * Query accident patients from HOSxP
 * @param {Object} params
 * @param {string} params.startDate YYYY-MM-DD
 * @param {string} params.endDate YYYY-MM-DD
 * @param {string} [params.startTime] HH:mm:ss
 * @param {string} [params.endTime] HH:mm:ss
 * @param {string} [params.search] Keyword to search name / hn / vn
 */
async function queryHosxpAccidentPatients({ startDate, endDate, startTime, endTime, search }) {
  const pool = getHosxpPool();

  const conditions = [
    'e.er_pt_type = 2' // อุบัติเหตุ
  ];
  const params = [];

  // Start Date & Time filtering
  const sDate = startDate || new Date().toISOString().slice(0, 10);
  let sTime = startTime && startTime.trim() ? startTime.trim() : '00:00:00';
  if (sTime.length === 5) sTime = `${sTime}:00`;
  const startDateTime = `${sDate} ${sTime}`;

  conditions.push("TIMESTAMP(e.vstdate, COALESCE(o.vsttime, '00:00:00')) >= ?");
  params.push(startDateTime);

  // End Date & Time filtering (if specified, otherwise pulls up to present)
  if (endDate && endTime && endTime.trim()) {
    let eTime = endTime.trim();
    if (eTime.length === 5) eTime = `${eTime}:59`;
    const eDate = String(endDate).slice(0, 10);
    conditions.push("TIMESTAMP(e.vstdate, COALESCE(o.vsttime, '00:00:00')) <= ?");
    params.push(`${eDate} ${eTime}`);
  } else if (endDate) {
    const eDate = String(endDate).slice(0, 10);
    conditions.push("TIMESTAMP(e.vstdate, COALESCE(o.vsttime, '00:00:00')) <= ?");
    params.push(`${eDate} 23:59:59`);
  } else if (endTime && endTime.trim()) {
    let eTime = endTime.trim();
    if (eTime.length === 5) eTime = `${eTime}:59`;
    conditions.push("TIMESTAMP(e.vstdate, COALESCE(o.vsttime, '00:00:00')) <= ?");
    params.push(`${sDate} ${eTime}`);
  }

  if (search && search.trim()) {
    conditions.push('(o.hn LIKE ? OR e.vn LIKE ? OR p.fname LIKE ? OR p.lname LIKE ?)');
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term);
  }

  const sql = `
SELECT
    e.vn,
    o.hn,
    o.vsttime,
    e.vstdate,
    CASE
        WHEN p.sex = '1' THEN 'ชาย'
        WHEN p.sex = '2' THEN 'หญิง'
        ELSE 'ไม่ระบุ'
    END AS sex,
    CONCAT(
        COALESCE(p.pname, ''),
        COALESCE(p.fname, ''),
        ' ',
        COALESCE(p.lname, '')
    ) AS pt_name,
    TIMESTAMPDIFF(
        YEAR,
        p.birthday,
        e.vstdate
    ) AS age,
    COALESCE(el.er_emergency_level_name, 'ไม่ระบุ') AS triage_level,
    COALESCE(att.accident_transport_type_name, '-') AS transport,
    COALESCE(n.support_information, '') AS injury_info,
    CONCAT_WS(
        ', ',
        CASE
            WHEN n.accident_dead_before_arrive = 'Y'
            THEN 'เสียชีวิตก่อนถึง รพ.'
        END,
        CASE
            WHEN n.accident_dead_in_hospital = 'Y'
            THEN 'เสียชีวิตใน รพ.'
        END
    ) AS dead,
    COALESCE(
        GROUP_CONCAT(
            DISTINCT CONCAT(
                d.icd10,
                ' ',
                COALESCE(i.name, '')
            )
            ORDER BY d.diag_no
            SEPARATOR ', '
        ),
        ''
    ) AS diag,
    COALESCE(dt.name, 'ห้องฉุกเฉิน') AS er_status,
    CASE
        WHEN dt.name = 'ส่งต่อสถานพยาบาลอื่น'
        THEN COALESCE(h.name, 'ส่งต่อสถานพยาบาลอื่น')
        ELSE '-'
    END AS refer_to
FROM er_regist e
LEFT JOIN ovst o
    ON o.vn = e.vn
LEFT JOIN patient p
    ON p.hn = o.hn
LEFT JOIN er_nursing_detail n
    ON n.vn = e.vn
LEFT JOIN er_emergency_level el
    ON el.er_emergency_level_id = e.er_emergency_level_id
LEFT JOIN accident_transport_type att
    ON att.accident_transport_type_id = n.accident_transport_type_id
LEFT JOIN ovstdiag d
    ON d.vn = e.vn
    AND d.icd10 LIKE 'S%'
LEFT JOIN icd101 i
    ON i.code = d.icd10
LEFT JOIN er_dch_type dt
    ON dt.er_dch_type = e.er_dch_type
LEFT JOIN (
    SELECT
        vn,
        MAX(refer_hospcode) AS hospcode
    FROM referout
    GROUP BY vn
) r
    ON r.vn = e.vn
LEFT JOIN hospcode h
    ON h.hospcode = r.hospcode
WHERE ${conditions.join(' AND ')}
GROUP BY
    e.vn,
    o.hn,
    o.vsttime,
    e.vstdate,
    p.sex,
    p.pname,
    p.fname,
    p.lname,
    p.birthday,
    el.er_emergency_level_name,
    att.accident_transport_type_name,
    n.support_information,
    n.accident_in_province,
    n.accident_admit,
    n.accident_dead_before_arrive,
    n.accident_dead_in_hospital,
    dt.name,
    h.name
ORDER BY
    e.vstdate ASC,
    o.vsttime ASC,
    e.vn ASC;
  `;

  const [rows] = await pool.query(sql, params);

  // Format rows with calculated triage_color and current_status
  return rows.map((row) => {
    const triageColor = mapTriageColor(row.triage_level, row.dead);
    
    // Determine combined injury / diag text
    const injuryParts = [];
    if (row.injury_info && row.injury_info.trim()) {
      injuryParts.push(row.injury_info.trim());
    }
    if (row.diag && row.diag.trim() && row.diag !== 'ไม่พบการวินิจฉัย S') {
      injuryParts.push(row.diag.trim());
    }
    if (injuryParts.length === 0 && row.transport && row.transport !== '-') {
      injuryParts.push(`พาหนะ: ${row.transport}`);
    }

    // Determine current status
    let currentStatus = 'ห้องฉุกเฉิน (ER)';
    if (row.dead && row.dead.trim()) {
      currentStatus = row.dead.trim();
    } else if (row.refer_to && row.refer_to !== '-') {
      currentStatus = `ส่งต่อ: ${row.refer_to}`;
    } else if (row.er_status && row.er_status.trim() && row.er_status !== 'ห้องฉุกเฉิน') {
      currentStatus = row.er_status.trim();
    }

    return {
      vn: row.vn,
      hn: row.hn,
      vstdate: row.vstdate,
      vsttime: row.vsttime,
      pt_name: row.pt_name ? row.pt_name.trim() : 'ไม่ระบุชื่อ',
      sex: row.sex || 'ไม่ระบุ',
      age: row.age !== null && row.age !== undefined ? String(row.age) : '-',
      triage_level: row.triage_level,
      triage_color: triageColor,
      transport: row.transport && row.transport !== '-' ? row.transport : '-',
      diag: row.diag && row.diag.trim() ? row.diag : (row.injury_info && row.injury_info.trim() ? row.injury_info : '-'),
      injury_info: injuryParts.join(' / ') || 'อุบัติเหตุ',
      current_status: currentStatus,
      raw_status: row.er_status,
      dead: row.dead,
      dead_before_arrive: row.accident_dead_before_arrive === 'Y',
      dead_in_hospital: row.accident_dead_in_hospital === 'Y',
      accident_admit: row.accident_admit === 'Y',
      refer_to: row.refer_to
    };
  });
}

module.exports = {
  getHosxpPool,
  queryHosxpAccidentPatients,
  mapTriageColor
};

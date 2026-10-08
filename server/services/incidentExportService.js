const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

/**
 * Format Date to Thai String
 */
function formatThaiDateLong(dateStr) {
  if (!dateStr) return '-';
  try {
    const parts = String(dateStr).slice(0, 10).split('-');
    if (parts.length === 3) {
      const d = parseInt(parts[2], 10);
      const m = parseInt(parts[1], 10) - 1;
      const yBE = parseInt(parts[0], 10) + 543;
      const monthNames = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
      ];
      return `${d} ${monthNames[m] || ''} ${yBE}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Format Timeframe text for incident
 */
function buildTimeframeText(incident) {
  const sDate = incident.incident_date ? String(incident.incident_date).slice(0, 10) : '';
  const eDate = incident.end_date ? String(incident.end_date).slice(0, 10) : '';
  const sTime = incident.start_time ? `${incident.start_time} น.` : '';
  const eTime = incident.end_time ? `${incident.end_time} น.` : '';

  if (eDate && eDate !== sDate) {
    return `${formatThaiDateLong(sDate)} ${sTime} ถึง ${formatThaiDateLong(eDate)} ${eTime || ''}`.trim();
  }
  if (eTime) {
    return `${formatThaiDateLong(sDate)} เวลา ${sTime} ถึง ${eTime}`.trim();
  }
  return `${formatThaiDateLong(sDate)} เวลา ${sTime} (ดึงสดถึงปัจจุบัน)`.trim();
}

/**
 * Generate Excel Workbook for Mass Casualty Incident Report
 * @param {Object} incident
 * @param {Object} summary
 * @param {Array} patients
 * @returns {Promise<ExcelJS.Workbook>}
 */
async function generateIncidentExcelWorkbook(incident, summary, patients = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'โรงพยาบาลเถิน จ.ลำปาง';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('รายงานอุบัติเหตุหมู่', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2
      }
    }
  });

  // Column definitions with proper widths
  sheet.columns = [
    { key: 'colA', width: 7 },  // ลำดับ
    { key: 'colB', width: 28 }, // ชื่อสกุล
    { key: 'colC', width: 9 },  // อายุ (ปี)
    { key: 'colD', width: 16 }, // Triage Sieve
    { key: 'colE', width: 18 }, // พาหนะผู้บาดเจ็บ
    { key: 'colF', width: 30 }, // วินิจฉัยเบื้องต้น
    { key: 'colG', width: 8 },  // D/C
    { key: 'colH', width: 8 },  // Admit
    { key: 'colI', width: 22 }, // Refer (ระบุ รพ.)
    { key: 'colJ', width: 12 }, // Dead จุดเกิดเหตุ
    { key: 'colK', width: 12 }, // Dead ระหว่างนำส่ง
    { key: 'colL', width: 12 }  // Dead ใน รพ.
  ];

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FF333333' } },
    left: { style: 'thin', color: { argb: 'FF333333' } },
    bottom: { style: 'thin', color: { argb: 'FF333333' } },
    right: { style: 'thin', color: { argb: 'FF333333' } }
  };

  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF2F4F7' }
  };

  // Embed Logo in Top Center
  const logoPath = path.join(__dirname, '../../public/logo.jpg');
  if (fs.existsSync(logoPath)) {
    const imageId = workbook.addImage({
      filename: logoPath,
      extension: 'jpeg'
    });
    sheet.addImage(imageId, {
      tl: { col: 5.2, row: 0.15 },
      ext: { width: 68, height: 68 }
    });
  }

  // Helper to parse road conditions and management actions
  let roadConds = [];
  try {
    roadConds = typeof incident.road_conditions === 'string'
      ? (incident.road_conditions.startsWith('[') ? JSON.parse(incident.road_conditions) : incident.road_conditions.split(',').map(s => s.trim()))
      : (Array.isArray(incident.road_conditions) ? incident.road_conditions : []);
  } catch (e) {
    roadConds = [];
  }

  let mgmtActions = [];
  try {
    mgmtActions = typeof incident.management_actions === 'string'
      ? (incident.management_actions.startsWith('[') ? JSON.parse(incident.management_actions) : incident.management_actions.split(',').map(s => s.trim()))
      : (Array.isArray(incident.management_actions) ? incident.management_actions : []);
  } catch (e) {
    mgmtActions = [];
  }

  const allRoadTypes = ['ทางตรง', 'ทางโค้ง', 'ทางแยก', 'ตัดหน้ากระชั้นชิด', 'ผิวทางชำรุด', 'ลงเขา', 'ฝนตก', 'ถนนลื่น'];
  const roadStr = allRoadTypes.map(rt => `[${roadConds.includes(rt) ? '✓' : ' '}] ${rt}`).join('   ');

  const allMgmtTypes = ['ใช้แผนอุบัติเหตุหมู่', 'รายงานศูนย์รับแจ้งเหตุ', 'รายงาน สสจ.', 'รายงาน สพฉ.(ศูนย์นเรนทร)'];
  const mgmtStr = allMgmtTypes.map(mt => `[${mgmtActions.includes(mt) ? '✓' : ' '}] ${mt}`).join('   ');

  // ROWS 1-3: Reserved for Logo
  sheet.getRow(1).height = 20;
  sheet.getRow(2).height = 20;
  sheet.getRow(3).height = 16;

  // 4. TITLE
  sheet.mergeCells('A4:L4');
  const r4 = sheet.getCell('A4');
  r4.value = 'แบบรายงานอุบัติเหตุหมู่/สาธารณภัย ในโรงพยาบาลเถิน จังหวัดลำปาง';
  r4.font = { name: 'Sarabun', size: 14, bold: true, color: { argb: 'FF111827' } };
  r4.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(4).height = 24;

  // 5. HOSPITAL & CONTACT INFO (BEFORE INCIDENT DATE)
  sheet.mergeCells('A5:L5');
  const r5 = sheet.getCell('A5');
  r5.value = 'โรงพยาบาลเถิน จังหวัดลำปาง โทรศัพท์ 054292275';
  r5.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FF374151' } };
  r5.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(5).height = 20;

  // 6. INCIDENT & TIMEFRAME
  sheet.mergeCells('A6:L6');
  const r6 = sheet.getCell('A6');
  r6.value = `เหตุการณ์:  ${incident.title || '-'}        วัน-เวลาที่เกิดเหตุ:  ${buildTimeframeText(incident)}`;
  r6.font = { name: 'Sarabun', size: 11, bold: true, color: { argb: 'FF1F2937' } };
  r6.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(6).height = 22;

  // 7. LOCATION
  sheet.mergeCells('A7:L7');
  const r7 = sheet.getCell('A7');
  r7.value = `สถานที่เกิดเหตุ (ถนน, ตำบล, อำเภอ, จังหวัด)(รายละเอียด):  ${incident.location || '-'}`;
  r7.font = { name: 'Sarabun', size: 10.5, color: { argb: 'FF374151' } };
  r7.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(7).height = 22;

  // 8. ROAD CONDITIONS (CHECKBOXES)
  sheet.mergeCells('A8:L8');
  const r8 = sheet.getCell('A8');
  r8.value = `บริเวณที่เกิดเหตุ(อุบัติเหตุจราจร):  ${roadStr}`;
  r8.font = { name: 'Sarabun', size: 10, color: { argb: 'FF374151' } };
  r8.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(8).height = 22;

  // 9. MANAGEMENT ACTIONS (CHECKBOXES)
  sheet.mergeCells('A9:L9');
  const r9 = sheet.getCell('A9');
  r9.value = `การจัดการ:  ${mgmtStr}`;
  r9.font = { name: 'Sarabun', size: 10, color: { argb: 'FF374151' } };
  r9.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(9).height = 22;

  // 10. EMS UNITS
  sheet.mergeCells('A10:L10');
  const r10 = sheet.getCell('A10');
  r10.value = `ชุดปฎิบัติการฉุกเฉินที่ออกปฏิบัติการ:  ${incident.ems_units || '-'}`;
  r10.font = { name: 'Sarabun', size: 10.5, color: { argb: 'FF374151' } };
  r10.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(10).height = 22;

  // 11. SECTION HEADER
  sheet.mergeCells('A11:L11');
  const r11 = sheet.getCell('A11');
  r11.value = 'ข้อมูลผู้บาดเจ็บ';
  r11.font = { name: 'Sarabun', size: 11.5, bold: true, color: { argb: 'FF111827' } };
  r11.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(11).height = 22;

  // 12. TABLE HEADER ROW 1 (Row 12 in Excel: Result of treatment group header)
  sheet.mergeCells('G12:L12');
  const r12_G = sheet.getCell('G12');
  r12_G.value = 'ผลการรักษา';
  r12_G.font = { name: 'Sarabun', size: 10.5, bold: true };
  r12_G.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(12).height = 20;

  // 13. TABLE HEADER ROW 2 (Row 13 in Excel)
  sheet.mergeCells('A13:A14');
  sheet.getCell('A13').value = 'ลำดับ';

  sheet.mergeCells('B13:B14');
  sheet.getCell('B13').value = 'ชื่อสกุล';

  sheet.mergeCells('C13:C14');
  sheet.getCell('C13').value = 'อายุ (ปี)';

  sheet.mergeCells('D13:D14');
  sheet.getCell('D13').value = 'Triage Sieve';

  sheet.mergeCells('E13:E14');
  sheet.getCell('E13').value = 'พาหนะผู้บาดเจ็บ';

  sheet.mergeCells('F13:F14');
  sheet.getCell('F13').value = 'วินิจฉัยเบื้องต้น';

  sheet.mergeCells('G13:G14');
  sheet.getCell('G13').value = 'D/C';

  sheet.mergeCells('H13:H14');
  sheet.getCell('H13').value = 'Admit';

  sheet.mergeCells('I13:I14');
  sheet.getCell('I13').value = 'Refer (ระบุ รพ.)';

  sheet.mergeCells('J13:L13');
  sheet.getCell('J13').value = 'Dead';

  sheet.getRow(13).height = 20;

  // 14. TABLE HEADER ROW 3 (Row 14 in Excel: Dead sub-headers)
  sheet.getCell('J14').value = 'จุดเกิดเหตุ';
  sheet.getCell('K14').value = 'ระหว่างนำส่ง';
  sheet.getCell('L14').value = 'ใน รพ.';
  sheet.getRow(14).height = 20;

  // Apply borders and styling to table header rows (Rows 12, 13, 14)
  for (let r = 12; r <= 14; r++) {
    for (let c = 1; c <= 12; c++) {
      const cell = sheet.getRow(r).getCell(c);
      cell.border = thinBorder;
      cell.fill = headerFill;
      cell.font = { name: 'Sarabun', size: 9.5, bold: true, color: { argb: 'FF1F2937' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    }
  }

  // 15. PATIENT DATA ROWS
  let currentRow = 15;
  patients.forEach((pt, idx) => {
    const row = sheet.getRow(currentRow);
    row.height = 21;

    const status = (pt.current_status || '').toLowerCase();
    const isDC = status.includes('กลับบ้าน') || status.includes('d/c') || status.includes('discharge');
    const isAdmit = status.includes('admit') || status.includes('นอนโรงพยาบาล') || status.includes('ตึก');

    let referHosp = '';
    if (status.includes('ส่งต่อ') || status.includes('refer')) {
      referHosp = pt.current_status.replace(/^ส่งต่อ:\s*/i, '').replace(/^refer:\s*/i, '').trim();
    }

    const isDead = pt.triage_color === 'black' || pt.triage_color === 'white' || status.includes('เสียชีวิต') || status.includes('ตาย');
    const isDeadScene = isDead && (status.includes('ก่อนถึง') || pt.dead_before_arrive || status.includes('จุดเกิดเหตุ'));
    const isDeadHospital = isDead && (status.includes('ใน รพ') || pt.dead_in_hospital || status.includes('ในโรงพยาบาล'));
    const isDeadTransport = isDead && !isDeadScene && !isDeadHospital;

    // Triage label text: แสดงเฉพาะสี (แดง, เหลือง, เขียว, ดำ) ไม่ต้องบอกระดับ
    let triageText = '-';
    const col = (pt.triage_color || '').toLowerCase();
    if (col === 'red' || col === 'แดง') triageText = 'แดง';
    else if (col === 'yellow' || col === 'เหลือง') triageText = 'เหลือง';
    else if (col === 'green' || col === 'เขียว') triageText = 'เขียว';
    else if (col === 'black' || col === 'white' || col === 'ดำ') triageText = 'ดำ';
    else if (pt.triage_level) {
      const lvl = String(pt.triage_level).toLowerCase();
      if (lvl.includes('แดง') || lvl.includes('วิกฤต') || lvl.includes('red')) triageText = 'แดง';
      else if (lvl.includes('เหลือง') || lvl.includes('เร่งด่วน') || lvl.includes('yellow')) triageText = 'เหลือง';
      else if (lvl.includes('เขียว') || lvl.includes('ไม่เร่งด่วน') || lvl.includes('green')) triageText = 'เขียว';
      else if (lvl.includes('ดำ') || lvl.includes('เสียชีวิต') || lvl.includes('black')) triageText = 'ดำ';
      else triageText = pt.triage_level;
    }

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = pt.pt_name || 'ไม่ระบุชื่อ';
    row.getCell(3).value = pt.age || '-';
    row.getCell(4).value = triageText;
    row.getCell(5).value = pt.transport && pt.transport !== '-' ? pt.transport : '-';
    row.getCell(6).value = pt.diag && pt.diag !== '-' ? pt.diag : (pt.injury_info || '-');
    row.getCell(7).value = isDC ? '✓' : '';
    row.getCell(8).value = isAdmit ? '✓' : '';
    row.getCell(9).value = referHosp || '-';
    row.getCell(10).value = isDeadScene ? '✓' : '';
    row.getCell(11).value = isDeadTransport ? '✓' : '';
    row.getCell(12).value = isDeadHospital ? '✓' : '';

    // Cell alignments and borders
    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      cell.border = thinBorder;
      cell.font = { name: 'Sarabun', size: 9.5, color: { argb: 'FF111827' } };
      if (c === 1 || c === 3 || c === 4 || c === 5 || c === 7 || c === 8 || c === 10 || c === 11 || c === 12) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (c === 9) {
        cell.alignment = { horizontal: referHosp ? 'left' : 'center', vertical: 'middle', indent: referHosp ? 1 : 0 };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      }
    }

    currentRow++;
  });

  // If no patients, add an empty row
  if (patients.length === 0) {
    const emptyRow = sheet.getRow(currentRow);
    sheet.mergeCells(`A${currentRow}:L${currentRow}`);
    const emptyCell = emptyRow.getCell(1);
    emptyCell.value = 'ไม่พบข้อมูลผู้บาดเจ็บในช่วงเวลาที่ระบุ';
    emptyCell.font = { name: 'Sarabun', size: 10, italic: true, color: { argb: 'FF6B7280' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= 12; c++) {
      emptyRow.getCell(c).border = thinBorder;
    }
    emptyRow.height = 24;
    currentRow++;
  }

  // 16. SUMMARY STATS FOOTER
  currentRow++; // blank line
  sheet.mergeCells(`A${currentRow}:L${currentRow}`);
  const sum1 = sheet.getCell(`A${currentRow}`);
  const regCount = summary?.registered_count !== undefined ? summary.registered_count : patients.length;
  const refuseCount = summary?.refuse_treatment || summary?.refuse_treatment_count || 0;
  const totalCount = summary?.total !== undefined ? summary.total : (regCount + refuseCount);

  sum1.value = `สรุปผลผู้บาดเจ็บทั้งหมด:  ${totalCount} คน   (รับการตรวจรักษาใน รพ.: ${regCount} คน,  ไม่ประสงค์ตรวจรักษา: ${refuseCount} คน)`;
  sum1.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: 'FF111827' } };
  sum1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(currentRow).height = 22;

  currentRow++;
  sheet.mergeCells(`A${currentRow}:L${currentRow}`);
  const sum2 = sheet.getCell(`A${currentRow}`);
  sum2.value = `สถิติตามระดับความรุนแรง:   แดง: ${summary?.red || 0} คน  |  เหลือง: ${summary?.yellow || 0} คน  |  เขียว: ${summary?.green || 0} คน  |  ดำ: ${summary?.black || 0} คน`;
  sum2.font = { name: 'Sarabun', size: 10.5, bold: true, color: { argb: 'FF374151' } };
  sum2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(currentRow).height = 22;

  return workbook;
}

module.exports = {
  generateIncidentExcelWorkbook,
  formatThaiDateLong,
  buildTimeframeText
};

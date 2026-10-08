/**
 * Compute triage count and registration summary for an incident
 * @param {Array<Object>} patients - List of incident patients
 * @param {number|string} [refuseTreatmentCount=0] - Number of patients who refused treatment
 * @returns {{ red: number, yellow: number, green: number, black: number, refuse_treatment: number, registered_count: number, total: number }}
 */
function calculateIncidentSummary(patients = [], refuseTreatmentCount = 0) {
  let red = 0;
  let yellow = 0;
  let green = 0;
  let black = 0;

  if (Array.isArray(patients)) {
    patients.forEach((p) => {
      const col = (p && p.triage_color ? String(p.triage_color) : 'green').toLowerCase().trim();
      if (col === 'red' || col.includes('แดง') || col.includes('resuscitate') || col.includes('emergency')) {
        red++;
      } else if (col === 'yellow' || col.includes('เหลือง') || col.includes('urgency')) {
        yellow++;
      } else if (col === 'black' || col === 'white' || col.includes('ดำ') || col.includes('ขาว') || col.includes('dead') || col.includes('ตาย')) {
        black++;
      } else {
        green++;
      }
    });
  }

  const registeredCount = Array.isArray(patients) ? patients.length : 0;
  const refuseCount = parseInt(refuseTreatmentCount, 10) || 0;
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

module.exports = {
  calculateIncidentSummary
};

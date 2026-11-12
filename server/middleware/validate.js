function isValidTimeHm(value) {
  if (value === null || value === undefined || value === '') return true;
  if (typeof value !== 'string') return false;
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value.trim());
}

function normalizeDaysOfWeek(value) {
  if (value === null || value === undefined || value === '') {
    return '0,1,2,3,4,5,6';
  }
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const days = Array.from(
    new Set(
      raw
        .map((d) => parseInt(String(d).trim(), 10))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    )
  ).sort((a, b) => a - b);
  return days.length > 0 ? days.join(',') : '0,1,2,3,4,5,6';
}

function isValidScheduleWindow(startTime, endTime) {
  if (!startTime || !endTime) return { ok: true };
  const startMs = new Date(String(startTime).replace(' ', 'T')).getTime();
  const endMs = new Date(String(endTime).replace(' ', 'T')).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return { ok: false, error: 'Invalid schedule datetime format' };
  }
  if (endMs <= startMs) {
    return { ok: false, error: 'Schedule end_time must be after start_time' };
  }
  return { ok: true };
}

function validateScheduleMiddleware(req, res, next) {
  const { start_time, end_time } = req.body || {};
  const check = isValidScheduleWindow(start_time, end_time);
  if (!check.ok) {
    return res.status(400).json({ error: check.error });
  }
  next();
}

module.exports = {
  isValidTimeHm,
  normalizeDaysOfWeek,
  isValidScheduleWindow,
  validateScheduleMiddleware
};

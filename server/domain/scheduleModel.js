function parseScheduleDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const normalized = String(value).trim().replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWeekdayAllowed(daysOfWeek, nowDate = new Date()) {
  if (!daysOfWeek || String(daysOfWeek).trim() === '' || String(daysOfWeek).trim() === '0,1,2,3,4,5,6') {
    return true;
  }
  const allowed = String(daysOfWeek)
    .split(',')
    .map((d) => parseInt(d.trim(), 10))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  if (allowed.length === 0) return true;
  return allowed.includes(nowDate.getDay());
}

function isMediaExpired(item, now = new Date()) {
  if (!item || !item.expires_at) return false;
  const raw = item.expires_at;
  let exp;
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    exp = new Date(`${raw.trim()}T23:59:59.999`);
  } else {
    exp = parseScheduleDate(raw);
    if (
      exp &&
      !Number.isNaN(exp.getTime()) &&
      raw instanceof Date &&
      exp.getHours() === 0 &&
      exp.getMinutes() === 0 &&
      exp.getSeconds() === 0 &&
      exp.getMilliseconds() === 0
    ) {
      exp = new Date(exp);
      exp.setHours(23, 59, 59, 999);
    }
  }
  if (!exp || Number.isNaN(exp.getTime())) return false;
  const nowMs = now instanceof Date ? now.getTime() : Number(now);
  return nowMs >= exp.getTime();
}

function isItemActiveAt(item, now = new Date()) {
  if (!item) return false;
  if (item.is_active === 0 || item.is_active === false || item.is_active === '0') {
    return false;
  }
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowMs = nowDate.getTime();

  if (isMediaExpired(item, nowDate)) {
    return false;
  }

  if (!isWeekdayAllowed(item.days_of_week, nowDate)) {
    return false;
  }

  const start = parseScheduleDate(item.start_time);
  if (start && nowMs < start.getTime()) {
    return false;
  }

  const end = parseScheduleDate(item.end_time);
  if (end && nowMs > end.getTime()) {
    return false;
  }

  return true;
}

function getNextScheduleTransitionMs(items, now = new Date()) {
  if (!Array.isArray(items) || items.length === 0) {
    return { nextTransitionAt: null, delayMs: null };
  }
  const nowDate = now instanceof Date ? now : new Date(now);
  const nowMs = nowDate.getTime();
  let earliestMs = Infinity;
  let hasWeekdayConstraint = false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item || item.is_active === 0 || item.is_active === false) continue;

    if (item.days_of_week && String(item.days_of_week).trim() !== '0,1,2,3,4,5,6') {
      hasWeekdayConstraint = true;
    }

    const start = parseScheduleDate(item.start_time);
    if (start && start.getTime() > nowMs && start.getTime() < earliestMs) {
      earliestMs = start.getTime();
    }

    const end = parseScheduleDate(item.end_time);
    if (end && end.getTime() > nowMs && end.getTime() < earliestMs) {
      earliestMs = end.getTime();
    }

    const exp = parseScheduleDate(item.expires_at);
    if (exp && exp.getTime() > nowMs && exp.getTime() < earliestMs) {
      earliestMs = exp.getTime();
    }
  }

  if (hasWeekdayConstraint) {
    const nextMidnight = new Date(nowDate);
    nextMidnight.setHours(24, 0, 1, 0);
    if (nextMidnight.getTime() > nowMs && nextMidnight.getTime() < earliestMs) {
      earliestMs = nextMidnight.getTime();
    }
  }

  if (!Number.isFinite(earliestMs)) {
    return { nextTransitionAt: null, delayMs: null };
  }

  return {
    nextTransitionAt: new Date(earliestMs).toISOString(),
    delayMs: Math.max(250, earliestMs - nowMs),
  };
}

module.exports = {
  parseScheduleDate,
  isWeekdayAllowed,
  isMediaExpired,
  isItemActiveAt,
  getNextScheduleTransitionMs,
};

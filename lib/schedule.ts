export interface ScheduledItem {
  isActive: boolean
  startDate: Date | null
  endDate: Date | null
  startTime: string | null
  endTime: string | null
  daysOfWeek: string | null
}

export function isItemActiveNow(item: ScheduledItem): boolean {
  if (!item.isActive) return false
  const now = new Date()
  if (item.startDate && new Date(item.startDate) > now) return false
  if (item.endDate && new Date(item.endDate) < now) return false
  const currentDay = now.getDay()
  if (item.daysOfWeek) {
    const allowedDays = item.daysOfWeek.split(',').map(d => parseInt(d.trim(), 10))
    if (!allowedDays.includes(currentDay)) return false
  }
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  if (item.startTime && currentTime < item.startTime) return false
  if (item.endTime && currentTime > item.endTime) return false
  return true
}

export function filterActiveItems<T extends ScheduledItem>(items: T[]): T[] {
  return items.filter(isItemActiveNow)
}

export interface PlaylistSchedule {
  id?: string
  playlistId: string
  priority: number
  startDate: Date | string | null
  endDate: Date | string | null
  startTime?: string | null
  endTime?: string | null
  isActive: boolean
  playlist?: any
}

export function isScheduleActiveNow(schedule: PlaylistSchedule, targetDate: Date = new Date()): boolean {
  if (!schedule.isActive) return false

  if (schedule.startDate) {
    const start = new Date(schedule.startDate)
    if (!isNaN(start.getTime()) && targetDate < start) return false
  }

  if (schedule.endDate) {
    const end = new Date(schedule.endDate)
    if (!isNaN(end.getTime()) && targetDate > end) return false
  }

  const currentHours = String(targetDate.getHours()).padStart(2, '0')
  const currentMinutes = String(targetDate.getMinutes()).padStart(2, '0')
  const currentTime = `${currentHours}:${currentMinutes}`

  if (schedule.startTime && currentTime < schedule.startTime) return false
  if (schedule.endTime && currentTime > schedule.endTime) return false

  return true
}

export function resolveActiveSchedule<T extends PlaylistSchedule>(
  schedules: T[],
  targetDate: Date = new Date()
): T | null {
  if (!schedules || schedules.length === 0) return null

  // Sort by priority ASC (1 is highest priority)
  const sorted = [...schedules].sort((a, b) => (a.priority || 0) - (b.priority || 0))

  for (const schedule of sorted) {
    if (isScheduleActiveNow(schedule, targetDate)) {
      return schedule
    }
  }

  return null
}


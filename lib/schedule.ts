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

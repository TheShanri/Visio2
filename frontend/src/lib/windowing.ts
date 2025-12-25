import { SessionData } from '../types'

export function filterByWindow<T>(rows: T[], timeKey: keyof T, start: number, end: number): T[] {
  return rows.filter((row) => {
    const value = Number((row as Record<string, unknown>)[timeKey as string])
    return Number.isFinite(value) && value >= start && value <= end
  })
}

export function applyWindowToSessionData(
  data: SessionData,
  start: number,
  end: number,
): SessionData {
  return {
    scale: filterByWindow(data.scale, 'Elapsed Time', start, end),
    volume: filterByWindow(data.volume, 'Elapsed Time', start, end),
    pressure: filterByWindow(data.pressure, 'Elapsed Time', start, end),
  }
}

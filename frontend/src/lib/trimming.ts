import { RowPressure } from '../types'

export type Interval = { start: number; end: number }

function normalizeIntervals(intervals: Interval[]): Interval[] {
  const normalizedTrims = intervals.map(({ start, end }) =>
    start <= end ? { start, end } : { start: end, end: start }
  )

  return normalizedTrims
    .sort((a, b) => a.start - b.start)
    .reduce<Interval[]>((acc, interval) => {
      const last = acc[acc.length - 1]
      if (!last) {
        acc.push(interval)
        return acc
      }

      if (interval.start <= last.end) {
        // Overlapping or adjacent interval (end === next.start)
        last.end = Math.max(last.end, interval.end)
      } else {
        acc.push(interval)
      }

      return acc
    }, [])
}

export function filterRowsByIntervals<T extends { [k: string]: any }>(
  rows: T[],
  timeKey: keyof T,
  intervals: Interval[]
): T[] {
  const sortedRows = [...rows].sort((a, b) => Number(a[timeKey]) - Number(b[timeKey]))

  if (intervals.length === 0) {
    return sortedRows.map((row) => ({ ...row }))
  }

  const mergedTrims = normalizeIntervals(intervals)

  return sortedRows
    .filter((row) => {
      const elapsed = Number(row[timeKey])
      return mergedTrims.some(
        (interval) => elapsed >= interval.start && elapsed <= interval.end
      )
    })
    .map((row) => ({ ...row }))
}

export function applyTrims(originalPressureRows: RowPressure[], trims: Interval[]): RowPressure[] {
  return filterRowsByIntervals<RowPressure>(originalPressureRows, 'Elapsed Time', trims)
}

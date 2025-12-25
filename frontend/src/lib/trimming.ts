import { RowPressure } from '../types'

export type Interval = { start: number; end: number }

export function applyTrims(originalPressureRows: RowPressure[], trims: Interval[]): RowPressure[] {
  const sortedRows = [...originalPressureRows].sort(
    (a, b) => a['Elapsed Time'] - b['Elapsed Time']
  )

  if (trims.length === 0) {
    return sortedRows
  }

  const normalized = trims
    .map(({ start, end }) =>
      start <= end
        ? { start, end }
        : { start: end, end: start }
    )
    .sort((a, b) => a.start - b.start)

  const merged: Interval[] = []

  for (const interval of normalized) {
    if (merged.length === 0) {
      merged.push(interval)
      continue
    }

    const last = merged[merged.length - 1]
    if (interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end)
    } else {
      merged.push(interval)
    }
  }

  return sortedRows.filter((row) => {
    const elapsed = row['Elapsed Time']
    return merged.some((interval) => elapsed >= interval.start && elapsed <= interval.end)
  })
}

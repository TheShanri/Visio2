import { RowPressure } from '../types'

export type Interval = { start: number; end: number }

export function applyTrims(originalPressureRows: RowPressure[], trims: Interval[]): RowPressure[] {
  const sortedRows = [...originalPressureRows].sort(
    (a, b) => a['Elapsed Time'] - b['Elapsed Time']
  )

  if (trims.length === 0) {
    return sortedRows
  }

  const normalizedTrims = trims.map(({ start, end }) =>
    start <= end ? { start, end } : { start: end, end: start }
  )

  const mergedTrims = normalizedTrims
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

  return sortedRows.filter((row) => {
    const elapsed = row['Elapsed Time']
    const isWithinTrim = mergedTrims.some(
      (interval) => elapsed >= interval.start && elapsed <= interval.end
    )
    return isWithinTrim
  })
}

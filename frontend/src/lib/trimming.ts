import { RowPressure } from '../types'

export type Interval = { start: number; end: number }

export function applyTrims(originalPressureRows: RowPressure[], trims: Interval[]): RowPressure[] {
  const sortedRows = [...originalPressureRows].sort(
    (a, b) => a['Elapsed Time'] - b['Elapsed Time']
  )

  if (trims.length === 0) {
    return sortedRows
  }

  return sortedRows.filter((row) => {
    const elapsed = row['Elapsed Time']
    const isTrimmed = trims.some((interval) => elapsed >= interval.start && elapsed <= interval.end)
    return !isTrimmed
  })
}

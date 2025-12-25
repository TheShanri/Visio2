export type Point = { x: number; y: number }

export function toPoints<T>(rows: T[], xKey: keyof T, yKey: keyof T): Point[] {
  const points = rows
    .map((row) => {
      const x = Number((row as Record<string, unknown>)[xKey as string])
      const y = Number((row as Record<string, unknown>)[yKey as string])
      return { x, y }
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))

  return points.sort((a, b) => a.x - b.x)
}

export function computeDuration(points: Point[]): number {
  if (points.length === 0) return 0
  const minX = points[0].x
  const maxX = points[points.length - 1].x
  return maxX - minX
}

export function computeMaxY(points: Point[]): number {
  if (points.length === 0) return 0
  return points.reduce((max, point) => (point.y > max ? point.y : max), points[0].y)
}

export function computeFinalY(points: Point[]): number {
  if (points.length === 0) return 0
  return points[points.length - 1].y
}

export function formatNumber(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return 'N/A'
  return n.toFixed(digits)
}

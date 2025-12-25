import { Point } from './series'

export function nearestPointIndexByX(points: Point[], x: number): number {
  if (points.length === 0) return -1

  let nearestIndex = 0
  let minDelta = Math.abs(points[0].x - x)

  for (let i = 1; i < points.length; i += 1) {
    const delta = Math.abs(points[i].x - x)
    if (delta < minDelta) {
      nearestIndex = i
      minDelta = delta
    }
  }

  return nearestIndex
}

export function findLocalMaxIndex(points: Point[], startIndex: number, windowIndices: number): number {
  if (points.length === 0) return -1

  const start = Math.max(0, startIndex - windowIndices)
  const end = Math.min(points.length - 1, startIndex + windowIndices)

  const candidates: number[] = []
  for (let i = start; i <= end; i += 1) {
    const prev = i > 0 ? points[i - 1].y : -Infinity
    const next = i < points.length - 1 ? points[i + 1].y : -Infinity

    if (points[i].y >= prev && points[i].y >= next) {
      candidates.push(i)
    }
  }

  if (candidates.length > 0) {
    let best = candidates[0]
    let bestDistance = Math.abs(best - startIndex)

    for (const candidate of candidates) {
      const distance = Math.abs(candidate - startIndex)
      if (distance < bestDistance || (distance === bestDistance && points[candidate].y > points[best].y)) {
        best = candidate
        bestDistance = distance
      }
    }

    return best
  }

  let bestIndex = start
  for (let i = start + 1; i <= end; i += 1) {
    if (points[i].y > points[bestIndex].y) {
      bestIndex = i
    }
  }

  return bestIndex
}

export function snapToLocalMax(points: Point[], x: number, windowSec: number): { index: number; point: Point } | null {
  if (points.length === 0) return null

  const startIndex = nearestPointIndexByX(points, x)
  if (startIndex === -1) return null

  let leftIndex = startIndex
  while (leftIndex > 0 && x - points[leftIndex - 1].x <= windowSec) {
    leftIndex -= 1
  }

  let rightIndex = startIndex
  while (rightIndex < points.length - 1 && points[rightIndex + 1].x - x <= windowSec) {
    rightIndex += 1
  }

  const windowIndices = Math.max(startIndex - leftIndex, rightIndex - startIndex)
  const bestIndex = findLocalMaxIndex(points, startIndex, windowIndices)

  if (bestIndex === -1) return null
  return { index: bestIndex, point: points[bestIndex] }
}

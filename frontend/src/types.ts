export type RowScale = {
  "Elapsed Time": number
  Scale: number
}

export type RowVolume = {
  "Elapsed Time": number
  "Tot Infused Vol": number
}

export type RowPressure = {
  "Elapsed Time": number
  "Bladder Pressure": number
}

export type Peak = {
  time: number
  value: number
  index?: number
  source: 'auto' | 'manual'
}

export type PeakParams = {
  height?: number | null
  threshold?: number | null
  distance?: number | null
  prominence?: number | null
  width?: number | null
}

export type SessionData = {
  scale: RowScale[]
  volume: RowVolume[]
  pressure: RowPressure[]
}

export type UploadResponse = {
  data: SessionData
}

export type SegmentParams = {
  medianKernel?: number | null
  maWindowSec?: number | null
  derivativeWindowSec?: number | null
  preWindowSec?: number | null
  guardSec?: number | null
  kNoise?: number | null
  slopeThreshold?: number | null
  sustainSec?: number | null
  minAfterPeakSec?: number | null
  postWindowSec?: number | null
  dropSlopeThreshold?: number | null
  flatSlopeThreshold?: number | null
  flatToleranceKNoise?: number | null
  dwellSec?: number | null
  fallbackOnsetSec?: number | null
  fallbackEmptySec?: number | null
}

export type SegmentPoint = {
  time: number | null
  value: number | null
  index?: number
}

export type SegmentMetrics = {
  imiSec: number | null
  maxPressure: number | null
  avgPressureBetweenEmptyAndNextOnset: number | null
  deltaVolume: number | null
}

export type Segment = {
  i: number
  onsetTime: number | null
  peakTime: number | null
  emptyTime: number | null
  metrics: SegmentMetrics
}

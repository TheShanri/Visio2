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
  onsetGradient?: number | null
  onsetPressureDrop?: number | null
  emptyPressureDrop?: number | null
  minAfterPeakSec?: number | null
  searchStartAfterPrevPeakSec?: number | null
  fallbackOnsetSec?: number | null
  fallbackEmptySec?: number | null
}

export type SegmentPoint = {
  time: number
  value: number
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
  onsetTime: number
  peakTime: number
  emptyTime: number
  metrics: SegmentMetrics
}

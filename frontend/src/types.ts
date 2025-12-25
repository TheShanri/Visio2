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

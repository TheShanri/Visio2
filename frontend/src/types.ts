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

export type SessionData = {
  scale: RowScale[]
  volume: RowVolume[]
  pressure: RowPressure[]
}

export type UploadResponse = {
  data: SessionData
}

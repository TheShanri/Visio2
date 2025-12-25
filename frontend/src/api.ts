import { SessionData, UploadResponse } from './types'

type Peak = { time: number; value: number }

type ReportResponse = { downloadUrl: string; filename: string }

export function getApiBase(): string {
  const apiBase = import.meta.env.VITE_API_URL
  if (!apiBase) {
    throw new Error('Missing VITE_API_URL configuration')
  }
  return apiBase
}

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    try {
      const errorData = (await response.json()) as { error?: string }
      if (errorData?.error) {
        errorMessage = errorData.error
      }
    } catch (err) {
      // ignore json parsing errors and use default message
    }
    throw new Error(errorMessage)
  }
  return (await response.json()) as T
}

export async function uploadFile(file: File): Promise<SessionData> {
  const apiBase = getApiBase()
  const url = new URL('/api/upload', apiBase).toString()

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  })

  const payload = await handleJsonResponse<UploadResponse>(response)
  return payload.data
}

export async function detectPeaks(
  pressureRows: SessionData['pressure'],
  minHeight?: number,
  minDistance?: number
): Promise<Peak[]> {
  const apiBase = getApiBase()
  const url = new URL('/api/detect-peaks', apiBase).toString()

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pressure: pressureRows, min_height: minHeight, min_distance: minDistance }),
  })

  const payload = await handleJsonResponse<{ peaks: Peak[] }>(response)
  return payload.peaks
}

export async function generateReport(
  data: Record<string, unknown>,
  peaks?: Peak[]
): Promise<ReportResponse> {
  const apiBase = getApiBase()
  const url = new URL('/api/generate-report', apiBase).toString()

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, peaks }),
  })

  const payload = await handleJsonResponse<{ download_url: string; filename: string }>(response)
  return { downloadUrl: payload.download_url, filename: payload.filename }
}

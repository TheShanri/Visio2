import { Peak, PeakParams, Segment, SegmentParams, SegmentPoint, SessionData, UploadResponse } from './types'

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

export async function peaksSuggest(
  pressureRows: SessionData['pressure'],
  expectedCount: number,
  searchBudget?: number
): Promise<{
  best: { params: PeakParams; peaks: Peak[]; score: number }
  candidates: { params: PeakParams; peaks: Peak[]; score: number }[]
}> {
  const apiBase = getApiBase()
  const url = new URL('/api/peaks/suggest', apiBase).toString()

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pressure: pressureRows, expectedCount, searchBudget }),
  })

  return handleJsonResponse(response)
}

export async function peaksRun(
  pressureRows: SessionData['pressure'],
  params: PeakParams
): Promise<{ peaks: Peak[]; paramsUsed: PeakParams }> {
  const apiBase = getApiBase()
  const url = new URL('/api/peaks/run', apiBase).toString()

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pressure: pressureRows, params }),
  })

  return handleJsonResponse(response)
}

export async function deriveSegments(
  data: SessionData,
  peaks: Peak[],
  params: SegmentParams,
): Promise<{ points: { onset: SegmentPoint[]; peak: SegmentPoint[]; empty: SegmentPoint[] }; segments: Segment[] }> {
  const apiBase = getApiBase()
  const url = new URL('/api/segments/derive', apiBase).toString()

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, peaks, params }),
  })

  return handleJsonResponse(response)
}

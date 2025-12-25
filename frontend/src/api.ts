import { SessionData, UploadResponse } from './types'

export function getApiBase(): string {
  const apiBase = import.meta.env.VITE_API_URL
  if (!apiBase) {
    throw new Error('Missing VITE_API_URL configuration')
  }
  return apiBase
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

  if (!response.ok) {
    let errorMessage = `Upload failed with status ${response.status}`
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

  const payload = (await response.json()) as UploadResponse
  return payload.data
}

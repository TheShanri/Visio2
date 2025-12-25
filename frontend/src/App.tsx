import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { uploadFile, getApiBase } from './api'
import { SessionData } from './types'

function App() {
  const [status, setStatus] = useState<string>('Checking health...')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [originalData, setOriginalData] = useState<SessionData | null>(null)
  const [currentData, setCurrentData] = useState<SessionData | null>(null)

  useEffect(() => {
    let apiUrl: string
    try {
      apiUrl = getApiBase()
    } catch (err) {
      setStatus((err as Error).message)
      return
    }

    const controller = new AbortController()

    fetch(new URL('/health', apiUrl).toString(), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data = (await response.json()) as { ok?: boolean }
        setStatus(data.ok ? 'Healthy' : 'Unhealthy response received')
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          setStatus(`Health check failed: ${error.message}`)
        }
      })

    return () => controller.abort()
  }, [])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFile) {
      setError('Please select a file to upload')
      return
    }

    setIsUploading(true)
    setError('')

    try {
      const uploadedData = await uploadFile(selectedFile)
      setOriginalData(uploadedData)
      setCurrentData(JSON.parse(JSON.stringify(uploadedData)))
    } catch (err) {
      setError((err as Error).message)
      setOriginalData(null)
      setCurrentData(null)
    } finally {
      setIsUploading(false)
    }
  }

  const pressurePreview = useMemo(() => currentData?.pressure.slice(0, 5) ?? [], [currentData])

  return (
    <main style={{ fontFamily: 'Arial, sans-serif', padding: '2rem' }}>
      <h1>VISIO MVP</h1>
      <p>Backend health: {status}</p>

      <section style={{ marginTop: '1rem' }}>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="file" accept=".txt,.csv" onChange={handleFileChange} />
          <button type="submit" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
        {selectedFile && <p style={{ marginTop: '0.5rem' }}>Selected file: {selectedFile.name}</p>}
        {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
      </section>

      {currentData && (
        <section style={{ marginTop: '2rem' }}>
          <h2>Uploaded Data</h2>
          <p>
            Scale rows: {currentData.scale.length} | Volume rows: {currentData.volume.length} | Pressure rows:{' '}
            {currentData.pressure.length}
          </p>
          <h3>Pressure Preview (first 5 rows)</h3>
          {pressurePreview.length === 0 ? (
            <p>No pressure data available.</p>
          ) : (
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Elapsed Time</th>
                  <th style={{ border: '1px solid #ccc', padding: '0.5rem' }}>Bladder Pressure</th>
                </tr>
              </thead>
              <tbody>
                {pressurePreview.map((row, index) => (
                  <tr key={`pressure-row-${index}`}>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{row['Elapsed Time']}</td>
                    <td style={{ border: '1px solid #ccc', padding: '0.5rem' }}>{row['Bladder Pressure']}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  )
}

export default App

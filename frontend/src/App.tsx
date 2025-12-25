import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { uploadFile, getApiBase } from './api'
import { SessionData } from './types'
import { LineChart } from './components/LineChart'
import { SummaryCards } from './components/SummaryCards'
import { computeDuration, computeFinalY, computeMaxY, toPoints } from './lib/series'

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

  const scalePoints = useMemo(() => {
    if (!currentData) return []
    return toPoints(currentData.scale, 'Elapsed Time', 'Scale')
  }, [currentData])

  const volumePoints = useMemo(() => {
    if (!currentData) return []
    return toPoints(currentData.volume, 'Elapsed Time', 'Tot Infused Vol')
  }, [currentData])

  const pressurePoints = useMemo(() => {
    if (!currentData) return []
    return toPoints(currentData.pressure, 'Elapsed Time', 'Bladder Pressure')
  }, [currentData])

  const duration = useMemo(() => {
    const baseSeries = pressurePoints.length > 0 ? pressurePoints : scalePoints
    return computeDuration(baseSeries)
  }, [pressurePoints, scalePoints])

  const maxPressure = useMemo(() => computeMaxY(pressurePoints), [pressurePoints])
  const finalVolume = useMemo(() => computeFinalY(volumePoints), [volumePoints])

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

          <SummaryCards duration={duration} maxPressure={maxPressure} finalVolume={finalVolume} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
            <LineChart title="Scale Over Time" points={scalePoints} xLabel="Elapsed Time (s)" yLabel="Scale" />
            <LineChart title="Volume Over Time" points={volumePoints} xLabel="Elapsed Time (s)" yLabel="Tot Infused Vol" />
            <LineChart title="Pressure Over Time" points={pressurePoints} xLabel="Elapsed Time (s)" yLabel="Bladder Pressure" />
          </div>

          <h3 style={{ marginTop: '2rem' }}>Pressure Preview (first 5 rows)</h3>
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

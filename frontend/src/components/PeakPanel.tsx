import { useEffect, useMemo, useState } from 'react'
import { peaksRun, peaksSuggest } from '../api'
import { Peak, PeakParams, SessionData } from '../types'

type SuggestionCandidate = { params: PeakParams; peaks: Peak[]; score: number }

type PeakPanelProps = {
  pressureRows: SessionData['pressure'] | null
  params: PeakParams | null
  setParams: (params: PeakParams | null) => void
  peaks: Peak[]
  setPeaks: (peaks: Peak[]) => void
}

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined) return ''
  return Number.isFinite(value) ? value.toFixed(digits) : ''
}

function PeakPanel({ pressureRows, params, setParams, peaks, setPeaks }: PeakPanelProps) {
  const [expectedCount, setExpectedCount] = useState<number | ''>(3)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [candidates, setCandidates] = useState<SuggestionCandidate[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const paramsState = useMemo<PeakParams>(() => params ?? {}, [params])
  const hasData = (pressureRows?.length ?? 0) > 0

  useEffect(() => {
    setCandidates([])
    setMessage('')
    setError('')
  }, [pressureRows])

  const handleParamChange = (key: keyof PeakParams, raw: string) => {
    const numeric = raw === '' ? null : Number(raw)
    const nextValue = Number.isFinite(numeric) ? numeric : null
    setParams({ ...paramsState, [key]: nextValue })
  }

  const handleSuggest = async () => {
    if (!hasData) {
      setError('Upload data to auto-tune peaks.')
      return
    }

    if (expectedCount === '' || Number.isNaN(Number(expectedCount))) {
      setError('Expected count must be a number')
      return
    }

    setIsSuggesting(true)
    setError('')
    setMessage('')

    try {
      const suggestion = await peaksSuggest(pressureRows!, Number(expectedCount))
      setParams(suggestion.best.params ?? {})
      setPeaks((suggestion.best.peaks ?? []).map((peak) => ({ ...peak, source: 'auto' as const })))
      setCandidates(suggestion.candidates ?? [])
      setMessage(`Auto-tuned. Best candidate found ${suggestion.best.peaks?.length ?? 0} peaks.`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleRun = async () => {
    if (!hasData) {
      setError('Upload data to run peak detection.')
      return
    }

    setIsRunning(true)
    setError('')
    setMessage('Running peak detection...')

    try {
      const result = await peaksRun(pressureRows!, paramsState)
      setPeaks((result.peaks ?? []).map((peak) => ({ ...peak, source: 'manual' as const })))
      setMessage(`Detected ${result.peaks?.length ?? 0} peaks with current parameters.`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <section style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>Peak detection</h3>
        <span style={{ color: '#4b5563' }}>({peaks.length} peaks selected)</span>
      </div>

      {!hasData && <p style={{ color: '#6b7280' }}>Upload data to tune and run peak detection.</p>}

      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            Expected peak count
            <input
              type="number"
              min={0}
              value={expectedCount}
              onChange={(event) => setExpectedCount(event.target.value === '' ? '' : Number(event.target.value))}
              style={{ padding: '0.4rem 0.5rem' }}
              disabled={!hasData || isSuggesting}
            />
          </label>
          <button onClick={handleSuggest} disabled={!hasData || isSuggesting}>
            {isSuggesting ? 'Auto-tuning...' : 'Auto-tune'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
          {([
            ['height', 'Height'],
            ['threshold', 'Threshold'],
            ['distance', 'Distance'],
            ['prominence', 'Prominence'],
            ['width', 'Width'],
          ] as const).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {label}
              <input
                type="number"
                value={(paramsState[key] ?? '') as number | ''}
                onChange={(event) => handleParamChange(key, event.target.value)}
                style={{ padding: '0.4rem 0.5rem' }}
                disabled={!hasData || isSuggesting}
              />
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={handleRun} disabled={!hasData || isRunning}>
            {isRunning ? 'Running...' : 'Run with params'}
          </button>
          <small style={{ color: '#6b7280' }}>Parameters left blank will be sent as null.</small>
        </div>
      </div>

      {message && <p style={{ color: '#065f46', marginTop: '0.75rem' }}>{message}</p>}
      {error && <p style={{ color: '#b91c1c', marginTop: '0.75rem' }}>{error}</p>}

      {candidates.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ marginBottom: '0.5rem' }}>Top suggestions</p>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.35rem' }}>Rank</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.35rem' }}>Peaks</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.35rem' }}>Score</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.35rem' }}>Params</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate, idx) => (
                <tr key={`candidate-${idx}`} style={{ background: idx === 0 ? '#f9fafb' : undefined }}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.35rem', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.35rem', textAlign: 'center' }}>{candidate.peaks?.length ?? 0}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.35rem', textAlign: 'center' }}>
                    {formatNumber(candidate.score)}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.35rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {Object.entries(candidate.params || {}).map(([key, value]) => (
                        <span key={`${idx}-${key}`} style={{ color: '#374151' }}>
                          <strong>{key}:</strong> {formatNumber(value as number | null)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default PeakPanel

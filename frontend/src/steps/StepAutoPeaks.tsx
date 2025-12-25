import { useMemo, useState } from 'react'
import PeakPanel from '../components/PeakPanel'
import { LineChart } from '../components/LineChart'
import { toPoints } from '../lib/series'
import { Peak, PeakParams, SessionData } from '../types'

type StepAutoPeaksProps = {
  pressureRows: SessionData['pressure'] | null
  scaleRows: SessionData['scale'] | null
  peakParams: PeakParams | null
  peaks: Peak[]
  setPeakParams: (params: PeakParams | null) => void
  setPeaks: (peaks: Peak[]) => void
  setAutoPeaks: (peaks: Peak[]) => void
}

export function StepAutoPeaks({
  pressureRows,
  scaleRows,
  peakParams,
  peaks,
  setPeakParams,
  setPeaks,
  setAutoPeaks,
}: StepAutoPeaksProps) {
  const [expectedCount, setExpectedCount] = useState<number | ''>(3)

  const pressurePoints = useMemo(() => {
    if (!pressureRows) return []
    return toPoints(pressureRows, 'Elapsed Time', 'Bladder Pressure')
  }, [pressureRows])

  const scalePoints = useMemo(() => {
    if (!scaleRows) return []
    return toPoints(scaleRows, 'Elapsed Time', 'Scale')
  }, [scaleRows])

  const markers = peaks.map((peak, idx) => ({ x: peak.time, y: peak.value, label: `P${idx + 1}` }))
  const targetLabel = expectedCount === '' ? 'N/A' : expectedCount

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ marginTop: 0 }}>Auto Detect Peaks</h2>
        <p style={{ color: '#4b5563', marginTop: '0.35rem' }}>
          Use auto-tune or custom parameters to detect peaks from the selected pressure window. Adjust the
          expected peak count, inspect the charts, and rerun until the peaks line up with the signal.
        </p>
      </div>

      <PeakPanel
        pressureRows={pressureRows}
        params={peakParams}
        setParams={setPeakParams}
        peaks={peaks}
        setPeaks={setPeaks}
        expectedCount={expectedCount}
        onExpectedCountChange={setExpectedCount}
        onDetect={(detected) => setAutoPeaks(detected)}
      />

      <div>
        <div style={{ position: 'relative', height: 360, marginBottom: '1rem' }}>
          <LineChart
            title="Pressure (windowed)"
            points={pressurePoints}
            xLabel="Elapsed Time (s)"
            yLabel="Bladder Pressure"
            height={360}
            markers={markers}
          />
        </div>

        <LineChart
          title="Scale (windowed)"
          points={scalePoints}
          xLabel="Elapsed Time (s)"
          yLabel="Scale"
          height={240}
        />
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          padding: '0.85rem 1rem',
          borderRadius: '0.75rem',
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
        }}
      >
        <strong>Detected {peaks.length} peaks</strong>
        <span style={{ color: '#4b5563' }}>(target {targetLabel})</span>
      </div>
    </div>
  )
}

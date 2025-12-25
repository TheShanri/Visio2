import { Dispatch, SetStateAction, useMemo, useState } from 'react'
import { LineChart } from '../components/LineChart'
import PeakEditorOverlay from '../components/PeakEditorOverlay'
import { Peak } from '../types'
import { Point } from '../lib/series'

type StepRefinePeaksProps = {
  pressurePoints: Point[]
  scalePoints: Point[]
  peaks: Peak[]
  autoPeaks: Peak[]
  setPeaks: Dispatch<SetStateAction<Peak[]>>
  onConfirmPeaks: () => void
  peaksConfirmed: boolean
}

export function StepRefinePeaks({
  pressurePoints,
  scalePoints,
  peaks,
  autoPeaks,
  setPeaks,
  onConfirmPeaks,
  peaksConfirmed,
}: StepRefinePeaksProps) {
  const [selectedPeakIndex, setSelectedPeakIndex] = useState<number | null>(null)
  const sortedPeaks = useMemo(() => [...peaks].sort((a, b) => a.time - b.time), [peaks])

  const applyManualChange = (updater: SetStateAction<Peak[]>) => {
    setPeaks((previous) => {
      const next = typeof updater === 'function' ? (updater as (p: Peak[]) => Peak[])(previous) : updater
      return next.map((peak) => ({ ...peak, source: 'manual' }))
    })
  }

  const handleDelete = (index: number) => {
    applyManualChange((prev) => prev.filter((_, idx) => idx !== index))
    setSelectedPeakIndex(null)
  }

  const handleClearManual = () => {
    setPeaks(autoPeaks.map((peak) => ({ ...peak })))
    setSelectedPeakIndex(null)
  }

  const handleRemoveSelected = () => {
    if (selectedPeakIndex === null) return
    applyManualChange((prev) => prev.filter((_, idx) => idx !== selectedPeakIndex))
    setSelectedPeakIndex(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ marginTop: 0 }}>Refine Peaks</h2>
        <p style={{ color: '#4b5563', marginTop: '0.35rem' }}>
          Drag peaks to adjust their position, shift+click on the pressure chart to add new peaks, and press
          delete/backspace to remove the selected marker. Use the list below to make precise edits.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.85rem 1rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          background: '#f9fafb',
          marginBottom: '0.75rem',
        }}
      >
        <span style={{ color: '#374151' }}>Shift+Click to add, Drag to move, Click+Delete to remove</span>
        <button
          type="button"
          onClick={handleRemoveSelected}
          disabled={selectedPeakIndex === null}
          style={{ marginLeft: 'auto' }}
        >
          Remove selected peak
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ position: 'relative', height: 420 }}>
          <LineChart
            title="Pressure with editable peaks"
            points={pressurePoints}
            xLabel="Elapsed Time (s)"
            yLabel="Bladder Pressure"
            height={420}
            markers={sortedPeaks.map((peak, idx) => ({ x: peak.time, y: peak.value, label: `P${idx + 1}` }))}
          />
          <PeakEditorOverlay
            points={pressurePoints}
            peaks={peaks}
            setPeaks={applyManualChange}
            height={420}
            selectedIndex={selectedPeakIndex}
            onSelect={setSelectedPeakIndex}
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

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
        <button type="button" onClick={handleClearManual} disabled={autoPeaks.length === 0}>
          Clear manual edits
        </button>
        <button onClick={onConfirmPeaks} disabled={peaksConfirmed || peaks.length === 0}>
          {peaksConfirmed ? 'Peaks confirmed' : 'Confirm Peaks'}
        </button>
        {peaksConfirmed && <span style={{ color: '#047857' }}>Peak list confirmed.</span>}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>Detected peaks</h3>
          <span style={{ color: '#4b5563' }}>Edit the list to add or remove rows.</span>
        </div>
        {sortedPeaks.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No peaks detected yet.</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>#</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>Time</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>Value</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>Source</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedPeaks.map((peak, idx) => (
                <tr key={`peak-row-${idx}`}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textAlign: 'center' }}>{idx + 1}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{peak.time.toFixed(2)}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{peak.value.toFixed(2)}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textTransform: 'capitalize' }}>{peak.source}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>
                    <button type="button" onClick={() => handleDelete(idx)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

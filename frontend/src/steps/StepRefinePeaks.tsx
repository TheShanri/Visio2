import { Dispatch, SetStateAction } from 'react'
import { LineChart } from '../components/LineChart'
import PeakEditorOverlay from '../components/PeakEditorOverlay'
import { Peak } from '../types'
import { Point } from '../lib/series'

type StepRefinePeaksProps = {
  scalePoints: Point[]
  volumePoints: Point[]
  pressurePoints: Point[]
  peaks: Peak[]
  setPeaks: Dispatch<SetStateAction<Peak[]>>
  pressurePreview: { 'Elapsed Time': number; 'Bladder Pressure': number }[]
  onConfirmPeaks: () => void
  peaksConfirmed: boolean
}

export function StepRefinePeaks({
  scalePoints,
  volumePoints,
  pressurePoints,
  peaks,
  setPeaks,
  pressurePreview,
  onConfirmPeaks,
  peaksConfirmed,
}: StepRefinePeaksProps) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Refine Peaks</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        <LineChart title="Scale Over Time" points={scalePoints} xLabel="Elapsed Time (s)" yLabel="Scale" />
        <LineChart title="Volume Over Time" points={volumePoints} xLabel="Elapsed Time (s)" yLabel="Tot Infused Vol" />
        <div style={{ position: 'relative', height: 320 }}>
          <LineChart
            title="Pressure Over Time"
            points={pressurePoints}
            xLabel="Elapsed Time (s)"
            yLabel="Bladder Pressure"
            height={320}
          />
          <PeakEditorOverlay points={pressurePoints} peaks={peaks} setPeaks={setPeaks} height={320} />
        </div>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onConfirmPeaks} disabled={peaksConfirmed}>
          {peaksConfirmed ? 'Peaks confirmed' : 'Confirm peaks'}
        </button>
        {peaksConfirmed && <span style={{ color: '#047857' }}>Peak list confirmed.</span>}
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
    </div>
  )
}

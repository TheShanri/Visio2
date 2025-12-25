import { useMemo } from 'react'
import { LineChart } from '../components/LineChart'
import { SegmentPanel } from '../components/SegmentPanel'
import { SegmentTable } from '../components/SegmentTable'
import { Peak, Segment, SegmentParams, SegmentPoint } from '../types'
import { Point } from '../lib/series'

type StepSegmentsProps = {
  pressurePoints: Point[]
  scalePoints: Point[]
  volumePoints: Point[]
  peaks: Peak[]
  peaksConfirmed: boolean
  onsetPoints: SegmentPoint[]
  emptyPoints: SegmentPoint[]
  segments: Segment[]
  onDerive: () => void
  isDeriving: boolean
  error: string
  segmentParams: SegmentParams
  onSegmentParamsChange: (params: SegmentParams) => void
  segmentsDerived: boolean
}

export function StepSegments({
  pressurePoints,
  scalePoints,
  volumePoints,
  peaks,
  peaksConfirmed,
  onsetPoints,
  emptyPoints,
  segments,
  onDerive,
  isDeriving,
  error,
  segmentParams,
  onSegmentParamsChange,
  segmentsDerived,
}: StepSegmentsProps) {
  const sortedPeaks = useMemo(() => [...peaks].sort((a, b) => a.time - b.time), [peaks])

  const markers = useMemo(() => {
    const combined: { x: number; y: number; label: string; shape: 'circle' | 'triangle' | 'square'; color: string }[] = []

    sortedPeaks.forEach((peak, idx) => {
      combined.push({ x: peak.time, y: peak.value, label: `P${idx + 1}`, shape: 'circle', color: '#dc2626' })
    })

    onsetPoints.forEach((point, idx) => {
      combined.push({ x: point.time, y: point.value, label: `O${idx + 1}`, shape: 'triangle', color: '#2563eb' })
    })

    emptyPoints.forEach((point, idx) => {
      combined.push({ x: point.time, y: point.value, label: `E${idx + 1}`, shape: 'square', color: '#059669' })
    })

    return combined
  }, [emptyPoints, onsetPoints, sortedPeaks])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ marginTop: 0 }}>Detect Onset / Empty</h2>
        <p style={{ color: '#4b5563', marginTop: '0.35rem' }}>
          Derive onset and empty points for each confirmed peak to review segment-level metrics. Peaks are locked in
          this step; return to Refine Peaks if edits are needed.
        </p>
      </div>

      <SegmentPanel
        params={segmentParams}
        onParamsChange={onSegmentParamsChange}
        onDerive={onDerive}
        disabled={!peaksConfirmed}
        isDeriving={isDeriving}
        error={error}
        segmentsDerived={segmentsDerived}
      />

      <div style={{ position: 'relative', height: 420 }}>
        <LineChart
          title="Pressure with peaks, onset, and empty markers"
          points={pressurePoints}
          xLabel="Elapsed Time (s)"
          yLabel="Bladder Pressure"
          height={420}
          markers={markers}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        <LineChart
          title="Scale (windowed)"
          points={scalePoints}
          xLabel="Elapsed Time (s)"
          yLabel="Scale"
          height={240}
        />
        <LineChart
          title="Volume (windowed)"
          points={volumePoints}
          xLabel="Elapsed Time (s)"
          yLabel="Tot Infused Vol"
          height={240}
        />
      </div>

      <SegmentTable segments={segments} />
    </div>
  )
}

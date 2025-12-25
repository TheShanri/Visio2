import { useEffect, useMemo, useRef, useState } from 'react'
import { LineChart } from '../components/LineChart'
import { SegmentPanel } from '../components/SegmentPanel'
import { SegmentTable } from '../components/SegmentTable'
import { Peak, Segment, SegmentParams, SegmentPoint } from '../types'
import { Point } from '../lib/series'

type MarkerShape = 'circle' | 'triangle' | 'square'

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
  onsetEmptyConfirmed: boolean
  onConfirmOnsetEmpty: () => void
  onUpdatePoints: (onset: SegmentPoint[], empty: SegmentPoint[]) => void
}

function createLinearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  const rSpan = r1 - r0
  const scale = (value: number) => r0 + ((value - d0) / span) * rSpan
  const invert = (value: number) => d0 + ((value - r0) / rSpan) * span
  return { scale, invert }
}

type RefinementChartProps = {
  pressurePoints: Point[]
  peaks: Peak[]
  onsetPoints: SegmentPoint[]
  emptyPoints: SegmentPoint[]
  refineEnabled: boolean
  onMove: (kind: 'onset' | 'empty', idx: number, time: number) => void
  onAddAt: (time: number) => void
  addMode: 'onset' | 'empty' | null
}

function RefinementChart({
  pressurePoints,
  peaks,
  onsetPoints,
  emptyPoints,
  refineEnabled,
  onMove,
  onAddAt,
  addMode,
}: RefinementChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [width, setWidth] = useState<number>(640)
  const [drag, setDrag] = useState<{ kind: 'onset' | 'empty'; idx: number } | null>(null)

  const sortedPoints = useMemo(() => [...pressurePoints].sort((a, b) => a.x - b.x), [pressurePoints])
  const sortedPeaks = useMemo(() => [...peaks].sort((a, b) => a.time - b.time), [peaks])

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const handleResize = () => {
      const bounds = svgElement.getBoundingClientRect()
      setWidth(bounds.width || 640)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (sortedPoints.length === 0) {
    return <LineChart title="Pressure" points={pressurePoints} xLabel="Elapsed Time (s)" yLabel="Bladder Pressure" />
  }

  const height = 420
  const margin = { top: 24, right: 24, bottom: 48, left: 64 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const xMin = sortedPoints[0].x
  const xMax = sortedPoints[sortedPoints.length - 1].x
  const yValues = sortedPoints.map((p) => p.y)
  const yMin = Math.min(...yValues)
  const yMax = Math.max(...yValues)
  const yPadding = (yMax - yMin) * 0.05 || 1

  const xScale = createLinearScale([xMin, xMax], [0, innerWidth])
  const yScale = createLinearScale([yMin - yPadding, yMax + yPadding], [innerHeight, 0])

  const pathData = sortedPoints
    .map((point, idx) => {
      const x = xScale.scale(point.x)
      const y = yScale.scale(point.y)
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  const markers = useMemo(() => {
    const combined: { x: number; y: number; label: string; shape: MarkerShape; color: string; kind?: 'onset' | 'empty'; idx?: number }[] = []

    sortedPeaks.forEach((peak, idx) => {
      combined.push({ x: peak.time, y: peak.value, label: `P${idx + 1}`, shape: 'circle', color: '#dc2626' })
    })

    onsetPoints.forEach((point, idx) => {
      if (point?.time == null || point?.value == null) return
      combined.push({ x: point.time, y: point.value, label: `O${idx + 1}`, shape: 'triangle', color: '#2563eb', kind: 'onset', idx })
    })

    emptyPoints.forEach((point, idx) => {
      if (point?.time == null || point?.value == null) return
      combined.push({ x: point.time, y: point.value, label: `E${idx + 1}`, shape: 'square', color: '#059669', kind: 'empty', idx })
    })

    return combined
  }, [emptyPoints, onsetPoints, sortedPeaks])

  const handlePointer = (event: React.MouseEvent<SVGRectElement, MouseEvent>) => {
    if (!refineEnabled) return
    const rect = event.currentTarget.getBoundingClientRect()
    const mx = event.clientX - rect.left
    const time = xScale.invert(mx)

    if (drag) {
      onMove(drag.kind, drag.idx, time)
      return
    }

    if (addMode) {
      onAddAt(time)
    }
  }

  return (
    <svg ref={svgRef} role="img" aria-label="Pressure refinement" style={{ width: '100%', height }}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <path d={pathData} fill="none" stroke="#2563eb" strokeWidth={2} />

        {markers.map((marker, idx) => {
          const color = marker.color || '#dc2626'
          const shape = marker.shape || 'circle'
          const interactive = refineEnabled && marker.kind
          return (
            <g
              key={`marker-${idx}`}
              transform={`translate(${xScale.scale(marker.x)},${yScale.scale(marker.y)})`}
              onMouseDown={(e) => {
                if (!interactive) return
                e.stopPropagation()
                setDrag({ kind: marker.kind as 'onset' | 'empty', idx: marker.idx ?? 0 })
              }}
              onMouseUp={() => setDrag(null)}
              style={{ cursor: interactive ? 'ew-resize' : 'default' }}
            >
              {shape === 'triangle' && (
                <polygon points="0,-7 7,7 -7,7" fill={color} stroke="#fff" strokeWidth={1.5} />
              )}
              {shape === 'square' && (
                <rect x={-5} y={-5} width={10} height={10} fill={color} stroke="#fff" strokeWidth={1.5} />
              )}
              {shape === 'circle' && <circle r={4.5} fill={color} stroke="#fff" strokeWidth={1.5} />}
              {marker.label && (
                <text x={8} y={4} fontSize={12} fill="#111">
                  {marker.label}
                </text>
              )}
            </g>
          )
        })}

        <rect
          x={0}
          y={0}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          onMouseMove={(e) => {
            if (!drag) return
            const rectBounds = e.currentTarget.getBoundingClientRect()
            const mx = e.clientX - rectBounds.left
            const time = xScale.invert(mx)
            onMove(drag.kind, drag.idx, time)
          }}
          onMouseUp={() => setDrag(null)}
          onMouseLeave={() => setDrag(null)}
          onClick={handlePointer}
          style={{ cursor: refineEnabled ? 'crosshair' : 'default' }}
        />
      </g>
      <text x={margin.left} y={margin.top / 1.5} fontSize={16} fontWeight={600}>
        Pressure with peaks, onset, and empty markers
      </text>
    </svg>
  )
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
  onsetEmptyConfirmed,
  onConfirmOnsetEmpty,
  onUpdatePoints,
}: StepSegmentsProps) {
  const sortedPeaks = useMemo(() => [...peaks].sort((a, b) => a.time - b.time), [peaks])
  const [refineEnabled, setRefineEnabled] = useState<boolean>(false)
  const [activeSegment, setActiveSegment] = useState<number>(0)
  const [addMode, setAddMode] = useState<'onset' | 'empty' | null>(null)

  useEffect(() => {
    setActiveSegment(0)
  }, [segments.length])

  const sortedPressure = useMemo(() => [...pressurePoints].sort((a, b) => a.x - b.x), [pressurePoints])

  const derivatives = useMemo(() => {
    if (sortedPressure.length < 2) return sortedPressure.map(() => 0)
    const values = sortedPressure.map((p) => p.y)
    const times = sortedPressure.map((p) => p.x)
    const result: number[] = []
    for (let i = 0; i < values.length; i++) {
      if (i === 0) {
        const dt = times[1] - times[0] || 1
        result.push((values[1] - values[0]) / dt)
      } else {
        const dt = times[i] - times[i - 1] || 1
        result.push((values[i] - values[i - 1]) / dt)
      }
    }
    return result
  }, [sortedPressure])

  const snapPoint = (time: number, kind: 'onset' | 'empty'): { x: number; y: number; idx: number } => {
    if (sortedPressure.length === 0) {
      return { x: time, y: 0, idx: 0 }
    }
    const slopeThreshold = segmentParams.slopeThreshold ?? 0.02
    const flatThreshold = segmentParams.flatSlopeThreshold ?? 0.01
    let bestIdx = 0
    let bestDelta = Number.MAX_VALUE
    sortedPressure.forEach((p, idx) => {
      const delta = Math.abs(p.x - time)
      const slopeOk = kind === 'onset' ? derivatives[idx] >= slopeThreshold : Math.abs(derivatives[idx]) <= flatThreshold
      if (slopeOk && delta < bestDelta) {
        bestDelta = delta
        bestIdx = idx
      }
    })
    if (bestDelta === Number.MAX_VALUE) {
      sortedPressure.forEach((p, idx) => {
        const delta = Math.abs(p.x - time)
        if (delta < bestDelta) {
          bestDelta = delta
          bestIdx = idx
        }
      })
    }
    const target = sortedPressure[bestIdx]
    return { x: target.x, y: target.y, idx: bestIdx }
  }

  const applyMove = (kind: 'onset' | 'empty', idx: number, time: number) => {
    const snap = snapPoint(time, kind)
    const nextOnset = [...onsetPoints]
    const nextEmpty = [...emptyPoints]
    if (kind === 'onset') {
      nextOnset[idx] = { time: snap.x, value: snap.y, index: snap.idx }
    } else {
      nextEmpty[idx] = { time: snap.x, value: snap.y, index: snap.idx }
    }
    onUpdatePoints(nextOnset, nextEmpty)
  }

  const handleAddAt = (time: number) => {
    if (addMode === null || segments.length === 0) return
    const snap = snapPoint(time, addMode)
    const nextOnset = [...onsetPoints]
    const nextEmpty = [...emptyPoints]
    const targetIndex = Math.min(activeSegment, segments.length - 1)
    if (addMode === 'onset') {
      nextOnset[targetIndex] = { time: snap.x, value: snap.y, index: snap.idx }
    } else {
      nextEmpty[targetIndex] = { time: snap.x, value: snap.y, index: snap.idx }
    }
    onUpdatePoints(nextOnset, nextEmpty)
    setAddMode(null)
  }

  const handleDelete = (kind: 'onset' | 'empty') => {
    const nextOnset = [...onsetPoints]
    const nextEmpty = [...emptyPoints]
    if (kind === 'onset') {
      nextOnset[activeSegment] = { time: null, value: null }
    } else {
      nextEmpty[activeSegment] = { time: null, value: null }
    }
    onUpdatePoints(nextOnset, nextEmpty)
  }

  const markers = useMemo(() => {
    const combined: { x: number; y: number; label: string; shape: MarkerShape; color: string }[] = []

    sortedPeaks.forEach((peak, idx) => {
      combined.push({ x: peak.time, y: peak.value, label: `P${idx + 1}`, shape: 'circle', color: '#dc2626' })
    })

    onsetPoints.forEach((point, idx) => {
      if (point?.time == null || point?.value == null) return
      combined.push({ x: point.time, y: point.value, label: `O${idx + 1}`, shape: 'triangle', color: '#2563eb' })
    })

    emptyPoints.forEach((point, idx) => {
      if (point?.time == null || point?.value == null) return
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

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="checkbox" checked={refineEnabled} onChange={(e) => setRefineEnabled(e.target.checked)} />
          <span style={{ fontWeight: 600 }}>Refine onset/empty</span>
        </label>
        <button type="button" onClick={onDerive} disabled={isDeriving || !peaksConfirmed}>
          {isDeriving ? 'Re-running detection...' : 'Re-run detection'}
        </button>
        <button
          type="button"
          onClick={onConfirmOnsetEmpty}
          disabled={!segmentsDerived || isDeriving || !peaksConfirmed}
        >
          {onsetEmptyConfirmed ? 'Onset/Empty Confirmed' : 'Confirm onset/empty'}
        </button>
        <span style={{ color: '#6b7280' }}>
          {refineEnabled
            ? 'Drag triangles and squares to adjust. Click chart while adding to place points.'
            : 'Enable refinement to edit markers.'}
        </span>
      </div>

      {refineEnabled ? (
        <div style={{ position: 'relative', height: 420 }}>
          <RefinementChart
            pressurePoints={pressurePoints}
            peaks={sortedPeaks}
            onsetPoints={onsetPoints}
            emptyPoints={emptyPoints}
            refineEnabled={refineEnabled}
            onMove={applyMove}
            onAddAt={handleAddAt}
            addMode={addMode}
          />
        </div>
      ) : (
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
      )}

      {refineEnabled && (
        <div
          style={{
            padding: '0.75rem 1rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            background: '#f9fafb',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontWeight: 600 }}>Active segment</span>
            <select value={activeSegment} onChange={(e) => setActiveSegment(Number(e.target.value))}>
              {segments.map((segment) => (
                <option key={segment.i} value={segment.i}>{`Segment ${segment.i + 1}`}</option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={() => setAddMode('onset')} disabled={addMode === 'onset'}>
              {addMode === 'onset' ? 'Click chart to place onset' : 'Add onset'}
            </button>
            <button type="button" onClick={() => setAddMode('empty')} disabled={addMode === 'empty'}>
              {addMode === 'empty' ? 'Click chart to place empty' : 'Add empty'}
            </button>
            <button type="button" onClick={() => handleDelete('onset')}>Delete onset</button>
            <button type="button" onClick={() => handleDelete('empty')}>Delete empty</button>
          </div>
        </div>
      )}

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

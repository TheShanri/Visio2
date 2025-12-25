import { useMemo, useState } from 'react'
import { SummaryCards } from '../components/SummaryCards'
import { LineChart } from '../components/LineChart'
import { RangeSlider } from '../components/RangeSlider'
import { Point, formatNumber } from '../lib/series'

type WindowBounds = { min: number; max: number }
type WindowSelection = { start: number; end: number }

type StepWindowProps = {
  windowRange: WindowBounds | null
  windowSelection: WindowSelection | null
  experimentWindow: WindowSelection | null
  windowedDuration: number
  windowedMaxPressure: number
  windowedFinalVolume: number
  scalePoints: Point[]
  volumePoints: Point[]
  pressurePoints: Point[]
  actionStatus: string
  onWindowChange: (start: number, end: number) => void
  onConfirmWindow: () => void
  onResetWindow: () => void
}

export function StepWindow({
  windowRange,
  windowSelection,
  experimentWindow,
  windowedDuration,
  windowedMaxPressure,
  windowedFinalVolume,
  scalePoints,
  volumePoints,
  pressurePoints,
  actionStatus,
  onWindowChange,
  onConfirmWindow,
  onResetWindow,
}: StepWindowProps) {
  const [showSelector, setShowSelector] = useState(false)

  const windowDirty = useMemo(() => {
    if (!experimentWindow) return true
    if (!windowSelection) return true
    return (
      experimentWindow.start !== windowSelection.start || experimentWindow.end !== windowSelection.end
    )
  }, [experimentWindow, windowSelection])

  const hasSelection = Boolean(windowRange && windowSelection)
  const span = useMemo(() => {
    if (!windowSelection) return 0
    return Math.max(windowSelection.end - windowSelection.start, 0)
  }, [windowSelection])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>View &amp; Select Data Range</h2>
          <p style={{ margin: '0.25rem 0', color: '#4b5563' }}>
            Use the double-handled slider to bracket the experiment window. Stats and charts update live as you
            adjust.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowSelector((prev) => !prev)}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '10px',
            background: '#111827',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Select Experiment Window
        </button>
      </div>

      <SummaryCards
        duration={windowedDuration}
        maxPressure={windowedMaxPressure}
        finalVolume={windowedFinalVolume}
      />

      {showSelector && (
        <div
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.25rem',
            background: '#f8fafc',
            marginBottom: '1.25rem',
          }}
        >
          {hasSelection && windowRange && windowSelection ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>Window start</div>
                  <div style={{ fontWeight: 700 }}>{formatNumber(windowSelection.start)} s</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>Window end</div>
                  <div style={{ fontWeight: 700 }}>{formatNumber(windowSelection.end)} s</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>Span</div>
                  <div style={{ fontWeight: 700 }}>{formatNumber(span)} s</div>
                </div>
              </div>

              <RangeSlider
                min={windowRange.min}
                max={windowRange.max}
                start={windowSelection.start}
                end={windowSelection.end}
                onChange={onWindowChange}
              />

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={onConfirmWindow}
                  disabled={!windowSelection || !windowDirty}
                  style={{
                    padding: '0.65rem 1.2rem',
                    background: windowSelection && windowDirty ? '#2563eb' : '#cbd5e1',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: windowSelection && windowDirty ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  {experimentWindow && !windowDirty ? 'Window Confirmed' : 'Confirm Window'}
                </button>
                <button
                  type="button"
                  onClick={onResetWindow}
                  disabled={!windowRange}
                  style={{
                    padding: '0.65rem 1.2rem',
                    background: '#fff',
                    color: '#111827',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    cursor: windowRange ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  Reset Window
                </button>
                {windowDirty && experimentWindow && (
                  <span style={{ alignSelf: 'center', color: '#b91c1c' }}>
                    Window changed since last confirmation — confirm to lock it in.
                  </span>
                )}
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: '#6b7280' }}>Upload data to enable window selection.</p>
          )}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
      }}>
        <LineChart title="Scale" points={scalePoints} xLabel="Elapsed Time (s)" yLabel="Scale" height={240} />
        <LineChart
          title="Volume"
          points={volumePoints}
          xLabel="Elapsed Time (s)"
          yLabel="Tot Infused Vol"
          height={240}
        />
        <LineChart
          title="Pressure"
          points={pressurePoints}
          xLabel="Elapsed Time (s)"
          yLabel="Bladder Pressure"
          height={240}
        />
      </div>

      {actionStatus && <p style={{ marginTop: '0.75rem' }}>{actionStatus}</p>}
    </div>
  )
}

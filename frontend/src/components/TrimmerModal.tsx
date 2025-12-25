import { Dispatch, SetStateAction, useMemo } from 'react'
import { Point, formatNumber } from '../lib/series'
import { Interval } from '../lib/trimming'
import InteractiveLineChart from './InteractiveLineChart'

type PendingSelection = { start?: number; end?: number }

type TrimmerModalProps = {
  isOpen: boolean
  onClose: () => void
  pressurePoints: Point[]
  pending: PendingSelection
  setPending: Dispatch<SetStateAction<PendingSelection>>
  trims: Interval[]
  onApplyPending: () => void
  onUndo: () => void
  onRestore: () => void
}

export function TrimmerModal({
  isOpen,
  onClose,
  pressurePoints,
  pending,
  setPending,
  trims,
  onApplyPending,
  onUndo,
  onRestore,
}: TrimmerModalProps) {
  const hasSelection = pending.start !== undefined && pending.end !== undefined

  const selectionLabel = useMemo(() => {
    if (!hasSelection) return 'Selected range to keep: —'
    return `Selected range to keep: ${formatNumber(pending.start!)}s → ${formatNumber(pending.end!)}s`
  }, [hasSelection, pending.end, pending.start])

  const handleSelectX = (x: number) => {
    setPending((prev) => {
      if (prev.start === undefined || prev.end !== undefined) {
        return { start: x }
      }
      const startVal = prev.start
      return x >= startVal ? { start: startVal, end: x } : { start: x, end: startVal }
    })
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '1.25rem',
          width: 'min(960px, 90vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close trimmer"
          style={{
            position: 'absolute',
            top: '0.5rem',
            right: '0.5rem',
            background: 'transparent',
            border: 'none',
            fontSize: '1.25rem',
            cursor: 'pointer',
          }}
        >
          ×
        </button>

        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Pressure Trimmer</h2>
        <p style={{ marginTop: 0, color: '#444' }}>
          Click the chart to mark a start point and then an end point for trimming. Use Apply to keep the
          interval.
        </p>

        <InteractiveLineChart
          points={pressurePoints}
          selectedStart={pending.start}
          selectedEnd={pending.end}
          onSelectX={handleSelectX}
          title="Pressure"
          xLabel="Elapsed Time (s)"
          yLabel="Bladder Pressure"
        />

        <p style={{ fontWeight: 600, minHeight: '28px', marginTop: '0.5rem' }}>{selectionLabel}</p>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
          <button onClick={onApplyPending} disabled={!hasSelection}>
            Apply selection
          </button>
          <button onClick={onUndo} disabled={trims.length === 0}>
            Undo
          </button>
          <button onClick={onRestore} disabled={trims.length === 0}>
            Restore original
          </button>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Kept range summary</h3>
          {trims.length === 0 ? (
            <p style={{ color: '#444' }}>No ranges selected yet.</p>
          ) : (
            <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
              {trims.map((trim, idx) => (
                <li key={`trim-${idx}`}>
                  Selection {idx + 1}: {formatNumber(trim.start)}s–{formatNumber(trim.end)}s
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrimmerModal

import { SegmentParams } from '../types'

type SegmentPanelProps = {
  params: SegmentParams
  onParamsChange: (params: SegmentParams) => void
  onDerive: () => void
  disabled: boolean
  isDeriving: boolean
  error: string
  segmentsDerived: boolean
}

const PARAM_FIELDS: { key: keyof SegmentParams; label: string; helper?: string; step?: string; min?: number }[] = [
  { key: 'medianKernel', label: 'Median kernel (odd)', helper: 'Odd-sized kernel for median smoothing.', step: '1', min: 1 },
  { key: 'maWindowSec', label: 'Moving average window (s)', helper: 'Light smoothing window in seconds.', step: '0.1', min: 0 },
  { key: 'derivativeWindowSec', label: 'Derivative window (s)', helper: 'Window for computing dp/dt.', step: '0.1', min: 0 },
  { key: 'preWindowSec', label: 'Onset lookback window (s)', helper: 'Search window before the peak.', step: '1', min: 1 },
  { key: 'guardSec', label: 'Guard before peak (s)', helper: 'Exclude a guard band immediately before the peak.', step: '1', min: 0 },
  { key: 'kNoise', label: 'Noise multiplier (k)', helper: 'Threshold multiplier on MAD noise.', step: '0.1', min: 0 },
  { key: 'slopeThreshold', label: 'Rise slope threshold', helper: 'dp/dt required for onset.', step: '0.01', min: 0 },
  { key: 'sustainSec', label: 'Onset sustain (s)', helper: 'Duration conditions must hold.', step: '0.5', min: 0 },
  { key: 'minAfterPeakSec', label: 'Min seconds after peak', helper: 'Delay empty search after a peak.', step: '1', min: 0 },
  { key: 'postWindowSec', label: 'Post-peak window (s)', helper: 'Maximum search window after peak.', step: '1', min: 1 },
  { key: 'dropSlopeThreshold', label: 'Drop slope threshold', helper: 'dp/dt threshold to identify main drop.', step: '0.01', min: 0 },
  { key: 'flatSlopeThreshold', label: 'Flat slope threshold', helper: 'Max |dp/dt| for empty flatline.', step: '0.01', min: 0 },
  { key: 'flatToleranceKNoise', label: 'Flat tolerance (k * noise)', helper: 'Tolerance around flat baseline.', step: '0.1', min: 0 },
  { key: 'dwellSec', label: 'Dwell (s)', helper: 'Duration flat criteria must hold.', step: '0.5', min: 0 },
  { key: 'fallbackOnsetSec', label: 'Fallback onset offset (s)', helper: 'Used when onset is not found.', step: '1', min: 0 },
  { key: 'fallbackEmptySec', label: 'Fallback empty offset (s)', helper: 'Used when empty is not found.', step: '1', min: 0 },
]

export function SegmentPanel({
  params,
  onParamsChange,
  onDerive,
  disabled,
  isDeriving,
  error,
  segmentsDerived,
}: SegmentPanelProps) {
  const updateParam = (key: keyof SegmentParams, raw: string) => {
    const value = raw === '' ? null : Number(raw)
    const next = { ...params, [key]: Number.isFinite(value) ? value : null }
    onParamsChange(next)
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        background: '#f9fafb',
      }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={onDerive} disabled={disabled || isDeriving}>
          {isDeriving ? 'Deriving...' : 'Derive Segments'}
        </button>
        <span style={{ color: '#374151' }}>
          Use the controls below to adjust detection parameters. Derivation re-runs automatically when parameters
          change after an initial run.
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {!segmentsDerived && !error && (
            <span style={{ color: '#6b7280' }}>
              {disabled ? 'Confirm peaks to enable derivation.' : 'Derive segments to enable the next step.'}
            </span>
          )}
          {segmentsDerived && <span style={{ color: '#047857' }}>Segments derived.</span>}
          {error && <span style={{ color: '#b91c1c' }}>{error}</span>}
        </div>
      </div>

      <details style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
        <summary style={{ padding: '0.75rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
          Advanced onset / empty parameters
        </summary>
        <div
          style={{
            padding: '0.75rem 1rem',
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          {PARAM_FIELDS.map((field) => (
            <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontWeight: 600, color: '#111827' }}>{field.label}</span>
              <input
                type="number"
                step={field.step}
                min={field.min}
                value={params[field.key] ?? ''}
                onChange={(e) => updateParam(field.key, e.target.value)}
                disabled={disabled || isDeriving}
              />
              {field.helper && <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>{field.helper}</span>}
            </label>
          ))}
        </div>
      </details>
    </div>
  )
}

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
  {
    key: 'onsetGradient',
    label: 'Onset gradient (≥)',
    helper: 'Minimum gradient to consider as onset (pressure units/sec).',
    step: '0.1',
  },
  {
    key: 'onsetPressureDrop',
    label: 'Onset pressure drop (≥)',
    helper: 'Minimum drop from peak to qualify as onset.',
    step: '0.1',
  },
  {
    key: 'emptyPressureDrop',
    label: 'Empty pressure drop (≥)',
    helper: 'Minimum drop from peak to qualify as empty.',
    step: '0.1',
  },
  {
    key: 'minAfterPeakSec',
    label: 'Min seconds after peak',
    helper: 'Do not search for empty points until this duration after the peak.',
    step: '1',
    min: 0,
  },
  {
    key: 'searchStartAfterPrevPeakSec',
    label: 'Search start after prev peak (s)',
    helper: 'Offset after prior peak before searching for the next onset.',
    step: '1',
    min: 0,
  },
  {
    key: 'fallbackOnsetSec',
    label: 'Fallback onset offset (s)',
    helper: 'Used when gradient-based onset is not found.',
    step: '1',
    min: 0,
  },
  {
    key: 'fallbackEmptySec',
    label: 'Fallback empty offset (s)',
    helper: 'Used when empty detection does not find a match.',
    step: '1',
    min: 0,
  },
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

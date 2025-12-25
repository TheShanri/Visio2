import React from 'react'

type RangeSliderProps = {
  min: number
  max: number
  start: number
  end: number
  step?: number
  onChange: (start: number, end: number) => void
}

export function RangeSlider({ min, max, start, end, step = 0.01, onChange }: RangeSliderProps) {
  const clampedStart = Math.max(min, Math.min(start, max))
  const clampedEnd = Math.max(min, Math.min(end, max))
  const range = Math.max(max - min, 0.0001)

  const startPercent = ((clampedStart - min) / range) * 100
  const endPercent = ((clampedEnd - min) / range) * 100

  const handleStartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    onChange(value, clampedEnd)
  }

  const handleEndChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value)
    onChange(clampedStart, value)
  }

  return (
    <div style={{ position: 'relative', padding: '1.5rem 0 0.5rem' }}>
      <div
        aria-hidden
        style={{
          position: 'relative',
          height: '6px',
          borderRadius: '999px',
          background: '#e5e7eb',
        }}
      >
        <div
          style={{
            position: 'absolute',
            height: '100%',
            borderRadius: '999px',
            background: '#2563eb',
            left: `${startPercent}%`,
            width: `${Math.max(endPercent - startPercent, 0)}%`,
          }}
        />
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedStart}
        onChange={handleStartChange}
        style={sliderThumbStyle}
        aria-label="Start of experiment window"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clampedEnd}
        onChange={handleEndChange}
        style={sliderThumbStyle}
        aria-label="End of experiment window"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', color: '#4b5563' }}>
        <span>{min.toFixed(2)}s</span>
        <span>{max.toFixed(2)}s</span>
      </div>
    </div>
  )
}

const sliderThumbStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  width: '100%',
  pointerEvents: 'auto',
  background: 'transparent',
  WebkitAppearance: 'none',
  appearance: 'none',
  height: '0',
}

// Thumb styles for webkit
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error vendor prefixes
sliderThumbStyle['WebkitSliderThumb'] = {
  WebkitAppearance: 'none',
  appearance: 'none',
  height: '18px',
  width: '18px',
  borderRadius: '50%',
  background: '#2563eb',
  border: '2px solid #fff',
  boxShadow: '0 0 0 1px #2563eb, 0 6px 12px rgba(37,99,235,0.25)',
}

// Thumb styles for Mozilla
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error vendor prefixes
sliderThumbStyle['MozRangeThumb'] = {
  height: '18px',
  width: '18px',
  borderRadius: '50%',
  background: '#2563eb',
  border: '2px solid #fff',
  boxShadow: '0 0 0 1px #2563eb, 0 6px 12px rgba(37,99,235,0.25)',
}

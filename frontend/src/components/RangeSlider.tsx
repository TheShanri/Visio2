import React, { useEffect } from 'react'

type RangeSliderProps = {
  min: number
  max: number
  start: number
  end: number
  step?: number
  onChange: (start: number, end: number) => void
}

const STYLE_ID = 'visio-range-slider-styles'

export function RangeSlider({ min, max, start, end, step = 0.01, onChange }: RangeSliderProps) {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .rs-wrap { width: 100%; }

      /* Vertical centering reference */
      .rs-rail {
        position: relative;
        height: 32px;
      }

      .rs-track {
        position: absolute;
        left: 0;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        height: 6px;
        border-radius: 999px;
        background: #e5e7eb;
      }

      .rs-fill {
        position: absolute;
        top: 0;
        height: 100%;
        border-radius: 999px;
        background: #2563eb;
      }

      /* Overlapping range inputs */
      .rs-range {
        position: absolute;
        left: 0;
        top: 50%;
        width: 100%;
        transform: translateY(-50%);
        background: transparent;

        pointer-events: none; /* only thumbs receive events */
        -webkit-appearance: none;
        appearance: none;

        height: 32px;
        margin: 0;
      }

      /* Hide default track (we draw our own) */
      .rs-range::-webkit-slider-runnable-track {
        height: 6px;
        background: transparent;
      }
      .rs-range::-moz-range-track {
        height: 6px;
        background: transparent;
      }

      /* Thumb styling */
      .rs-range::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;

        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #2563eb;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px #2563eb, 0 6px 12px rgba(37, 99, 235, 0.25);
        cursor: pointer;

        pointer-events: all;
        position: relative;
        z-index: 3;

        /* WebKit quirk: align thumb center to our 6px custom track */
        margin-top: -6px;
      }

      .rs-range::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #2563eb;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px #2563eb, 0 6px 12px rgba(37, 99, 235, 0.25);
        cursor: pointer;
        pointer-events: all;
      }

      .thumb-left { z-index: 4; }
      .thumb-right { z-index: 5; }

      .rs-minmax {
        display: flex;
        justify-content: space-between;
        margin-top: 0.75rem;
        color: #4b5563;
      }
    `
    document.head.appendChild(style)
  }, [])

  const clamp = (v: number) => Math.max(min, Math.min(v, max))
  const clampedStart = clamp(start)
  const clampedEnd = clamp(end)

  const range = Math.max(max - min, 0.0001)
  const startPercent = ((clampedStart - min) / range) * 100
  const endPercent = ((clampedEnd - min) / range) * 100

  const handleStartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const v = clamp(Number(event.target.value))
    const nextStart = Math.min(v, clampedEnd - step)
    onChange(nextStart, clampedEnd)
  }

  const handleEndChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const v = clamp(Number(event.target.value))
    const nextEnd = Math.max(v, clampedStart + step)
    onChange(clampedStart, nextEnd)
  }

  return (
    <div className="rs-wrap">
      <div className="rs-rail">
        <div className="rs-track" aria-hidden>
          <div
            className="rs-fill"
            style={{
              left: `${Math.min(startPercent, endPercent)}%`,
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
          className="rs-range thumb-left"
          aria-label="Start of experiment window"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={clampedEnd}
          onChange={handleEndChange}
          className="rs-range thumb-right"
          aria-label="End of experiment window"
        />
      </div>

      <div className="rs-minmax">
        <span>{min.toFixed(2)}s</span>
        <span>{max.toFixed(2)}s</span>
      </div>
    </div>
  )
}

export default RangeSlider

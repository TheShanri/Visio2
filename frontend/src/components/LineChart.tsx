import { useEffect, useMemo, useRef, useState } from 'react'
import { Point } from '../lib/series'

type Marker = { x: number; y: number; label?: string }

type LineChartProps = {
  title: string
  points: Point[]
  xLabel: string
  yLabel: string
  height?: number
  markers?: Marker[]
}

type HoverState = {
  point: Point
  screenX: number
  screenY: number
}

function generateTicks(min: number, max: number, count = 6): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) return [min]
  const step = (max - min) / Math.max(count - 1, 1)
  return Array.from({ length: count }, (_, idx) => min + idx * step)
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

export function LineChart({ title, points, xLabel, yLabel, height = 280, markers = [] }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [width, setWidth] = useState<number>(640)
  const [hover, setHover] = useState<HoverState | null>(null)

  const sortedPoints = useMemo(() => [...points].sort((a, b) => a.x - b.x), [points])

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

  const margin = { top: 24, right: 24, bottom: 48, left: 64 }
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  if (sortedPoints.length === 0) {
    return (
      <svg ref={svgRef} role="img" aria-label={title} style={{ width: '100%', height }}>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#666"
        >
          No data
        </text>
      </svg>
    )
  }

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

  const xTicks = generateTicks(xMin, xMax)
  const yTicks = generateTicks(yMin - yPadding, yMax + yPadding)

  const handleMouseMove = (event: React.MouseEvent<SVGRectElement, MouseEvent>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const mx = event.clientX - rect.left
    const dataX = xScale.invert(mx)

    let nearest = sortedPoints[0]
    let minDelta = Math.abs(nearest.x - dataX)
    for (const point of sortedPoints) {
      const delta = Math.abs(point.x - dataX)
      if (delta < minDelta) {
        nearest = point
        minDelta = delta
      }
    }

    setHover({
      point: nearest,
      screenX: xScale.scale(nearest.x),
      screenY: yScale.scale(nearest.y),
    })
  }

  return (
    <svg ref={svgRef} role="img" aria-label={title} style={{ width: '100%', height }}>
      <g transform={`translate(${margin.left},${margin.top})`}>
        <path d={pathData} fill="none" stroke="#2563eb" strokeWidth={2} />

        {markers.map((marker, idx) => (
          <g key={`marker-${idx}`} transform={`translate(${xScale.scale(marker.x)},${yScale.scale(marker.y)})`}>
            <circle r={4} fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
            {marker.label && (
              <text x={8} y={4} fontSize={12} fill="#111">
                {marker.label}
              </text>
            )}
          </g>
        ))}

        {/* Axes */}
        <line x1={0} y1={innerHeight} x2={innerWidth} y2={innerHeight} stroke="#111" />
        <line x1={0} y1={0} x2={0} y2={innerHeight} stroke="#111" />

        {xTicks.map((tick, idx) => {
          const x = xScale.scale(tick)
          return (
            <g key={`x-tick-${idx}`} transform={`translate(${x},${innerHeight})`}>
              <line y2={6} stroke="#111" />
              <text y={20} textAnchor="middle" fontSize={12} fill="#111">
                {tick.toFixed(2)}
              </text>
            </g>
          )
        })}

        {yTicks.map((tick, idx) => {
          const y = yScale.scale(tick)
          return (
            <g key={`y-tick-${idx}`} transform={`translate(0,${y})`}>
              <line x2={-6} stroke="#111" />
              <text x={-10} dy={4} textAnchor="end" fontSize={12} fill="#111">
                {tick.toFixed(2)}
              </text>
            </g>
          )
        })}

        {/* Labels */}
        <text x={innerWidth / 2} y={innerHeight + margin.bottom - 8} textAnchor="middle" fill="#111">
          {xLabel}
        </text>
        <text
          transform={`rotate(-90)`}
          x={-innerHeight / 2}
          y={-margin.left + 16}
          textAnchor="middle"
          fill="#111"
        >
          {yLabel}
        </text>

        {/* Hover feedback */}
        {hover && (
          <g transform={`translate(${hover.screenX},${hover.screenY})`}>
            <circle r={4} fill="#dc2626" stroke="#fff" strokeWidth={1.5} />
            <g transform="translate(10,-10)">
              <rect x={0} y={-18} width={140} height={24} rx={4} ry={4} fill="#111" opacity={0.8} />
              <text x={8} y={-2} fill="#fff" fontSize={12}>
                {hover.point.x.toFixed(2)}, {hover.point.y.toFixed(2)}
              </text>
            </g>
          </g>
        )}

        <rect
          x={0}
          y={0}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        />
      </g>
      <text x={margin.left} y={margin.top / 1.5} fontSize={16} fontWeight={600}>
        {title}
      </text>
    </svg>
  )
}

export default LineChart

import { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Point } from '../lib/series'
import { snapToLocalMax } from '../lib/peakEdit'
import { Peak } from '../types'

type PeakEditorOverlayProps = {
  points: Point[]
  peaks: Peak[]
  setPeaks: Dispatch<SetStateAction<Peak[]>>
  height?: number
  windowSec?: number
  selectedIndex: number | null
  onSelect: (index: number | null) => void
}

type Scale = {
  x: (value: number) => number
  y: (value: number) => number
  invertX: (pixel: number) => number
}

const margin = { top: 24, right: 24, bottom: 48, left: 64 }
const DEDUPE_WINDOW_SEC = 0.5

function createScales(points: Point[], width: number, height: number): Scale | null {
  if (points.length === 0) return null

  const sorted = [...points].sort((a, b) => a.x - b.x)
  const innerWidth = width - margin.left - margin.right
  const innerHeight = height - margin.top - margin.bottom

  const xMin = sorted[0].x
  const xMax = sorted[sorted.length - 1].x
  const yValues = sorted.map((p) => p.y)
  const yMin = Math.min(...yValues)
  const yMax = Math.max(...yValues)
  const yPadding = (yMax - yMin) * 0.05 || 1

  const x = (value: number) =>
    margin.left + ((value - xMin) / (xMax - xMin || 1)) * (innerWidth || 1)
  const y = (value: number) =>
    margin.top + innerHeight - ((value - (yMin - yPadding)) / (yMax - yMin + yPadding * 2 || 1)) * innerHeight
  const invertX = (pixel: number) =>
    xMin + ((pixel - margin.left) / (innerWidth || 1)) * (xMax - xMin || 1)

  return { x, y, invertX }
}

export function PeakEditorOverlay({
  points,
  peaks,
  setPeaks,
  height = 280,
  windowSec = 10,
  selectedIndex,
  onSelect,
}: PeakEditorOverlayProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState<number>(640)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null)

  useEffect(() => {
    const handleResize = () => {
      const nextWidth = overlayRef.current?.offsetWidth
      if (nextWidth) {
        setWidth(nextWidth)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const scales = useMemo(() => createScales(points, width, height), [points, width, height])

  const clientToDataX = useCallback(
    (clientX: number) => {
      if (!overlayRef.current || !scales) return null
      const rect = overlayRef.current.getBoundingClientRect()
      const localX = clientX - rect.left
      return scales.invertX(localX)
    },
    [scales]
  )

  const addPeakAt = (x: number) => {
    const snapped = snapToLocalMax(points, x, windowSec)
    if (!snapped) return

    setPeaks((prev) => {
      const alreadyExists = prev.some((peak) => Math.abs(peak.time - snapped.point.x) <= DEDUPE_WINDOW_SEC)
      if (alreadyExists) return prev
      return [...prev, { time: snapped.point.x, value: snapped.point.y, source: 'manual' }]
    })
  }

  const handleBackgroundPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.shiftKey) {
      onSelect(null)
      return
    }
    if (!scales) return

    const dataX = clientToDataX(event.clientX)
    if (dataX === null) return
    addPeakAt(dataX)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedIndex !== null) {
        setPeaks((prev) => prev.filter((_, idx) => idx !== selectedIndex))
        onSelect(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, setPeaks, onSelect])

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (draggingIndex === null) return
      const dataX = clientToDataX(event.clientX)
      if (dataX === null) return
      const snapped = snapToLocalMax(points, dataX, windowSec)
      setPreviewPoint(snapped?.point ?? null)
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (draggingIndex === null) return
      const dataX = clientToDataX(event.clientX)
      if (dataX !== null) {
        const snapped = snapToLocalMax(points, dataX, windowSec)
        if (snapped) {
          setPeaks((prev) =>
            prev.map((peak, idx) =>
              idx === draggingIndex
                ? { ...peak, time: snapped.point.x, value: snapped.point.y, source: 'manual' }
                : peak
            )
          )
          onSelect(draggingIndex)
        }
      }
      setDraggingIndex(null)
      setPreviewPoint(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draggingIndex, points, setPeaks, windowSec, clientToDataX, onSelect])

  if (!scales) return null

  return (
    <div ref={overlayRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div
        onPointerDown={handleBackgroundPointerDown}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', cursor: 'crosshair' }}
      />

      {peaks.map((peak, idx) => {
        const x = scales.x(peak.time)
        const y = scales.y(peak.value)
        const isSelected = idx === selectedIndex

        return (
          <div
            key={`peak-marker-${idx}-${peak.time}`}
            onPointerDown={(event) => {
              event.stopPropagation()
              onSelect(idx)
              setDraggingIndex(idx)
            }}
            style={{
              position: 'absolute',
              transform: `translate(${x - 6}px, ${y - 6}px)`,
              width: 12,
              height: 12,
              borderRadius: '9999px',
              background: isSelected ? '#b91c1c' : '#dc2626',
              border: '2px solid white',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
              cursor: 'grab',
              pointerEvents: 'auto',
            }}
            title="Drag to move. Click to select."
          />
        )
      })}

      {previewPoint && (
        <div
          style={{
            position: 'absolute',
            transform: `translate(${scales.x(previewPoint.x) - 6}px, ${scales.y(previewPoint.y) - 6}px)`,
            width: 12,
            height: 12,
            borderRadius: '9999px',
            background: '#f59e0b',
            border: '2px solid white',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  )
}

export default PeakEditorOverlay

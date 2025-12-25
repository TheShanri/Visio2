import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Point } from '../lib/series'

type LineChartProps = {
  title: string
  points: Point[]
  xLabel: string
  yLabel: string
  height?: number
}

export function LineChart({ title, points, xLabel, yLabel, height = 280 }: LineChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [width, setWidth] = useState<number>(640)

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

  useEffect(() => {
    const svgElement = svgRef.current
    if (!svgElement) return

    const svg = d3.select(svgElement)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`).attr('preserveAspectRatio', 'xMidYMid meet')

    if (sortedPoints.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#666')
        .text('No data')
      return
    }

    const margin = { top: 24, right: 24, bottom: 48, left: 64 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    const xExtent = d3.extent(sortedPoints, (d) => d.x) as [number, number]
    const yExtent = d3.extent(sortedPoints, (d) => d.y) as [number, number]
    const yPadding = (yExtent[1] - yExtent[0]) * 0.05 || 1

    const xScale = d3.scaleLinear().domain(xExtent).range([0, innerWidth])
    const yScale = d3
      .scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([innerHeight, 0])

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const line = d3
      .line<Point>()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX)

    g.append('path').datum(sortedPoints).attr('fill', 'none').attr('stroke', '#2563eb').attr('stroke-width', 2).attr('d', line)

    const xAxis = d3.axisBottom(xScale).ticks(6)
    const yAxis = d3.axisLeft(yScale).ticks(6)

    g.append('g').attr('transform', `translate(0,${innerHeight})`).call(xAxis)
    g.append('g').call(yAxis)

    g
      .append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 8)
      .attr('text-anchor', 'middle')
      .attr('fill', '#111')
      .text(xLabel)

    g
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -innerHeight / 2)
      .attr('y', -margin.left + 16)
      .attr('text-anchor', 'middle')
      .attr('fill', '#111')
      .text(yLabel)

    svg
      .append('text')
      .attr('x', margin.left)
      .attr('y', margin.top / 1.5)
      .attr('font-size', '16px')
      .attr('font-weight', '600')
      .text(title)

    const focus = g.append('g').style('display', 'none')
    focus.append('circle').attr('r', 4).attr('fill', '#dc2626').attr('stroke', '#fff').attr('stroke-width', 1.5)
    const focusText = focus.append('g')
    const textBg = focusText.append('rect').attr('fill', '#111').attr('rx', 4).attr('ry', 4).attr('opacity', 0.8)
    const textLabel = focusText.append('text').attr('fill', '#fff').attr('font-size', '12px').attr('dy', '1em').attr('dx', '0.5em')

    const overlay = g
      .append('rect')
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .on('mouseenter', () => focus.style('display', null))
      .on('mouseleave', () => focus.style('display', 'none'))
      .on('mousemove', onMouseMove)

    const bisect = d3.bisector((d: Point) => d.x).left

    function onMouseMove(event: MouseEvent) {
      const [mx] = d3.pointer(event, overlay.node())
      const x0 = xScale.invert(mx)
      const index = bisect(sortedPoints, x0)
      const clampedIndex = Math.min(Math.max(index, 1), sortedPoints.length - 1)
      const pointA = sortedPoints[clampedIndex - 1]
      const pointB = sortedPoints[clampedIndex]
      const point = x0 - pointA.x > pointB.x - x0 ? pointB : pointA

      const focusX = xScale(point.x)
      const focusY = yScale(point.y)
      focus.attr('transform', `translate(${focusX},${focusY})`)

      const label = `${point.x.toFixed(2)}, ${point.y.toFixed(2)}`
      textLabel.text(label)

      const labelBox = (textLabel.node() as SVGGraphicsElement).getBBox()
      const tooltipWidth = labelBox.width + 8
      const tooltipHeight = labelBox.height + 6
      textBg.attr('width', tooltipWidth).attr('height', tooltipHeight).attr('x', -4).attr('y', -4)

      const padding = 8
      // Start with a preferred offset to the upper-right of the point
      let offsetX = padding
      let offsetY = -tooltipHeight - padding / 2

      // Compute absolute tooltip bounds relative to the chart's inner area
      let tooltipLeft = focusX + offsetX - 4
      let tooltipRight = tooltipLeft + tooltipWidth

      // Flip horizontally when the tooltip would overflow the right edge
      if (tooltipRight > innerWidth - padding) {
        offsetX = -(tooltipWidth + padding) + 4
        tooltipLeft = focusX + offsetX - 4
        tooltipRight = tooltipLeft + tooltipWidth
      }

      // Clamp horizontally to keep the tooltip fully visible with padding
      if (tooltipLeft < padding) {
        offsetX += padding - tooltipLeft
      }

      let tooltipTop = focusY + offsetY - 4

      // Flip vertically when the tooltip would overflow the top edge
      if (tooltipTop < padding) {
        offsetY = padding
        tooltipTop = focusY + offsetY - 4
      }

      // Clamp vertically to stay within the viewport (allow slight bottom overflow)
      if (tooltipTop < padding) {
        offsetY += padding - tooltipTop
      }

      focusText.attr('transform', `translate(${offsetX},${offsetY})`)
    }
  }, [sortedPoints, width, height, xLabel, yLabel, title])

  return <svg ref={svgRef} role="img" aria-label={title} style={{ width: '100%', height }} />
}

export default LineChart

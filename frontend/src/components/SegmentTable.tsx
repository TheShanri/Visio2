import { Segment } from '../types'

type SegmentTableProps = {
  segments: Segment[]
}

function formatNumber(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toFixed(digits)
}

export function SegmentTable({ segments }: SegmentTableProps) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>Segments</h3>
        <span style={{ color: '#4b5563' }}>One row per peak showing onset/empty timing and key metrics.</span>
      </div>
      {segments.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Run "Derive Segments" to populate this table.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 680 }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>Segment</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>Onset time (s)</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>Peak time (s)</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>Empty time (s)</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>IMI (s)</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>Max pressure</th>
                <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>Delta volume</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((segment, idx) => (
                <tr key={`segment-${idx}`}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textAlign: 'center' }}>
                    {segment.i + 1}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{segment.onsetTime.toFixed(2)}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{segment.peakTime.toFixed(2)}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{segment.emptyTime.toFixed(2)}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>
                    {formatNumber(segment.metrics.imiSec)}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>
                    {formatNumber(segment.metrics.maxPressure)}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>
                    {formatNumber(segment.metrics.deltaVolume)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

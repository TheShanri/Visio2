import { ExperimentWindow, Peak, Segment } from '../types'
import { formatNumber } from '../lib/series'

type StepDownloadProps = {
  fileName: string | null
  experimentWindow: ExperimentWindow | null
  peaks: Peak[]
  segments: Segment[]
  isExporting: boolean
  actionStatus: string
  onDownload: () => void
}

export function StepDownload({
  fileName,
  experimentWindow,
  peaks,
  segments,
  isExporting,
  actionStatus,
  onDownload,
}: StepDownloadProps) {
  const summaryItems = [
    { label: 'File name', value: fileName ?? 'Not provided' },
    {
      label: 'Experiment window',
      value:
        experimentWindow !== null
          ? `${formatNumber(experimentWindow.start)} s → ${formatNumber(experimentWindow.end)} s`
          : 'Not set',
    },
    { label: 'Peak count', value: peaks.length },
    { label: 'Segment count', value: segments.length },
  ]

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Download Data</h2>
      <p style={{ margin: '0.25rem 0 1rem', color: '#4b5563' }}>
        Review the finalized details, then export the XLSX report that mirrors exactly what you saw in the
        wizard.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
        }}
      >
        {summaryItems.map((item) => (
          <div
            key={item.label}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '0.9rem 1rem',
              background: '#fff',
            }}
          >
            <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>{item.label}</div>
            <div style={{ fontWeight: 700, marginTop: '0.35rem' }}>{item.value}</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDownload}
        disabled={isExporting}
        style={{
          padding: '0.75rem 1.4rem',
          borderRadius: '12px',
          border: 'none',
          background: isExporting ? '#cbd5e1' : '#2563eb',
          color: '#fff',
          fontWeight: 700,
          cursor: isExporting ? 'not-allowed' : 'pointer',
          boxShadow: '0 10px 30px rgba(37, 99, 235, 0.25)',
        }}
      >
        {isExporting ? 'Preparing...' : 'Download Report (XLSX)'}
      </button>

      {actionStatus && <p style={{ marginTop: '0.75rem' }}>{actionStatus}</p>}
    </div>
  )
}

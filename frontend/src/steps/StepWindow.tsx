import { SessionData } from '../types'
import { SummaryCards } from '../components/SummaryCards'
import { Interval } from '../lib/trimming'

type StepWindowProps = {
  currentData: SessionData | null
  trims: Interval[]
  duration: number
  maxPressure: number
  finalVolume: number
  isExporting: boolean
  actionStatus: string
  windowConfirmed: boolean
  onOpenTrimmer: () => void
  onExportReport: () => void
  onConfirmWindow: () => void
}

export function StepWindow({
  currentData,
  trims,
  duration,
  maxPressure,
  finalVolume,
  isExporting,
  actionStatus,
  windowConfirmed,
  onOpenTrimmer,
  onExportReport,
  onConfirmWindow,
}: StepWindowProps) {
  if (!currentData) {
    return <p>Upload data to select an experiment window.</p>
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>View &amp; Select Data Range</h2>
      <p>
        Scale rows: {currentData.scale.length} | Volume rows: {currentData.volume.length} | Pressure rows:{' '}
        {currentData.pressure.length}
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button onClick={onOpenTrimmer}>Open trimmer</button>
        <button onClick={onExportReport} disabled={isExporting}>
          {isExporting ? 'Exporting...' : 'Export report (XLSX)'}
        </button>
        <button onClick={onConfirmWindow} disabled={windowConfirmed}>
          {windowConfirmed ? 'Window confirmed' : 'Confirm window selection'}
        </button>
      </div>

      <SummaryCards duration={duration} maxPressure={maxPressure} finalVolume={finalVolume} />

      {trims.length > 0 ? (
        <p style={{ marginTop: '0.75rem' }}>Intervals selected: {trims.length}</p>
      ) : (
        <p style={{ marginTop: '0.75rem', color: '#6b7280' }}>No trims applied. Use the trimmer to define the window.</p>
      )}

      {actionStatus && <p style={{ marginTop: '0.5rem' }}>{actionStatus}</p>}
    </div>
  )
}

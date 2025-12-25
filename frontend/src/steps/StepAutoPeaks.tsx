import PeakPanel from '../components/PeakPanel'
import { Peak, PeakParams, SessionData } from '../types'

type StepAutoPeaksProps = {
  pressureRows: SessionData['pressure'] | null
  peakParams: PeakParams | null
  peaks: Peak[]
  onDetect: () => void
  onSkip: () => void
  hasAcknowledged: boolean
  setPeakParams: (params: PeakParams | null) => void
  setPeaks: (peaks: Peak[]) => void
}

export function StepAutoPeaks({
  pressureRows,
  peakParams,
  peaks,
  onDetect,
  onSkip,
  hasAcknowledged,
  setPeakParams,
  setPeaks,
}: StepAutoPeaksProps) {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Auto Detect Peaks</h2>
      <PeakPanel
        pressureRows={pressureRows}
        params={peakParams}
        setParams={setPeakParams}
        peaks={peaks}
        setPeaks={setPeaks}
        onDetect={() => onDetect()}
      />

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onSkip} disabled={hasAcknowledged}>
          {hasAcknowledged ? 'Acknowledged' : 'Proceed without auto-detection'}
        </button>
        {hasAcknowledged && <span style={{ color: '#047857' }}>Auto detection acknowledged.</span>}
      </div>
    </div>
  )
}

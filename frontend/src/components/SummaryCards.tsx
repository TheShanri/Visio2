import { formatNumber } from '../lib/series'

type SummaryCardsProps = {
  duration: number
  maxPressure: number
  finalVolume: number
}

export function SummaryCards({ duration, maxPressure, finalVolume }: SummaryCardsProps) {
  const items = [
    { label: 'Duration', value: `${formatNumber(duration)} s` },
    { label: 'Max Pressure', value: `${formatNumber(maxPressure)} kPa` },
    { label: 'Final Volume', value: `${formatNumber(finalVolume)} mL` },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
      {items.map((item) => (
        <div key={item.label} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem', background: '#f8fafc' }}>
          <div style={{ fontSize: '0.9rem', color: '#4b5563' }}>{item.label}</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 600, marginTop: '0.25rem' }}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}

export default SummaryCards

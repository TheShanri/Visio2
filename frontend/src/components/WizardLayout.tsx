import React from 'react'
import { WizardStepper } from './WizardStepper'

type WizardLayoutProps = {
  currentStep: number
  steps: { number: number; label: string }[]
  onNext: () => void
  onPrev: () => void
  isNextDisabled: boolean
  isPrevDisabled: boolean
  children: React.ReactNode
}

export function WizardLayout({
  currentStep,
  steps,
  onNext,
  onPrev,
  isNextDisabled,
  isPrevDisabled,
  children,
}: WizardLayoutProps) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '2rem' }}>
      <WizardStepper currentStep={currentStep} steps={steps} />

      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem' }}>
        {children}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '1.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <button onClick={onPrev} disabled={isPrevDisabled} style={{ padding: '0.6rem 1rem' }}>
          Previous
        </button>
        <button onClick={onNext} disabled={isNextDisabled} style={{ padding: '0.6rem 1rem' }}>
          Next
        </button>
      </div>
    </div>
  )
}

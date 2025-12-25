import React from 'react'

type Step = {
  label: string
  number: number
}

type WizardStepperProps = {
  currentStep: number
  steps: Step[]
}

export function WizardStepper({ currentStep, steps }: WizardStepperProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number
        const isActive = currentStep === step.number
        const isFuture = currentStep < step.number
        const isLast = index === steps.length - 1

        return (
          <div key={step.number} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '2px solid',
                borderColor: isCompleted ? '#10b981' : isActive ? '#2563eb' : '#d1d5db',
                background: isCompleted ? '#ecfdf3' : isActive ? '#eff6ff' : '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isCompleted ? '#047857' : isActive ? '#1d4ed8' : '#6b7280',
                fontWeight: 700,
              }}
            >
              {isCompleted ? '✓' : step.number}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: isActive ? 700 : 600, color: isActive ? '#111827' : '#4b5563' }}>
                {step.label}
              </span>
              <small style={{ color: isFuture ? '#9ca3af' : '#6b7280' }}>
                {isCompleted ? 'Completed' : isActive ? 'In progress' : 'Waiting'}
              </small>
            </div>
            {!isLast && <div style={{ height: 2, background: isFuture ? '#e5e7eb' : '#10b981', flex: 1 }} />}
          </div>
        )
      })}
    </div>
  )
}

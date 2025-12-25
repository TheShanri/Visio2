import { useEffect, useMemo, useState } from 'react'
import { uploadFile, getApiBase, generateReport } from './api'
import { Peak, PeakParams, SessionData } from './types'
import { computeDuration, computeFinalY, computeMaxY, toPoints } from './lib/series'
import TrimmerModal from './components/TrimmerModal'
import { Interval, filterRowsByIntervals } from './lib/trimming'
import { WizardLayout } from './components/WizardLayout'
import { StepUpload } from './steps/StepUpload'
import { StepWindow } from './steps/StepWindow'
import { StepAutoPeaks } from './steps/StepAutoPeaks'
import { StepRefinePeaks } from './steps/StepRefinePeaks'
import { applyWindowToSessionData } from './lib/windowing'

function App() {
  const [status, setStatus] = useState<string>('Checking health...')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [originalData, setOriginalData] = useState<SessionData | null>(null)
  const [currentData, setCurrentData] = useState<SessionData | null>(null)
  const [isTrimmerOpen, setIsTrimmerOpen] = useState<boolean>(false)
  const [trims, setTrims] = useState<Interval[]>([])
  const [pending, setPending] = useState<{ start?: number; end?: number }>({})
  const [peaks, setPeaks] = useState<Peak[]>([])
  const [peakParams, setPeakParams] = useState<PeakParams | null>(null)
  const [isExporting, setIsExporting] = useState<boolean>(false)
  const [actionStatus, setActionStatus] = useState<string>('')
  const [currentStep, setCurrentStep] = useState<number>(1)
  const [experimentWindow, setExperimentWindow] = useState<{ start: number; end: number } | null>(null)
  const [draftWindow, setDraftWindow] = useState<{ start: number; end: number } | null>(null)
  const [autoDetectionAcknowledged, setAutoDetectionAcknowledged] = useState<boolean>(false)
  const [peaksConfirmed, setPeaksConfirmed] = useState<boolean>(false)

  const steps = [
    { number: 1, label: 'Upload' },
    { number: 2, label: 'View & Select Data Range' },
    { number: 3, label: 'Auto Detect Peaks' },
    { number: 4, label: 'Refine Peaks' },
    { number: 5, label: 'Download Data (placeholder for later)' },
  ]

  useEffect(() => {
    let apiUrl: string
    try {
      apiUrl = getApiBase()
    } catch (err) {
      setStatus((err as Error).message)
      return
    }

    const controller = new AbortController()

    fetch(new URL('/health', apiUrl).toString(), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }
        const data = (await response.json()) as { ok?: boolean }
        setStatus(data.ok ? 'Healthy' : 'Unhealthy response received')
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') {
          setStatus(`Health check failed: ${error.message}`)
        }
      })

    return () => controller.abort()
  }, [])

  const handleUpload = async (file: File) => {
    setSelectedFile(file)
    setIsUploading(true)
    setError('')
    setActionStatus('')

    try {
      const uploadedData = await uploadFile(file)
      setOriginalData(uploadedData)
      setTrims([])
      setPending({})
      setExperimentWindow(null)
      setDraftWindow(null)
      setCurrentStep(2)
    } catch (err) {
      setError((err as Error).message)
      setOriginalData(null)
      setCurrentData(null)
      setTrims([])
      setPending({})
      setExperimentWindow(null)
      setDraftWindow(null)
      setCurrentStep(1)
    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    if (!originalData) {
      setCurrentData(null)
      setPeakParams(null)
      setPeaks([])
      setExperimentWindow(null)
      setDraftWindow(null)
      setAutoDetectionAcknowledged(false)
      setPeaksConfirmed(false)
      return
    }

    if (trims.length === 0) {
      setCurrentData({
        scale: originalData.scale.map((row) => ({ ...row })),
        volume: originalData.volume.map((row) => ({ ...row })),
        pressure: originalData.pressure.map((row) => ({ ...row })),
      })
      setPeakParams(null)
      setPeaks([])
      setExperimentWindow(null)
      setDraftWindow(null)
      setAutoDetectionAcknowledged(false)
      setPeaksConfirmed(false)
      return
    }

    setCurrentData({
      scale: filterRowsByIntervals(originalData.scale, 'Elapsed Time', trims),
      volume: filterRowsByIntervals(originalData.volume, 'Elapsed Time', trims),
      pressure: filterRowsByIntervals(originalData.pressure, 'Elapsed Time', trims),
    })
    setPeakParams(null)
    setPeaks([])
    setExperimentWindow(null)
    setDraftWindow(null)
    setAutoDetectionAcknowledged(false)
    setPeaksConfirmed(false)
  }, [originalData, trims])

  useEffect(() => {
    setPeaksConfirmed(false)
  }, [peaks])

  const elapsedRange = useMemo(() => {
    if (!currentData) return null
    const times = [
      ...currentData.scale.map((row) => row['Elapsed Time']),
      ...currentData.volume.map((row) => row['Elapsed Time']),
      ...currentData.pressure.map((row) => row['Elapsed Time']),
    ].filter((value) => Number.isFinite(value))

    if (times.length === 0) return null
    return { min: Math.min(...times), max: Math.max(...times) }
  }, [currentData])

  useEffect(() => {
    if (!elapsedRange || !currentData) {
      setDraftWindow(null)
      setExperimentWindow(null)
      return
    }

    setDraftWindow((prev) => {
      if (!prev) return { start: elapsedRange.min, end: elapsedRange.max }
      const start = Math.max(elapsedRange.min, Math.min(prev.start, elapsedRange.max))
      const end = Math.max(elapsedRange.min, Math.min(prev.end, elapsedRange.max))
      return { start: Math.min(start, end), end: Math.max(start, end) }
    })

    setExperimentWindow((prev) => {
      if (!prev) return null
      const start = Math.max(elapsedRange.min, Math.min(prev.start, elapsedRange.max))
      const end = Math.max(elapsedRange.min, Math.min(prev.end, elapsedRange.max))
      return { start: Math.min(start, end), end: Math.max(start, end) }
    })
  }, [currentData, elapsedRange])

  const windowSelection = useMemo(() => {
    if (draftWindow) return draftWindow
    if (!elapsedRange) return null
    return { start: elapsedRange.min, end: elapsedRange.max }
  }, [draftWindow, elapsedRange])

  const windowedCurrentData = useMemo(() => {
    if (!currentData || !windowSelection) return currentData
    return applyWindowToSessionData(currentData, windowSelection.start, windowSelection.end)
  }, [currentData, windowSelection])

  const windowedScalePoints = useMemo(() => {
    if (!windowedCurrentData) return []
    return toPoints(windowedCurrentData.scale, 'Elapsed Time', 'Scale')
  }, [windowedCurrentData])

  const windowedVolumePoints = useMemo(() => {
    if (!windowedCurrentData) return []
    return toPoints(windowedCurrentData.volume, 'Elapsed Time', 'Tot Infused Vol')
  }, [windowedCurrentData])

  const windowedPressurePoints = useMemo(() => {
    if (!windowedCurrentData) return []
    return toPoints(windowedCurrentData.pressure, 'Elapsed Time', 'Bladder Pressure')
  }, [windowedCurrentData])

  const windowedDuration = useMemo(() => {
    const baseSeries = windowedPressurePoints.length > 0 ? windowedPressurePoints : windowedScalePoints
    return computeDuration(baseSeries)
  }, [windowedPressurePoints, windowedScalePoints])

  const windowedMaxPressure = useMemo(
    () => computeMaxY(windowedPressurePoints),
    [windowedPressurePoints],
  )

  const windowedFinalVolume = useMemo(() => computeFinalY(windowedVolumePoints), [windowedVolumePoints])

  const processedData = useMemo(() => {
    if (!currentData) return null
    if (experimentWindow) {
      return applyWindowToSessionData(currentData, experimentWindow.start, experimentWindow.end)
    }
    return windowedCurrentData
  }, [currentData, experimentWindow, windowedCurrentData])

  const pressurePreview = useMemo(() => processedData?.pressure.slice(0, 5) ?? [], [processedData])

  const scalePoints = useMemo(() => {
    if (!processedData) return []
    return toPoints(processedData.scale, 'Elapsed Time', 'Scale')
  }, [processedData])

  const volumePoints = useMemo(() => {
    if (!processedData) return []
    return toPoints(processedData.volume, 'Elapsed Time', 'Tot Infused Vol')
  }, [processedData])

  const pressurePoints = useMemo(() => {
    if (!processedData) return []
    return toPoints(processedData.pressure, 'Elapsed Time', 'Bladder Pressure')
  }, [processedData])


  const handleApplyPending = () => {
    if (pending.start === undefined || pending.end === undefined) return
    const start = Math.min(pending.start, pending.end)
    const end = Math.max(pending.start, pending.end)
    setTrims((prev) => [...prev, { start, end }])
    setPending({})
    setExperimentWindow(null)
    setDraftWindow(null)
  }

  const handleUndo = () => {
    setTrims((prev) => prev.slice(0, -1))
    setPending({})
    setExperimentWindow(null)
    setDraftWindow(null)
  }

  const handleRestore = () => {
    setTrims([])
    setPending({})
    setExperimentWindow(null)
    setDraftWindow(null)
  }

  const handleExportReport = async () => {
    if (!currentData) return

    setIsExporting(true)
    setActionStatus('Generating report...')

    const payload = {
      ...currentData,
      kept_intervals: trims.length > 0 ? trims.length : undefined,
    }

    try {
      const report = await generateReport(payload, peaks)
      const apiBase = getApiBase()
      const downloadUrl = `${apiBase}${report.downloadUrl}`
      setActionStatus(`Report ready: ${report.filename}`)
      window.open(downloadUrl, '_blank')
    } catch (err) {
      setActionStatus(`Report generation failed: ${(err as Error).message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleConfirmWindow = () => {
    if (!windowSelection) return
    setExperimentWindow({ ...windowSelection })
  }

  const handleResetWindow = () => {
    if (!elapsedRange) return
    const fullRange = { start: elapsedRange.min, end: elapsedRange.max }
    setDraftWindow(fullRange)
    setExperimentWindow(null)
  }

  const handleWindowChange = (start: number, end: number) => {
    if (!elapsedRange) return
    const clampedStart = Math.max(elapsedRange.min, Math.min(start, elapsedRange.max))
    const clampedEnd = Math.max(elapsedRange.min, Math.min(end, elapsedRange.max))
    setDraftWindow({ start: Math.min(clampedStart, clampedEnd), end: Math.max(clampedStart, clampedEnd) })
  }

  const handleAutoDetect = () => {
    setAutoDetectionAcknowledged(true)
  }

  const handleSkipAuto = () => {
    setAutoDetectionAcknowledged(true)
  }

  const handleConfirmPeaks = () => {
    setPeaksConfirmed(true)
  }

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length))
  }

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const isNextDisabled = useMemo(() => {
    if (currentStep === 1) {
      return !(originalData && currentData)
    }
    if (currentStep === 2) {
      if (!windowSelection) return true
      if (!experimentWindow) return true
      return (
        experimentWindow.start !== windowSelection.start || experimentWindow.end !== windowSelection.end
      )
    }
    if (currentStep === 3) {
      return !autoDetectionAcknowledged
    }
    if (currentStep === 4) {
      return !peaksConfirmed
    }
    return true
  }, [
    autoDetectionAcknowledged,
    currentData,
    currentStep,
    experimentWindow,
    originalData,
    peaksConfirmed,
    windowSelection,
  ])

  const isPrevDisabled = currentStep === 1

  const renderStep = () => {
    if (currentStep === 1) {
      return (
        <StepUpload
          status={status}
          selectedFile={selectedFile}
          error={error}
          actionStatus={actionStatus}
          isUploading={isUploading}
          onUpload={handleUpload}
        />
      )
    }

    if (currentStep === 2) {
      return (
        <StepWindow
          actionStatus={actionStatus}
          windowRange={elapsedRange}
          windowSelection={windowSelection}
          experimentWindow={experimentWindow}
          onWindowChange={handleWindowChange}
          onConfirmWindow={handleConfirmWindow}
          onResetWindow={handleResetWindow}
          scalePoints={windowedScalePoints}
          volumePoints={windowedVolumePoints}
          pressurePoints={windowedPressurePoints}
          windowedDuration={windowedDuration}
          windowedMaxPressure={windowedMaxPressure}
          windowedFinalVolume={windowedFinalVolume}
        />
      )
    }

    if (currentStep === 3) {
      return (
        <StepAutoPeaks
          pressureRows={processedData?.pressure ?? null}
          peakParams={peakParams}
          peaks={peaks}
          onDetect={handleAutoDetect}
          onSkip={handleSkipAuto}
          hasAcknowledged={autoDetectionAcknowledged}
          setPeakParams={setPeakParams}
          setPeaks={setPeaks}
        />
      )
    }

    if (currentStep === 4) {
      return (
        <StepRefinePeaks
          scalePoints={scalePoints}
          volumePoints={volumePoints}
          pressurePoints={pressurePoints}
          peaks={peaks}
          setPeaks={setPeaks}
          pressurePreview={pressurePreview}
          onConfirmPeaks={handleConfirmPeaks}
          peaksConfirmed={peaksConfirmed}
        />
      )
    }

    return (
      <div>
        <h2 style={{ marginTop: 0 }}>Download Data (placeholder for later)</h2>
        <p>This step is reserved for upcoming download options.</p>
      </div>
    )
  }

  return (
    <>
      <WizardLayout
        currentStep={currentStep}
        steps={steps}
        onNext={handleNext}
        onPrev={handlePrev}
        isNextDisabled={isNextDisabled}
        isPrevDisabled={isPrevDisabled}
      >
        {renderStep()}
      </WizardLayout>

      <TrimmerModal
        isOpen={isTrimmerOpen}
        onClose={() => setIsTrimmerOpen(false)}
        pressurePoints={pressurePoints}
        pending={pending}
        setPending={setPending}
        trims={trims}
        onApplyPending={handleApplyPending}
        onUndo={handleUndo}
        onRestore={handleRestore}
      />
    </>
  )
}

export default App

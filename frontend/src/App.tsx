import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
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
  const [windowConfirmed, setWindowConfirmed] = useState<boolean>(false)
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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
  }

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedFile) {
      setError('Please select a file to upload')
      return
    }

    setIsUploading(true)
    setError('')
    setActionStatus('')

    try {
      const uploadedData = await uploadFile(selectedFile)
      setOriginalData(uploadedData)
      setTrims([])
      setPending({})
      setCurrentStep(2)
    } catch (err) {
      setError((err as Error).message)
      setOriginalData(null)
      setCurrentData(null)
      setTrims([])
      setPending({})
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
      setWindowConfirmed(false)
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
      setWindowConfirmed(false)
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
    setWindowConfirmed(false)
    setAutoDetectionAcknowledged(false)
    setPeaksConfirmed(false)
  }, [originalData, trims])

  useEffect(() => {
    setPeaksConfirmed(false)
  }, [peaks])

  const pressurePreview = useMemo(() => currentData?.pressure.slice(0, 5) ?? [], [currentData])

  const scalePoints = useMemo(() => {
    if (!currentData) return []
    return toPoints(currentData.scale, 'Elapsed Time', 'Scale')
  }, [currentData])

  const volumePoints = useMemo(() => {
    if (!currentData) return []
    return toPoints(currentData.volume, 'Elapsed Time', 'Tot Infused Vol')
  }, [currentData])

  const pressurePoints = useMemo(() => {
    if (!currentData) return []
    return toPoints(currentData.pressure, 'Elapsed Time', 'Bladder Pressure')
  }, [currentData])

  const duration = useMemo(() => {
    const baseSeries = pressurePoints.length > 0 ? pressurePoints : scalePoints
    return computeDuration(baseSeries)
  }, [pressurePoints, scalePoints])

  const maxPressure = useMemo(() => computeMaxY(pressurePoints), [pressurePoints])
  const finalVolume = useMemo(() => computeFinalY(volumePoints), [volumePoints])

  const handleApplyPending = () => {
    if (pending.start === undefined || pending.end === undefined) return
    const start = Math.min(pending.start, pending.end)
    const end = Math.max(pending.start, pending.end)
    setTrims((prev) => [...prev, { start, end }])
    setPending({})
    setWindowConfirmed(false)
  }

  const handleUndo = () => {
    setTrims((prev) => prev.slice(0, -1))
    setPending({})
    setWindowConfirmed(false)
  }

  const handleRestore = () => {
    setTrims([])
    setPending({})
    setWindowConfirmed(false)
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
    if (!currentData) return
    setWindowConfirmed(true)
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
      return !windowConfirmed
    }
    if (currentStep === 3) {
      return !autoDetectionAcknowledged
    }
    if (currentStep === 4) {
      return !peaksConfirmed
    }
    return true
  }, [autoDetectionAcknowledged, currentData, currentStep, originalData, peaksConfirmed, windowConfirmed])

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
          onFileChange={handleFileChange}
          onUpload={handleUpload}
        />
      )
    }

    if (currentStep === 2) {
      return (
        <StepWindow
          currentData={currentData}
          trims={trims}
          duration={duration}
          maxPressure={maxPressure}
          finalVolume={finalVolume}
          isExporting={isExporting}
          actionStatus={actionStatus}
          windowConfirmed={windowConfirmed}
          onOpenTrimmer={() => setIsTrimmerOpen(true)}
          onExportReport={handleExportReport}
          onConfirmWindow={handleConfirmWindow}
        />
      )
    }

    if (currentStep === 3) {
      return (
        <StepAutoPeaks
          pressureRows={currentData?.pressure ?? null}
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

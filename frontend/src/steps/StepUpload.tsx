import React, { useMemo, useRef, useState } from 'react'

export type StepUploadProps = {
  status: string
  selectedFile: File | null
  error: string
  actionStatus: string
  isUploading: boolean
  onUpload: (file: File) => void
}

const acceptedExtensions = ['txt', 'csv']

function isAcceptedFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension ? acceptedExtensions.includes(extension) : false
}

export function StepUpload({ status, selectedFile, error, actionStatus, isUploading, onUpload }: StepUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const helperText = useMemo(
    () => [
      'Expected columns: Elapsed Time, Scale, Tot Infused Vol, Bladder Pressure',
      'TXT is tab-delimited; header row can appear after metadata lines',
    ],
    [],
  )

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || isUploading) return
    const file = files[0]
    if (!isAcceptedFile(file)) return
    onUpload(file)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files)
  }

  const handleBrowseClick = () => {
    inputRef.current?.click()
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div
        style={{
          width: '100%',
          maxWidth: '720px',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid #e5e7eb',
          background: '#fff',
          boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
        }}
      >
        <p style={{ margin: 0, color: '#4b5563', fontWeight: 500 }}>Backend health: {status}</p>
        <h1 style={{ margin: '0.5rem 0 1rem', fontSize: '2rem' }}>Upload your file</h1>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            border: isDragging ? '2px solid #2563eb' : '2px dashed #cbd5e1',
            background: isDragging ? '#eff6ff' : '#f8fafc',
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, fontSize: '1.1rem' }}>Drag & drop your .txt or .csv file</p>
          <p style={{ margin: '0.25rem 0 1rem', color: '#6b7280' }}>or</p>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,.csv"
            style={{ display: 'none' }}
            onChange={handleInputChange}
            disabled={isUploading}
          />
          <button
            type="button"
            onClick={handleBrowseClick}
            disabled={isUploading}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '10px',
              background: isUploading ? '#94a3b8' : '#2563eb',
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(37,99,235,0.25)',
            }}
          >
            {isUploading ? 'Uploading...' : 'UPLOAD'}
          </button>
          {selectedFile && (
            <p style={{ marginTop: '0.75rem', color: '#111827' }}>Selected: {selectedFile.name}</p>
          )}
        </div>

        <div style={{ marginTop: '1rem', color: '#4b5563', lineHeight: 1.5 }}>
          {helperText.map((line) => (
            <p key={line} style={{ margin: '0.15rem 0' }}>
              {line}
            </p>
          ))}
        </div>

        {error && <p style={{ color: '#dc2626', marginTop: '0.5rem' }}>{error}</p>}
        {actionStatus && <p style={{ marginTop: '0.5rem', color: '#111827' }}>{actionStatus}</p>}
      </div>
    </div>
  )
}

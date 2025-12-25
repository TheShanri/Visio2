import { ChangeEvent, FormEvent } from 'react'

export type StepUploadProps = {
  status: string
  selectedFile: File | null
  error: string
  actionStatus: string
  isUploading: boolean
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onUpload: (event: FormEvent<HTMLFormElement>) => void
}

export function StepUpload({
  status,
  selectedFile,
  error,
  actionStatus,
  isUploading,
  onFileChange,
  onUpload,
}: StepUploadProps) {
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>VISIO MVP</h1>
      <p>Backend health: {status}</p>

      <section style={{ marginTop: '1rem' }}>
        <form onSubmit={onUpload} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input type="file" accept=".txt,.csv" onChange={onFileChange} />
          <button type="submit" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
        {selectedFile && <p style={{ marginTop: '0.5rem' }}>Selected file: {selectedFile.name}</p>}
        {error && <p style={{ color: 'red', marginTop: '0.5rem' }}>{error}</p>}
        {actionStatus && <p style={{ marginTop: '0.5rem' }}>{actionStatus}</p>}
      </section>
    </div>
  )
}

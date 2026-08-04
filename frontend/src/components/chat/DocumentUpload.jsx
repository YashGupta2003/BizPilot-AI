import { useRef, useState } from 'react'
import { Upload, FileCheck, ShieldAlert, Loader2 } from 'lucide-react'
import { uploadDocument } from '../../services/chatService'
import { analyzeContract } from '../../services/riskService'

export default function DocumentUpload({ onReportReady }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [lastUploaded, setLastUploaded] = useState(null)
  const [error, setError] = useState('')

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const result = await uploadDocument(file)
      setLastUploaded(result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleScanForRisks() {
    if (!lastUploaded) return
    setAnalyzing(true)
    setError('')
    try {
      const report = await analyzeContract(lastUploaded.filename)
      onReportReady?.(report)
    } catch (err) {
      setError(err.response?.data?.detail || 'Risk analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Knowledge base</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        Upload contracts, invoices, or notes — ask the assistant about them, or scan contracts for risky clauses.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <button
        className="btn-secondary"
        onClick={() => fileInputRef.current.click()}
        disabled={uploading}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center' }}
      >
        <Upload size={16} />
        {uploading ? 'Uploading...' : 'Upload document'}
      </button>

      {lastUploaded && (
        <>
          <div style={{ marginTop: 10, fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileCheck size={14} />
            {lastUploaded.filename} indexed ({lastUploaded.chunks_created} chunks)
          </div>

          <button
            className="btn-secondary"
            onClick={handleScanForRisks}
            disabled={analyzing}
            style={{
              marginTop: 10, display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', justifyContent: 'center', color: '#b91c1c', borderColor: '#fecaca',
            }}
          >
            {analyzing ? <Loader2 size={16} className="spin" /> : <ShieldAlert size={16} />}
            {analyzing ? 'Scanning contract...' : 'Scan for risky clauses'}
          </button>
        </>
      )}

      {error && (
        <p style={{ marginTop: 8, fontSize: 13, color: '#dc2626' }}>{error}</p>
      )}
    </div>
  )
}
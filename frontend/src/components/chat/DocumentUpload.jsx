import { useRef, useState } from 'react'
import { Upload, FileCheck } from 'lucide-react'
import { uploadDocument } from '../../services/chatService'

export default function DocumentUpload() {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [lastUploaded, setLastUploaded] = useState(null)

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadDocument(file)
      setLastUploaded(result)
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.detail || 'unknown error'))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Knowledge base</h3>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
        Upload contracts, invoices, or notes — ask the assistant about them afterwards.
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
        <div style={{ marginTop: 10, fontSize: 13, color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileCheck size={14} />
          {lastUploaded.filename} indexed ({lastUploaded.chunks_created} chunks)
        </div>
      )}
    </div>
  )
}

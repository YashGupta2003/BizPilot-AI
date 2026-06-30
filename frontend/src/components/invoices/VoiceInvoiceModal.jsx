import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { transcribeVoiceToInvoice } from '../../services/voiceService'
import { createInvoice } from '../../services/invoiceService'
import { getClients } from '../../services/clientService'

function getSupportedMimeType() {
  const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav']
  for (const type of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(type)) return type
  }
  return ''
}

export default function VoiceInvoiceModal({ onClose, onCreated }) {
  const [stage, setStage] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [preview, setPreview] = useState(null)
  const [clients, setClients] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [editableItems, setEditableItems] = useState([])
  const [recordingSeconds, setRecordingSeconds] = useState(0)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)

  useEffect(() => {
    getClients().then(setClients).catch(() => {})
    return () => { stopMicrophone(); clearInterval(timerRef.current) }
  }, [])

  function stopMicrophone() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }

  async function startRecording() {
    setErrorMsg('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = getSupportedMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = handleRecordingStopped
      mediaRecorderRef.current = recorder
      recorder.start()
      setStage('recording')
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000)
    } catch {
      setErrorMsg('Could not access your microphone. Please allow microphone access and try again.')
      setStage('error')
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current.stop()
    stopMicrophone()
  }

  async function handleRecordingStopped() {
    setStage('transcribing')
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm'
    const audioBlob = new Blob(chunksRef.current, { type: mimeType })
    try {
      const result = await transcribeVoiceToInvoice(audioBlob)
      setPreview(result)
      setEditableItems(result.items)
      setSelectedClientId(result.client_id || '')
      setStage('review')
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Could not transcribe. Please try again.')
      setStage('error')
    }
  }

  function updateItem(index, field, value) {
    setEditableItems((items) =>
      items.map((item, i) => {
        if (i !== index) return item
        const updated = { ...item, [field]: value }
        updated.amount = Number(updated.quantity || 0) * Number(updated.rate || 0)
        return updated
      })
    )
  }

  async function handleConfirmCreate() {
    if (!selectedClientId) { setErrorMsg('Please select a client.'); return }
    setStage('creating')
    try {
      await createInvoice({
        client_id: selectedClientId,
        items: editableItems.map((it) => ({
          description: it.description,
          quantity: Number(it.quantity),
          rate: Number(it.rate),
        })),
        tax_percent: 0,
        notes: `Created via voice: "${preview.transcript}"`,
      })
      onCreated?.()
    } catch (err) {
      setErrorMsg(err.response?.data?.detail || 'Could not create invoice.')
      setStage('review')
    }
  }

  function formatSeconds(s) {
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="card" style={{ width: 480, maxHeight: '85vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Voice to Invoice</h3>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
          Speak the work you did and the amount — we'll turn it into an invoice.
        </p>

        {stage === 'idle' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <button onClick={startRecording} style={{ width: 72, height: 72, borderRadius: '50%', border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mic size={28} />
            </button>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 12 }}>Tap to start recording</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Example: "Raj ke liye website banayi, 5000 rupaye"</p>
          </div>
        )}

        {stage === 'recording' && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <button onClick={stopRecording} style={{ width: 72, height: 72, borderRadius: '50%', border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s infinite' }}>
              <Square size={24} />
            </button>
            <p style={{ fontSize: 16, fontWeight: 600, marginTop: 12 }}>{formatSeconds(recordingSeconds)}</p>
            <p style={{ fontSize: 13, color: '#6b7280' }}>Recording... tap to stop</p>
          </div>
        )}

        {(stage === 'transcribing' || stage === 'creating') && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Loader2 size={32} className="spin" color="#4f46e5" />
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 12 }}>
              {stage === 'transcribing' ? 'Transcribing your recording...' : 'Creating invoice...'}
            </p>
          </div>
        )}

        {stage === 'review' && preview && (
          <div>
            <div style={{ background: '#f9fafb', borderRadius: 8, padding: 10, marginBottom: 14 }}>
              <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>WHAT WE HEARD</p>
              <p style={{ fontSize: 13.5, color: '#374151' }}>{preview.transcript}</p>
            </div>

            {preview.matched_client_automatically && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 12.5, color: '#15803d' }}>
                <CheckCircle2 size={14} /> Auto-matched client: <strong>{preview.client_name}</strong>
              </div>
            )}

            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Client</label>
            <select className="input-field" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} style={{ marginBottom: 14 }}>
              <option value="">Select a client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>Line items (edit if needed)</label>
            {editableItems.map((item, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input className="input-field" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} placeholder="Description" />
                <input className="input-field" type="number" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} placeholder="Qty" />
                <input className="input-field" type="number" value={item.rate} onChange={(e) => updateItem(i, 'rate', e.target.value)} placeholder="Rate (₹)" />
              </div>
            ))}

            <p style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', marginBottom: 14 }}>
              Total: ₹{editableItems.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.rate || 0), 0).toLocaleString('en-IN')}
            </p>

            {errorMsg && (
              <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={14} /> {errorMsg}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button className="btn-primary" onClick={handleConfirmCreate} style={{ flex: 1 }}>Create invoice</button>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <AlertTriangle size={28} color="#dc2626" />
            <p style={{ fontSize: 13.5, color: '#dc2626', marginTop: 10, marginBottom: 16 }}>{errorMsg}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Close</button>
              <button className="btn-primary" onClick={() => { setStage('idle'); setErrorMsg('') }} style={{ flex: 1 }}>Try again</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
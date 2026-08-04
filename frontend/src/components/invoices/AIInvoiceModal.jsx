import { useState, useEffect } from 'react'
import { getClients } from '../../services/clientService'
import { generateInvoiceFromText } from '../../services/invoiceService'

export default function AIInvoiceModal({ onClose, onCreated }) {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getClients().then(setClients)
  }, [])

  async function handleGenerate(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await generateInvoiceFromText({ client_id: clientId, description })
      onCreated()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
    }}>
      <div className="card" style={{ width: 480 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Generate invoice with AI</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Describe the work in plain English — the AI agent will extract line items automatically.
        </p>

        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <select className="input-field" value={clientId} onChange={(e) => setClientId(e.target.value)} required>
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <textarea
            className="input-field"
            rows={4}
            placeholder="e.g. 3 hours of logo design at ₹1500/hr, plus a flat ₹500 for revisions"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Generating...' : 'Generate invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

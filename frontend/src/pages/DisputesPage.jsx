import { useState, useEffect } from 'react'
import { getClients } from '../services/clientService'
import { getInvoices } from '../services/invoiceService'
import { resolveDispute } from '../services/disputeService'
import { Scale, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'

export default function DisputesPage() {
  const [clients, setClients] = useState([])
  const [invoices, setInvoices] = useState([])
  
  const [selectedClient, setSelectedClient] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState('')
  const [disputeMessage, setDisputeMessage] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getClients().then(setClients).catch(console.error)
    getInvoices().then(setInvoices).catch(console.error)
  }, [])

  const filteredInvoices = invoices.filter(inv => inv.client_id === selectedClient)

  const handleResolve = async () => {
    if (!selectedClient || !disputeMessage.trim()) {
      setError("Please select a client and enter the client's message.")
      return
    }
    
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      const res = await resolveDispute({
        client_id: selectedClient,
        invoice_id: selectedInvoice || undefined,
        dispute_message: disputeMessage
      })
      setResult(res)
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to resolve dispute")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '20px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Scale size={28} color="#4f46e5" /> AI Dispute Resolver
        </h1>
        <p style={{ color: '#4b5563', marginBottom: 24 }}>
        Client pushing back on an invoice or deliverables? Paste their message here. The AI will cross-reference your contracts, meeting notes, and invoice history to draft a professional response.
      </p>

      <div style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Select Client *</label>
            <select
              value={selectedClient}
              onChange={(e) => {
                setSelectedClient(e.target.value)
                setSelectedInvoice('')
              }}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
            >
              <option value="">-- Choose Client --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Related Invoice (Optional)</label>
            <select
              value={selectedInvoice}
              onChange={(e) => setSelectedInvoice(e.target.value)}
              disabled={!selectedClient}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, background: !selectedClient ? '#f3f4f6' : '#fff' }}
            >
              <option value="">-- None --</option>
              {filteredInvoices.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.invoice_number} ({inv.total} {inv.currency}) - {inv.status}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Client's Message *</label>
          <textarea
            value={disputeMessage}
            onChange={(e) => setDisputeMessage(e.target.value)}
            placeholder='e.g., "I already paid for this", "We agreed on unlimited revisions", "I want a refund"'
            style={{ width: '100%', height: 120, padding: 12, borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14, resize: 'vertical' }}
          />
        </div>
        
        {error && <div style={{ marginTop: 12, color: '#dc2626', fontSize: 14 }}>{error}</div>}

        <button 
          onClick={handleResolve}
          disabled={loading}
          style={{ marginTop: 16, width: '100%', padding: '10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />}
          {loading ? 'Analyzing Facts...' : 'Resolve Dispute'}
        </button>
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#f8fafc', padding: 20, borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle size={18} color="#10b981" /> AI Fact-Check & Analysis
            </h3>
            <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.5 }}>{result.analysis}</p>
          </div>
          
          <div style={{ background: '#fffbeb', padding: 20, borderRadius: 12, border: '1px solid #fde68a' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={18} color="#d97706" /> Recommended Action
            </h3>
            <p style={{ fontSize: 15, fontWeight: 500, color: '#b45309' }}>{result.recommended_action}</p>
          </div>

          <div style={{ background: '#fff', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#111827' }}>Draft Response</h3>
            <div style={{ background: '#f9fafb', padding: 16, borderRadius: 6, fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', border: '1px solid #f3f4f6' }}>
              {result.draft_response}
            </div>
            <button 
              onClick={() => navigator.clipboard.writeText(result.draft_response)}
              style={{ marginTop: 12, padding: '6px 12px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 4, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
            >
              Copy to Clipboard
            </button>
          </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}

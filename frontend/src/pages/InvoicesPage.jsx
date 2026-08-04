import { useEffect, useState } from 'react'
import { Sparkles, Download, Trash2, Mic } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import AIInvoiceModal from '../components/invoices/AIInvoiceModal'
import VoiceInvoiceModal from '../components/invoices/VoiceInvoiceModal'
import { getInvoices, deleteInvoice, updateInvoiceStatus, getInvoicePdfUrl } from '../services/invoiceService'
import { useNavigate } from 'react-router-dom'

const STATUS_OPTIONS = ['draft', 'sent', 'paid', 'overdue', 'cancelled']

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAIModal, setShowAIModal] = useState(false)
  const [showVoiceModal, setShowVoiceModal] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    setLoading(true)
    const data = await getInvoices()
    setInvoices(data)
    setLoading(false)
  }

  async function handleAICreated() {
    setShowAIModal(false)
    await loadInvoices()
  }

  async function handleVoiceCreated() {
    setShowVoiceModal(false)
    await loadInvoices()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this invoice?')) return
    await deleteInvoice(id)
    await loadInvoices()
  }
  
  async function handleStatusChange(id, status) {
    await updateInvoiceStatus(id, status)
    if (status === 'paid') {
    const log = confirm(
      'Invoice marked as paid! Did this come from a proposal? Click OK to log the win.'
    )
    if (log) navigate('/winrate')
  }
    await loadInvoices()
  }

  function formatCurrency(amount, currency = 'INR') {
    const symbol = currency === 'INR' ? '₹' : currency + ' '
    return `${symbol}${(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Create, track, and send invoices</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-secondary"
            onClick={() => setShowVoiceModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Mic size={16} /> Voice invoice
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowAIModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Sparkles size={16} /> Generate with AI
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading...</p>
        ) : invoices.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            No invoices yet. Click "Generate with AI" or try "Voice invoice" to create your first one.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice #</th><th>Client</th><th>Total</th><th>Status</th><th>Due date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{inv.invoice_number}</td>
                  <td>{inv.client_name}</td>
                  <td>{formatCurrency(inv.total, inv.currency)}</td>
                  <td>
                    <select
                      className={`badge badge-${inv.status}`}
                      style={{ border: 'none', fontFamily: 'inherit' }}
                      value={inv.status}
                      onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td>{inv.due_date || '—'}</td>
                  <td style={{ display: 'flex', gap: 10 }}>
                    <a href={getInvoicePdfUrl(inv.id)} target="_blank" rel="noreferrer">
                      <Download size={16} color="#4f46e5" />
                    </a>
                    <button onClick={() => handleDelete(inv.id)} style={{ background: 'none', border: 'none' }}>
                      <Trash2 size={16} color="#dc2626" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAIModal && <AIInvoiceModal onClose={() => setShowAIModal(false)} onCreated={handleAICreated} />}
      {showVoiceModal && <VoiceInvoiceModal onClose={() => setShowVoiceModal(false)} onCreated={handleVoiceCreated} />}
    </AppLayout>
  )
}
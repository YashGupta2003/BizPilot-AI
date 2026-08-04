import { useState, useEffect } from 'react'
import {
  FileText, Loader2, CheckCircle2, AlertTriangle, Mail,
  Package, Clock, DollarSign, RefreshCw, Trash2, Copy, Zap
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { extractMeeting, listMeetings, deleteMeeting } from '../services/meetingService'
import { getClients } from '../services/clientService'

const SAMPLE_NOTES = `Client call with Raj from TechStartup - 15 min call today

They want a complete e-commerce website
- Homepage + product listing + cart + checkout
- Payment integration with Razorpay
- Mobile responsive
- Admin panel to manage products

Budget: they agreed to 80,000 rupees
Timeline: need it in 6 weeks, launch before Diwali
Will pay 50% advance, rest on delivery
2 rounds of revisions included

Next steps: send contract today, start wireframes next week
They also want SEO basic setup but said can be added separately`

function DeliverableCard({ item, index }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', background: '#eef2ff', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {index + 1}
      </span>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{item.item}</p>
        {item.description && <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{item.description}</p>}
        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          {item.quantity > 1 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Qty: {item.quantity}</span>}
          {item.estimated_hours && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>~{item.estimated_hours}h</span>}
          {item.deadline && <span style={{ fontSize: 11, color: 'var(--brand)' }}>Due: {item.deadline}</span>}
        </div>
      </div>
    </div>
  )
}

function ResultPanel({ result, onReset }) {
  const { extracted, scope_email, invoice_number, invoice_id } = result
  const [copied, setCopied] = useState(false)

  function copyEmail() {
    navigator.clipboard.writeText(`Subject: ${scope_email.subject}\n\n${scope_email.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#dcfce7', borderRadius: 8, marginBottom: 16, border: '1px solid #86efac' }}>
        <CheckCircle2 size={16} color="#15803d" />
        <p style={{ fontSize: 13.5, color: '#15803d', fontWeight: 600 }}>
          Extracted! {invoice_number ? `Draft invoice ${invoice_number} created.` : ''}
        </p>
        <button onClick={onReset} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <RefreshCw size={13} /> New
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left: Extracted Data */}
        <div>
          <div className="card" style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Package size={14} color="#4f46e5" /> Deliverables ({extracted.deliverables?.length || 0})
            </h4>
            {extracted.deliverables?.map((d, i) => <DeliverableCard key={i} item={d} index={i} />)}
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Project Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'Price Agreed', value: extracted.total_price_agreed ? `${extracted.currency} ${extracted.total_price_agreed?.toLocaleString('en-IN')}` : 'Not specified', icon: DollarSign },
                { label: 'Deadline', value: extracted.project_deadline || 'Not specified', icon: Clock },
                { label: 'Revisions', value: `${extracted.revision_count} rounds`, icon: RefreshCw },
                { label: 'Advance', value: `${extracted.advance_percent}%`, icon: CheckCircle2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 7, padding: '8px 10px' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {extracted.next_steps?.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Next Steps</h4>
              {extracted.next_steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 5 }}>
                  <Zap size={13} color="#4f46e5" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{step}</p>
                </div>
              ))}
            </div>
          )}

          {extracted.things_not_included?.length > 0 && (
            <div className="card">
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#b91c1c' }}>Not Included (scope protection)</h4>
              {extracted.things_not_included.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <AlertTriangle size={12} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{item}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Scope Email */}
        <div>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={14} color="#4f46e5" /> Scope Confirmation Email
              </h4>
              <button onClick={copyEmail} className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>SUBJECT</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{scope_email.subject}</p>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto', padding: '2px 0' }}>
              {scope_email.body}
            </div>
          </div>

          {invoice_number && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 8, fontSize: 13, color: '#4338ca' }}>
              <CheckCircle2 size={14} style={{ display: 'inline', marginRight: 6 }} />
              Draft invoice <strong>{invoice_number}</strong> created in your Invoices page.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HistoryTab() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    listMeetings().then(setMeetings).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this meeting?')) return
    await deleteMeeting(id)
    setMeetings((m) => m.filter((item) => item.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Loader2 size={24} className="spin" color="#4f46e5" /></div>
  if (!meetings.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5, padding: 24 }}>No meetings extracted yet.</p>

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 13, marginBottom: 16 }}>
          ← Back to meetings
        </button>
        <ResultPanel result={selected} onReset={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {meetings.map((m) => (
        <div key={m.id} onClick={() => setSelected(m)} className="card"
          style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600 }}>{m.client_name || 'Unknown Client'}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {m.extracted?.project_name || 'Meeting'} · {m.extracted?.deliverables?.length || 0} deliverables
              {m.invoice_number && ` · Invoice ${m.invoice_number}`}
            </p>
          </div>
          <button onClick={(e) => handleDelete(m.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Trash2 size={14} color="#dc2626" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default function MeetingPage() {
  const [tab, setTab] = useState('extract')
  const [notes, setNotes] = useState('')
  const [clientId, setClientId] = useState('')
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getClients().then(setClients).catch(() => {})
  }, [])

  async function handleExtract() {
    if (notes.trim().length < 20) { setError('Please add more meeting notes.'); return }
    setLoading(true)
    setError('')
    try {
      const data = await extractMeeting(notes, clientId || null)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Extraction failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <h1 className="page-title">Meeting Notes Extractor</h1>
      <p className="page-subtitle">
        Paste messy notes → AI extracts deliverables, drafts scope email, creates invoice draft
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg-elevated)', padding: 6, borderRadius: 10, width: 'fit-content' }}>
        {[{ key: 'extract', label: 'Extract Notes', icon: Zap }, { key: 'history', label: 'Past Meetings', icon: FileText }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); setResult(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, background: tab === key ? '#4f46e5' : 'transparent', color: tab === key ? '#fff' : 'var(--text-muted)' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'extract' && (
        result ? (
          <ResultPanel result={result} onReset={() => { setResult(null); setNotes('') }} />
        ) : (
          <div className="card">
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Link to client (optional)</label>
                <select className="input-field" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Select client (auto-updates their notes)</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => setNotes(SAMPLE_NOTES)} className="btn-secondary" style={{ fontSize: 12, padding: '10px 14px', whiteSpace: 'nowrap' }}>
                  Try Sample
                </button>
              </div>
            </div>

            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Paste your meeting notes, call transcript, or WhatsApp conversation
            </label>
            <textarea
              className="input-field"
              rows={12}
              placeholder="Paste anything — WhatsApp messages, rough notes, call transcript, email thread..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            />

            {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</p>}

            <button className="btn-primary" onClick={handleExtract} disabled={loading || !notes.trim()}
              style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px' }}>
              {loading ? <Loader2 size={17} className="spin" /> : <Zap size={17} />}
              {loading ? 'Extracting deliverables + drafting email...' : 'Extract & Generate Scope Email'}
            </button>
          </div>
        )
      )}

      {tab === 'history' && <HistoryTab />}
    </AppLayout>
  )
}
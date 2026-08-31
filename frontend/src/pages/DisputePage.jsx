import { useState, useEffect } from 'react'
import {
  Shield, AlertTriangle, CheckCircle2, Loader2,
  Copy, Trash2, FileText, ChevronDown, ChevronUp,
  Scale, MessageSquare, Gavel
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { resolveDispute, getDisputeHistory, deleteDispute } from '../services/disputeService'
import { getClients } from '../services/clientService'

const RESPONSE_TYPES = {
  FIRM_DENIAL: {
    label: 'Firm Denial',
    color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe',
    icon: Shield,
    desc: 'Client is wrong — respond with evidence',
  },
  FAIR_RESOLUTION: {
    label: 'Fair Resolution',
    color: '#15803d', bg: '#dcfce7', border: '#86efac',
    icon: CheckCircle2,
    desc: 'Client has a point — propose a compromise',
  },
  LEGAL_ESCALATION: {
    label: 'Legal Escalation',
    color: '#b91c1c', bg: '#fee2e2', border: '#fecaca',
    icon: Gavel,
    desc: 'Client is being unreasonable — escalate formally',
  },
  CLARIFICATION: {
    label: 'Seek Clarification',
    color: '#92400e', bg: '#fef3c7', border: '#fde68a',
    icon: MessageSquare,
    desc: 'Need more info before taking position',
  },
}

const DISPUTE_TYPES = {
  PAYMENT_DENIAL: '💰 Payment Denial',
  QUALITY_COMPLAINT: '⭐ Quality Complaint',
  SCOPE_DISPUTE: '📋 Scope Dispute',
  REFUND_REQUEST: '↩️ Refund Request',
  TIMELINE_COMPLAINT: '⏰ Timeline Complaint',
  OTHER: '❓ Other',
}

const SAMPLE_DISPUTES = [
  {
    label: '💰 "I already paid"',
    text: "I already transferred the money last week. I don't know why you're saying it's unpaid. This is very unprofessional and I'm very disappointed. I want you to check again.",
  },
  {
    label: '↩️ "I want a refund"',
    text: "I'm not happy with the work delivered. This is not what we discussed at all. The quality is very poor and I want a full refund immediately. I will leave bad reviews if this is not resolved.",
  },
  {
    label: '📋 "You promised more"',
    text: "You said you would include the mobile app in the price. We clearly discussed this in our call. I'm not going to pay extra for something that was already agreed. Please deliver what you promised.",
  },
]

function EvidenceTag({ text }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 5, alignItems: 'flex-start' }}>
      <CheckCircle2 size={13} color="#4f46e5" style={{ flexShrink: 0, marginTop: 1 }} />
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{text}</p>
    </div>
  )
}

function AnalysisResult({ result }) {
  const analysis = result.analysis
  const [showEscalation, setShowEscalation] = useState(false)
  const [copiedMain, setCopiedMain] = useState(false)
  const [copiedEsc, setCopiedEsc] = useState(false)

  const responseStyle = RESPONSE_TYPES[analysis.recommended_response_type] || RESPONSE_TYPES.FIRM_DENIAL
  const ResponseIcon = responseStyle.icon

  function copyText(text, setter) {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  return (
    <div>
      {/* Header card */}
      <div style={{ padding: '16px 20px', borderRadius: 12, background: responseStyle.bg, border: `1px solid ${responseStyle.border}`, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ResponseIcon size={20} color={responseStyle.color} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{responseStyle.label}</h3>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{responseStyle.desc}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: responseStyle.color, background: 'var(--bg-card)', padding: '3px 10px', borderRadius: 999 }}>
              {DISPUTE_TYPES[analysis.dispute_type] || analysis.dispute_type}
            </span>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Client has valid point: {analysis.client_has_valid_point ? '✅ Yes' : '❌ No'}
            </p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
          {analysis.validity_reason}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Evidence found */}
        {analysis.evidence_found?.length > 0 && (
          <div className="card">
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--brand)' }}>
              📂 Evidence Found ({result.invoices_referenced} invoices, {result.contracts_referenced} contracts, {result.meetings_referenced} meetings)
            </h4>
            {analysis.evidence_found.map((ev, i) => <EvidenceTag key={i} text={ev} />)}
          </div>
        )}

        {/* Next steps */}
        {analysis.next_steps?.length > 0 && (
          <div className="card">
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Next Steps</h4>
            {analysis.next_steps.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', background: '#eef2ff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{step}</p>
              </div>
            ))}

            {analysis.suggested_resolution && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: '#dcfce7', borderRadius: 7, fontSize: 12.5, color: '#15803d' }}>
                💡 Suggested resolution: {analysis.suggested_resolution}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main response */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} color="#4f46e5" /> Professional Response Email
          </h4>
          <button onClick={() => copyText(`Subject: ${analysis.response_subject}\n\n${analysis.response_body}`, setCopiedMain)}
            className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Copy size={12} /> {copiedMain ? 'Copied!' : 'Copy Email'}
          </button>
        </div>

        <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>SUBJECT</p>
          <p style={{ fontSize: 13, fontWeight: 600 }}>{analysis.response_subject}</p>
        </div>

        <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 350, overflowY: 'auto' }}>
          {analysis.response_body}
        </div>
      </div>

      {/* Escalation letter */}
      {analysis.escalation_letter && (
        <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
          <button onClick={() => setShowEscalation(!showEscalation)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Gavel size={14} /> Legal Escalation Letter (use if client persists)
            </h4>
            {showEscalation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showEscalation && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button onClick={() => copyText(analysis.escalation_letter, setCopiedEsc)}
                  className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, color: '#b91c1c', borderColor: '#fecaca' }}>
                  <Copy size={12} /> {copiedEsc ? 'Copied!' : 'Copy Letter'}
                </button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', padding: '10px 12px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--red)' }}>
                {analysis.escalation_letter}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Red flags */}
      {analysis.red_flags?.length > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#fef3c7', borderRadius: 8, border: '1px solid #fde68a' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>⚠️ Red Flags Detected</p>
          {analysis.red_flags.map((flag, i) => (
            <p key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 2 }}>• {flag}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryTab() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getDisputeHistory().then(setHistory).finally(() => setLoading(false))
  }, [])

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this dispute record?')) return
    try {
      await deleteDispute(id)
      setHistory((h) => h.filter((item) => item.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Loader2 size={24} className="spin" color="#4f46e5" /></div>
  if (!history.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5, padding: 24 }}>No dispute records yet.</p>

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 13, marginBottom: 16 }}>
          ← Back to history
        </button>
        <AnalysisResult result={selected} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {history.map((item) => {
        const analysis = item.analysis || {}
        const style = RESPONSE_TYPES[analysis.recommended_response_type] || RESPONSE_TYPES.FIRM_DENIAL
        return (
          <div key={item.id} onClick={() => setSelected(item)} className="card"
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{item.client_name || 'Unknown Client'}</p>
                <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 999, background: style.bg, color: style.color, fontWeight: 600 }}>
                  {style.label}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                "{(item.dispute_message || '').slice(0, 60)}..."
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                {item.invoices_referenced} invoices · {item.contracts_referenced} contracts · {item.meetings_referenced} meetings referenced
              </p>
            </div>
            <button onClick={(e) => handleDelete(item.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <Trash2 size={14} color="#dc2626" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function DisputePage() {
  const [tab, setTab] = useState('resolve')
  const [disputeText, setDisputeText] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getClients().then(setClients).catch(() => {})
  }, [])

  function handleClientChange(id) {
    setClientId(id)
    const client = clients.find((c) => c.id === id)
    if (client) setClientName(client.name)
  }

  async function handleResolve() {
    if (!disputeText.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await resolveDispute(disputeText, clientId || null, clientName || null)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <h1 className="page-title">Dispute Resolver</h1>
      <p className="page-subtitle">
        Paste a client's dispute message — AI cross-references your invoices, contracts and meeting notes to draft a professional response
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg-elevated)', padding: 6, borderRadius: 10, width: 'fit-content' }}>
        {[
          { key: 'resolve', label: 'Resolve Dispute', icon: Scale },
          { key: 'history', label: 'Past Disputes', icon: FileText },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); setResult(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, background: tab === key ? '#4f46e5' : 'transparent', color: tab === key ? '#fff' : 'var(--text-muted)' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'resolve' && (
        result ? (
          <div>
            <button onClick={() => { setResult(null); setDisputeText('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 13, marginBottom: 16 }}>
              ← Analyze another dispute
            </button>
            <AnalysisResult result={result} />
          </div>
        ) : (
          <div className="card">
            {/* Sample disputes */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Try a sample dispute:</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SAMPLE_DISPUTES.map((s, i) => (
                  <button key={i} onClick={() => setDisputeText(s.text)}
                    style={{ fontSize: 12, padding: '5px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Select client (pulls their invoices + contracts + meetings)
                </label>
                <select className="input-field" value={clientId} onChange={(e) => handleClientChange(e.target.value)}>
                  <option value="">Select client for full context</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                  Or type client name manually
                </label>
                <input className="input-field" value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client name" disabled={!!clientId} />
              </div>
            </div>

            {clientId && (
              <div style={{ padding: '8px 12px', background: '#eef2ff', borderRadius: 8, marginBottom: 14, fontSize: 12.5, color: '#4338ca' }}>
                ✅ Context loaded — AI will reference this client's invoices, contracts, meeting notes and risk profile
              </div>
            )}

            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Paste the client's dispute message
            </label>
            <textarea className="input-field" rows={8}
              placeholder={'Paste the exact message the client sent you — email, WhatsApp, or any communication...'}
              value={disputeText}
              onChange={(e) => setDisputeText(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />

            {error && (
              <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertTriangle size={13} /> {error}
              </p>
            )}

            <button className="btn-primary" onClick={handleResolve}
              disabled={loading || !disputeText.trim()}
              style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px' }}>
              {loading ? <Loader2 size={17} className="spin" /> : <Scale size={17} />}
              {loading ? 'Analyzing dispute + cross-referencing your data...' : 'Analyze & Generate Response'}
            </button>
          </div>
        )
      )}

      {tab === 'history' && <HistoryTab />}
    </AppLayout>
  )
}
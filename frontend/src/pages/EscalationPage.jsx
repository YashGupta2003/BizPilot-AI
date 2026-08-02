import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Loader2, FileText, Copy, CheckCircle2,
  ChevronDown, ChevronUp, RefreshCw, Gavel, Shield,
  Zap, Clock, DollarSign, Send, History
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import {
  getEscalationOverview, generateEscalationDoc,
  logEscalationSent, getEscalationHistory
} from '../services/escalationService'

const STAGE_STYLES = {
  1: { bg: '#dbeafe', border: '#bfdbfe', text: '#1d4ed8', label: 'Gentle Reminder',    icon: Clock },
  2: { bg: '#fef3c7', border: '#fde68a', text: '#92400e', label: 'Formal Demand',      icon: FileText },
  3: { bg: '#ffedd5', border: '#fdba74', text: '#9a3412', label: 'Legal Demand',       icon: AlertTriangle },
  4: { bg: '#fee2e2', border: '#fecaca', text: '#b91c1c', label: 'Cease & Desist',     icon: Gavel },
  5: { bg: '#fdf2f8', border: '#f5d0fe', text: '#86198f', label: 'Final Legal Notice', icon: Shield },
}

const STAGE_TIMELINE = [
  { stage: 1, days: '1-7 days',   label: 'Gentle Reminder',    desc: 'WhatsApp reminder' },
  { stage: 2, days: '8-14 days',  label: 'Formal Demand',      desc: 'Email demand letter' },
  { stage: 3, days: '15-21 days', label: 'Legal Demand',       desc: 'Legal demand letter' },
  { stage: 4, days: '22-30 days', label: 'Cease & Desist',     desc: 'C&D notice' },
  { stage: 5, days: '30+ days',   label: 'Final Legal Notice', desc: 'Court action warning' },
]

function formatCurrency(n) {
  return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function StagePipeline({ currentStage }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
      {STAGE_TIMELINE.map((s, i) => {
        const style = STAGE_STYLES[s.stage] || STAGE_STYLES[2]
        const isActive = s.stage === currentStage
        const isPast = s.stage < currentStage
        return (
          <div key={s.stage} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              textAlign: 'center', minWidth: 100, padding: '8px 6px', borderRadius: 10,
              background: isActive ? style.bg : isPast ? '#f0fdf4' : '#f9fafb',
              border: `2px solid ${isActive ? style.border : isPast ? '#86efac' : '#e5e7eb'}`,
              opacity: !isActive && !isPast ? 0.5 : 1,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: isActive ? style.text : isPast ? '#15803d' : '#9ca3af' }}>
                Stage {s.stage}
              </div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{s.days}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: isActive ? style.text : '#374151', marginTop: 2 }}>
                {s.label}
              </div>
            </div>
            {i < STAGE_TIMELINE.length - 1 && (
              <div style={{ width: 24, height: 2, background: isPast ? '#86efac' : '#e5e7eb', flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function EscalationCard({ item }) {
  const [expanded, setExpanded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [document, setDocument] = useState(null)
  const [copied, setCopied] = useState(false)
  const [logged, setLogged] = useState(false)
  const [stageOverride, setStageOverride] = useState(null)
  const navigate = useNavigate()

  const style = STAGE_STYLES[item.stage] || STAGE_STYLES[2]
  const StageIcon = style.icon

  async function handleGenerate(stage = null) {
    setGenerating(true)
    setDocument(null)
    try {
      const doc = await generateEscalationDoc(item.invoice_id, stage || stageOverride)
      setDocument(doc)
    } finally {
      setGenerating(false)
    }
  }

  async function handleLogSent(method) {
    await logEscalationSent(item.invoice_id, {
      stage: document?.stage || item.stage,
      method,
      notes: `Stage ${item.stage} — ${item.stage_label}`,
    })
    setLogged(true)
  }

  function copyDoc() {
    if (!document) return
    navigator.clipboard.writeText(`Subject: ${document.subject}\n\n${document.body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ border: `1px solid ${style.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      {/* Header row */}
      <div style={{ padding: '14px 16px', background: style.bg, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <StageIcon size={18} color={style.text} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23' }}>{item.client_name}</p>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'white', color: style.text }}>
                Stage {item.stage} — {item.stage_label}
              </span>
              {item.urgency === 'HIGH' && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: '#fee2e2', color: '#b91c1c' }}>
                  ⚡ HIGH RISK CLIENT
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: '#6b7280' }}>
              {item.invoice_number} · {item.days_overdue} days overdue ·
              {item.reminders_sent} reminder(s) sent · {item.has_contract ? '✅ Contract on file' : '⚠️ No contract'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#9ca3af' }}>Total due</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: style.text }}>{formatCurrency(item.total_due)}</p>
            {item.late_fee > 0 && (
              <p style={{ fontSize: 10, color: '#9ca3af' }}>incl. ₹{item.late_fee.toLocaleString('en-IN')} late fee</p>
            )}
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '16px', background: 'white' }}>
          <StagePipeline currentStage={item.stage} />

          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              💡 {item.stage_description}. Recommended action: <strong>{item.stage_action}</strong>
            </p>

            {/* Stage override */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 12, color: '#9ca3af', alignSelf: 'center' }}>Generate:</p>
              {Object.entries(STAGE_STYLES).filter(([k]) => parseInt(k) >= 2).map(([k, s]) => (
                <button key={k} onClick={() => setStageOverride(parseInt(k))}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${stageOverride === parseInt(k) ? s.border : '#e5e7eb'}`, background: stageOverride === parseInt(k) ? s.bg : 'white', color: stageOverride === parseInt(k) ? s.text : '#6b7280' }}>
                  {s.label}
                </button>
              ))}
            </div>

            <button className="btn-primary" onClick={() => handleGenerate()}
              disabled={generating}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}>
              {generating ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
              {generating ? 'Generating document...' : `Generate ${stageOverride ? STAGE_STYLES[stageOverride]?.label : item.stage_label} Document`}
            </button>
          </div>

          {document && (
            <div>
              {/* Document preview */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>SUBJECT</p>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{document.subject}</p>
                  </div>
                  <button onClick={copyDoc} className="btn-secondary"
                    style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.8, whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto', padding: '10px', background: 'white', borderRadius: 8, border: '1px solid #f3f4f6' }}>
                  {document.body}
                </div>

                <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 12, color: '#9ca3af' }}>Send via:</p>
                  {item.client_email && (
                    <button onClick={() => handleLogSent('email')} className="btn-secondary"
                      style={{ fontSize: 12, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4, color: '#1d4ed8', borderColor: '#bfdbfe' }}>
                      <Send size={12} /> Email
                    </button>
                  )}
                  {item.client_phone && (
                    <button onClick={() => handleLogSent('whatsapp')} className="btn-secondary"
                      style={{ fontSize: 12, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4, color: '#15803d', borderColor: '#86efac' }}>
                      <Send size={12} /> WhatsApp
                    </button>
                  )}
                  <button onClick={() => handleLogSent('other')} className="btn-secondary"
                    style={{ fontSize: 12, padding: '5px 12px' }}>
                    Log as sent
                  </button>
                  {logged && (
                    <span style={{ fontSize: 12, color: '#15803d', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CheckCircle2 size={13} /> Logged!
                    </span>
                  )}
                </div>
              </div>

              {/* Summary breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Invoice Amount', value: formatCurrency(document.amount) },
                  { label: 'Late Fee (2%/mo)', value: formatCurrency(document.late_fee) },
                  { label: 'Total Due', value: formatCurrency(document.total_due), bold: true },
                ].map(({ label, value, bold }) => (
                  <div key={label} style={{ background: '#f9fafb', borderRadius: 7, padding: '8px 10px', textAlign: 'center' }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{label}</p>
                    <p style={{ fontSize: 14, fontWeight: bold ? 800 : 600, color: bold ? '#b91c1c' : '#1a1d23' }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => navigate('/disputes')} className="btn-secondary"
                  style={{ fontSize: 12, padding: '6px 12px' }}>
                  🛡️ Dispute Resolver
                </button>
                <button onClick={() => navigate(`/clients/${item.client_id}`)} className="btn-secondary"
                  style={{ fontSize: 12, padding: '6px 12px' }}>
                  👤 View Client 360
                </button>
                <button onClick={() => navigate('/contracts')} className="btn-secondary"
                  style={{ fontSize: 12, padding: '6px 12px' }}>
                  📜 View Contract
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryTab() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEscalationHistory().then(setHistory).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Loader2 size={24} className="spin" color="#4f46e5" /></div>
  if (!history.length) return <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13.5, padding: 24 }}>No escalation documents sent yet.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {history.map((h, i) => {
        const style = STAGE_STYLES[h.stage] || STAGE_STYLES[2]
        return (
          <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: style.bg, color: style.text }}>
                  Stage {h.stage} — {style.label}
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>via {h.method}</span>
              </div>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>{h.sent_date} · {h.notes}</p>
            </div>
            <CheckCircle2 size={16} color="#15803d" />
          </div>
        )
      })}
    </div>
  )
}

export default function EscalationPage() {
  const [tab, setTab] = useState('active')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await getEscalationOverview()
      setData(result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load escalations.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Payment Escalation Agent</h1>
          <p className="page-subtitle">
            Automatic escalation pipeline — from gentle reminder to legal notice, based on invoice age
          </p>
        </div>
        <button onClick={load} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#f3f4f6', padding: 6, borderRadius: 10, width: 'fit-content' }}>
        {[
          { key: 'active', label: 'Active Escalations', icon: AlertTriangle },
          { key: 'history', label: 'Sent History', icon: History },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, background: tab === key ? '#4f46e5' : 'transparent', color: tab === key ? '#fff' : '#6b7280' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'active' && (
        loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 size={32} className="spin" color="#4f46e5" />
            <p style={{ fontSize: 14, color: '#6b7280', marginTop: 12 }}>
              Scanning all invoices and determining escalation stages...
            </p>
          </div>
        ) : error ? (
          <div className="card"><p style={{ color: '#dc2626' }}>{error}</p></div>
        ) : !data?.total_count ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <CheckCircle2 size={36} color="#15803d" />
            <p style={{ fontSize: 15, fontWeight: 600, marginTop: 12 }}>No overdue invoices!</p>
            <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>All your sent invoices are within their due dates.</p>
          </div>
        ) : (
          <div>
            {/* Summary stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { label: 'Total Overdue', value: formatCurrency(data.total_overdue_amount), color: '#dc2626', icon: DollarSign },
                { label: 'With Late Fees', value: formatCurrency(data.total_with_late_fees), color: '#b91c1c', icon: AlertTriangle },
                { label: 'Invoices Overdue', value: data.total_count, color: '#d97706', icon: FileText },
                { label: 'Stages Active', value: Object.keys(data.stage_breakdown || {}).length, color: '#4f46e5', icon: Zap },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Icon size={14} color={color} />
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>{label}</p>
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
                </div>
              ))}
            </div>

            {data.escalations.map(item => (
              <EscalationCard key={item.invoice_id} item={item} />
            ))}
          </div>
        )
      )}

      {tab === 'history' && <HistoryTab />}
    </AppLayout>
  )
}
import { useState, useEffect } from 'react'
import {
  Brain, AlertTriangle, CheckCircle2, Loader2, Trash2, ChevronRight, Shield,
  MessageSquare, DollarSign, User, Lightbulb
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { analyzeClient, getProfileHistory, deleteProfile } from '../services/profilerService'

const RISK_COLORS = {
  'Low Risk':    { bg: '#dcfce7', border: '#86efac', text: '#15803d', badge: '#15803d' },
  'Medium Risk': { bg: '#fef3c7', border: '#fde68a', text: '#92400e', badge: '#d97706' },
  'High Risk':   { bg: '#fee2e2', border: '#fecaca', text: '#b91c1c', badge: '#dc2626' },
}

const FLAG_COLORS = {
  HIGH:   { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
  MEDIUM: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
  LOW:    { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
}

const SAMPLE_TEXTS = [
  {
    label: "🚨 High Risk Example",
    text: "Hi, we need a logo ASAP. Budget is flexible. It's a simple design, shouldn't take long. We can figure out the details later. Let me know your best price!"
  },
  {
    label: "✅ Low Risk Example",
    text: "Hello, I'm looking for a web developer for a 3-month project. Budget is ₹80,000-1,00,000. We need the MVP by March 15th for our product launch. We've worked with 3 freelancers before and always pay on milestone completion. Can you share relevant portfolio work?"
  },
  {
    label: "⚠️ Medium Risk Example",
    text: "Hey! Saw your profile, looks great. We're a startup and need some design work done. Timeline is a bit tight but we're excited to work with talented people. What are your rates?"
  },
]

// ─── RED FLAG CARD ─────────────────────────────────────────────
function RedFlagCard({ flag }) {
  const colors = FLAG_COLORS[flag.risk] || FLAG_COLORS.LOW
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: colors.bg, border: `1px solid ${colors.border}`, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <code style={{ fontSize: 12.5, fontWeight: 700, color: colors.text }}>"{flag.phrase}"</code>
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.text, background: colors.border, padding: '2px 8px', borderRadius: 999 }}>
          {flag.risk} RISK
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{flag.reason}</p>
    </div>
  )
}

// ─── SCORE METER ───────────────────────────────────────────────
function RiskMeter({ score }) {
  const pct = (score / 10) * 100
  const color = score >= 7 ? '#dc2626' : score >= 4 ? '#d97706' : '#15803d'
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ height: 10, background: 'var(--bg-elevated)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: 10, width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Safe</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Risky</span>
      </div>
    </div>
  )
}

// ─── PROFILE RESULT ────────────────────────────────────────────
function ProfileResult({ profile }) {
  const riskStyle = RISK_COLORS[profile.overall_risk_label] || RISK_COLORS['Medium Risk']

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderRadius: 12, background: riskStyle.bg, border: `1px solid ${riskStyle.border}`, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 11, color: riskStyle.text, fontWeight: 700, marginBottom: 2, textTransform: 'uppercase' }}>Client Type</p>
            <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{profile.client_type}</h3>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: riskStyle.text, lineHeight: 1 }}>{profile.overall_risk_score}</div>
            <div style={{ fontSize: 11, color: riskStyle.text, fontWeight: 600 }}>/10 Risk</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <RiskMeter score={profile.overall_risk_score} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: riskStyle.text, background: 'var(--bg-card)', padding: '3px 10px', borderRadius: 999, border: `1px solid ${riskStyle.border}` }}>
          {profile.overall_risk_label}
        </span>
      </div>

      {/* Summary */}
      <div className="card" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{profile.summary}</p>
      </div>

      {/* Behavioral Predictions */}
      <div className="card" style={{ marginBottom: 12 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Brain size={15} color="#4f46e5" /> Behavioral Predictions
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: DollarSign, label: 'Payment Behavior', value: profile.payment_behavior },
            { icon: MessageSquare, label: 'Communication Style', value: profile.communication_style },
            { icon: ChevronRight, label: 'Scope Respect', value: profile.scope_respect },
            { icon: User, label: 'Professionalism', value: profile.professionalism_level },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <Icon size={13} color="#6b7280" />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Red Flags */}
      {profile.red_flags?.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, color: '#b91c1c' }}>
            <AlertTriangle size={15} /> Red Flags ({profile.red_flags.length})
          </h4>
          {profile.red_flags.map((flag, i) => <RedFlagCard key={i} flag={flag} />)}
        </div>
      )}

      {/* Green Flags */}
      {profile.green_flags?.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#15803d' }}>
            <CheckCircle2 size={15} /> Positive Signals
          </h4>
          {profile.green_flags.map((flag, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
              <CheckCircle2 size={14} color="#15803d" style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{flag}</p>
            </div>
          ))}
        </div>
      )}

      {/* Negotiation Approach */}
      <div className="card" style={{ marginBottom: 12, borderLeft: '4px solid #4f46e5' }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--brand)' }}>
          <Lightbulb size={15} /> Negotiation Approach
        </h4>
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{profile.negotiation_approach}</p>
      </div>

      {/* Recommended Actions */}
      {profile.recommended_actions?.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Recommended Actions</h4>
          {profile.recommended_actions.map((action, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', background: '#eef2ff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{action}</p>
            </div>
          ))}
        </div>
      )}

      {/* Questions to Ask */}
      {profile.questions_to_ask?.length > 0 && (
        <div className="card">
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={14} /> Questions to Ask This Client
          </h4>
          {profile.questions_to_ask.map((q, i) => (
            <div key={i} style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 7, marginBottom: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
              "{q}"
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── HISTORY TAB ───────────────────────────────────────────────
function HistoryTab() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  async function loadHistory() {
    setLoading(true)
    try {
      const data = await getProfileHistory()
      setHistory(data)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  async function handleDelete(id, e) {
    e.stopPropagation()
    if (!confirm('Delete this profile?')) return
    try {
      await deleteProfile(id)
      setHistory((h) => h.filter((item) => item.id !== id))
      if (selected?.id === id) setSelected(null)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Loader2 size={24} className="spin" color="#4f46e5" /></div>
  if (!history.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5, padding: 24 }}>No profiles yet. Analyze a client to see results here.</p>

  if (selected) {
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          ← Back to history
        </button>
        <ProfileResult profile={selected.profile || selected} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {history.map((item) => {
        const risk = item.profile?.overall_risk_label || item.overall_risk_label || 'Medium Risk'
        const score = item.profile?.overall_risk_score || item.overall_risk_score || 5
        const riskStyle = RISK_COLORS[risk] || RISK_COLORS['Medium Risk']
        const preview = (item.client_text || '').slice(0, 80) + '...'
        return (
          <div key={item.id} onClick={() => setSelected(item)} className="card"
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{item.profile?.client_type || item.client_type || 'Client Profile'}</p>
                <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: riskStyle.bg, color: riskStyle.text, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {risk}
                </span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: riskStyle.text }}>{score}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>/10</div>
              </div>
              <button onClick={(e) => handleDelete(item.id, e)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={15} color="#dc2626" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── MAIN PAGE ─────────────────────────────────────────────────
export default function ProfilerPage() {
  const [tab, setTab] = useState('analyze')
  const [clientText, setClientText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleAnalyze() {
    if (!clientText.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await analyzeClient(clientText)
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleSample(text) {
    setClientText(text)
    setResult(null)
    setError('')
  }

  return (
    <AppLayout>
      <h1 className="page-title">Client Profiler</h1>
      <p className="page-subtitle">
        Paste a client's email, WhatsApp message, or bio — AI analyzes their personality, payment risk, and negotiation style
      </p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg-elevated)', padding: 6, borderRadius: 10, width: 'fit-content' }}>
        {[{ key: 'analyze', label: 'Analyze Client', icon: Brain }, { key: 'history', label: 'Past Profiles', icon: Shield }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); setResult(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, background: tab === key ? '#4f46e5' : 'transparent', color: tab === key ? '#fff' : 'var(--text-muted)' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'analyze' && (
        <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: 20 }}>
          <div>
            {/* Sample texts */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Try a sample:</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SAMPLE_TEXTS.map((s, i) => (
                  <button key={i} onClick={() => handleSample(s.text)}
                    style={{ fontSize: 12, padding: '5px 12px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Paste client text here
              </label>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                Email, WhatsApp message, LinkedIn bio, project brief, proposal request — anything they wrote
              </p>
              <textarea
                className="input-field"
                rows={8}
                placeholder={'Example:\n"Hi, we need a logo ASAP. Budget is flexible. It\'s a simple design — our competitor has something similar. Can you match their price?"'}
                value={clientText}
                onChange={(e) => setClientText(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
              {error && (
                <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertTriangle size={13} /> {error}
                </p>
              )}
              <button
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={loading || !clientText.trim()}
                style={{ marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}
              >
                {loading ? <Loader2 size={17} className="spin" /> : <Brain size={17} />}
                {loading ? 'Analyzing client psychology...' : 'Analyze Client Profile'}
              </button>
            </div>
          </div>

          {result && (
            <div style={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: 4 }}>
              <ProfileResult profile={result} />
            </div>
          )}
        </div>
      )}

      {tab === 'history' && <HistoryTab />}
    </AppLayout>
  )
}
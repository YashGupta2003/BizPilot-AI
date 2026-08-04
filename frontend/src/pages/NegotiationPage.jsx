import { useState, useRef, useEffect } from 'react'
import {
  Swords, Send, Loader2, Trophy, CheckCircle2,
  AlertTriangle, BarChart3, RefreshCw, Clock, Zap
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import {
  getScenarios, startSession, sendNegotiationMessage,
  endSession, getNegotiationSessions
} from '../services/negotiationService'

const DIFFICULTY_COLORS = {
  easy: { bg: '#dcfce7', color: '#15803d', label: 'Easy' },
  medium: { bg: '#fef3c7', color: '#92400e', label: 'Medium' },
  hard: { bg: '#fee2e2', color: '#b91c1c', label: 'Hard' },
}

const GRADE_COLORS = {
  A: '#15803d', B: '#1d4ed8', C: '#92400e', D: '#b45309', F: '#b91c1c'
}

// ─── SCENARIO SELECTOR ───────────────────────────────────────────
function ScenarioSelector({ scenarios, onSelect }) {
  const [serviceType, setServiceType] = useState('Web Development')
  const [askingRate, setAskingRate] = useState(5000)
  const [selected, setSelected] = useState(null)
  const [starting, setStarting] = useState(false)

  async function handleStart() {
    if (!selected || starting) return
    setStarting(true)
    try {
      await onSelect(selected.id, serviceType, askingRate)
    } finally {
      setStarting(false)
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Your negotiation setup</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            What service are you selling?
          </label>
          <input className="input-field" value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="e.g. Logo Design, Web Development" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
            Your asking rate (₹)
          </label>
          <input className="input-field" type="number" value={askingRate}
            onChange={(e) => setAskingRate(Number(e.target.value))} />
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Choose your client</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 20 }}>
        {scenarios.map((s) => {
          const diff = DIFFICULTY_COLORS[s.difficulty] || DIFFICULTY_COLORS.medium
          const isSelected = selected?.id === s.id
          return (
            <div key={s.id} onClick={() => setSelected(s)} style={{
              padding: 16, borderRadius: 12, cursor: 'pointer',
              border: isSelected ? '2px solid #4f46e5' : '1px solid #e5e7eb',
              background: isSelected ? '#eef2ff' : 'var(--bg-card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</h3>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: diff.bg, color: diff.color }}>
                  {diff.label}
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>{s.description}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {s.tactics.map((t, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{t}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <button className="btn-primary" onClick={handleStart} disabled={!selected || starting}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px' }}>
        {starting ? <Loader2 size={18} className="spin" /> : <Swords size={18} />}
        {starting ? 'Starting...' : 'Start Negotiation Practice'}
      </button>
    </div>
  )
}

// ─── CHAT BUBBLE ─────────────────────────────────────────────────
function MessageBubble({ msg }) {
  if (msg.role === 'system') {
    return (
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '4px 12px', borderRadius: 999 }}>
          {msg.content}
        </span>
      </div>
    )
  }
  if (msg.role === 'coach') {
    return (
      <div style={{ margin: '8px 0', padding: '10px 14px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 10, display: 'flex', gap: 8 }}>
        <Zap size={16} color="#ca8a04" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 13, color: '#713f12', lineHeight: 1.5 }}>{msg.content}</p>
      </div>
    )
  }
  const isFreelancer = msg.role === 'freelancer'
  return (
    <div style={{ display: 'flex', justifyContent: isFreelancer ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      <div style={{
        maxWidth: '72%', padding: '10px 14px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.6,
        background: isFreelancer ? '#4f46e5' : 'var(--bg-card)',
        color: isFreelancer ? 'white' : 'var(--text-primary)',
        border: isFreelancer ? 'none' : '1px solid #e5e7eb',
      }}>
        {!isFreelancer && <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, fontWeight: 700 }}>CLIENT</p>}
        {msg.content}
      </div>
    </div>
  )
}

// ─── SCORE CARD ──────────────────────────────────────────────────
function ScoreCard({ score, onPlayAgain }) {
  if (!score) return null
  const dims = [
    { key: 'assertiveness', label: 'Assertiveness' },
    { key: 'professionalism', label: 'Professionalism' },
    { key: 'value_articulation', label: 'Value Articulation' },
    { key: 'pushback_handling', label: 'Pushback Handling' },
    { key: 'outcome_score', label: 'Outcome' },
  ]
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <Trophy size={32} color="#f59e0b" />
        <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>Session Complete!</h2>
        <div style={{ fontSize: 52, fontWeight: 900, color: GRADE_COLORS[score.grade] || '#4f46e5', lineHeight: 1.2 }}>
          {score.grade}
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Overall: {score.overall}/10</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        {dims.map((d) => {
          const val = score[d.key] || 0
          return (
            <div key={d.key} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{d.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{val}/10</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 99 }}>
                <div style={{ height: 6, borderRadius: 99, width: `${val * 10}%`, background: val >= 7 ? '#15803d' : val >= 5 ? '#f59e0b' : '#dc2626' }} />
              </div>
            </div>
          )
        })}
      </div>

      {score.strengths?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, color: '#15803d', display: 'flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle2 size={13} /> Strengths
          </h4>
          {score.strengths.map((s, i) => <p key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 3 }}>• {s}</p>)}
        </div>
      )}

      {score.improvements?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 5, color: '#b45309', display: 'flex', alignItems: 'center', gap: 5 }}>
            <AlertTriangle size={13} /> Areas to Improve
          </h4>
          {score.improvements.map((s, i) => <p key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 3 }}>• {s}</p>)}
        </div>
      )}

      <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>
        {score.final_verdict}
      </div>

      <button className="btn-primary" onClick={onPlayAgain}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <RefreshCw size={15} /> Practice Again
      </button>
    </div>
  )
}

// ─── ACTIVE CHAT ─────────────────────────────────────────────────
function NegotiationChat({ session, onEnd }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [messages, setMessages] = useState(session.messages || [])
  const [turnsRemaining, setTurnsRemaining] = useState(12)
  const [finalScore, setFinalScore] = useState(session.score || null)
  const [status, setStatus] = useState(session.status)
  const bottomRef = useRef(null)
  const sessionId = session.id || session.session_id

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || sending) return
    const msg = input.trim()
    setInput('')
    setSending(true)
    setMessages((m) => [...m, { role: 'freelancer', content: msg, timestamp: new Date().toISOString(), coach_triggered: false }])

    try {
      const result = await sendNegotiationMessage(sessionId, msg)
      setMessages((m) => [...m, ...result.new_messages.filter((nm) => nm.role !== 'freelancer')])
      setTurnsRemaining(result.turns_remaining ?? 12)
      if (result.status === 'completed') {
        setFinalScore(result.score)
        setStatus('completed')
      }
    } catch {
      setMessages((m) => [...m, { role: 'system', content: 'Error sending. Try again.', timestamp: new Date().toISOString(), coach_triggered: false }])
    } finally {
      setSending(false)
    }
  }

  async function handleEnd() {
    setSending(true)
    try {
      const result = await endSession(sessionId)
      setFinalScore(result.score)
      setStatus('completed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{session.scenario_name}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{session.service_type} · ₹{session.asking_rate?.toLocaleString('en-IN')}</p>
        </div>
        {status === 'active' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={13} /> {turnsRemaining} turns left
            </span>
            <button onClick={handleEnd} className="btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }}>
              End & Score
            </button>
          </div>
        )}
      </div>

      <div style={{ height: 420, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12, padding: '12px', marginBottom: 12, background: '#fafafa' }}>
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }}>
              <Loader2 size={16} className="spin" color="#9ca3af" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {status === 'active' ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input-field" placeholder="Type your response to the client..."
            value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} />
          <button className="btn-primary" onClick={handleSend} disabled={sending || !input.trim()}>
            {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          </button>
        </div>
      ) : (
        <ScoreCard score={finalScore} onPlayAgain={onEnd} />
      )}
    </div>
  )
}

// ─── PAST SESSIONS ────────────────────────────────────────────────
function PastSessions() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNegotiationSessions().then(setSessions).finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 24 }}><Loader2 size={24} className="spin" color="#4f46e5" /></div>
  if (!sessions.length) return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5, padding: 24 }}>No sessions yet. Start your first practice!</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sessions.map((s) => {
        const diff = DIFFICULTY_COLORS[s.scenario_difficulty] || DIFFICULTY_COLORS.medium
        return (
          <div key={s.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{s.scenario_name}</p>
                <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: diff.bg, color: diff.color }}>{diff.label}</span>
                {s.status === 'completed' && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 999, background: '#dcfce7', color: '#15803d' }}>Done</span>}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.service_type} · ₹{s.asking_rate?.toLocaleString('en-IN')} · {s.turn_count} turns</p>
            </div>
            {s.score && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: GRADE_COLORS[s.score.grade] || '#4f46e5' }}>{s.score.grade}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.score.overall}/10</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function NegotiationPage() {
  const [tab, setTab] = useState('practice')
  const [scenarios, setScenarios] = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getScenarios().then((d) => setScenarios(d.scenarios || [])).finally(() => setLoading(false))
  }, [])

  async function handleSelectScenario(scenarioId, serviceType, askingRate) {
    const session = await startSession({ scenario_id: scenarioId, service_type: serviceType, asking_rate: askingRate })
    setActiveSession(session)
  }

  return (
    <AppLayout>
      <h1 className="page-title">Negotiation Simulator</h1>
      <p className="page-subtitle">Practice negotiating with AI clients — get real-time coaching and a final score</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg-elevated)', padding: 6, borderRadius: 10, width: 'fit-content' }}>
        {[{ key: 'practice', label: 'Practice', icon: Swords }, { key: 'history', label: 'Past Sessions', icon: BarChart3 }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => { setTab(key); if (key === 'practice') setActiveSession(null) }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, background: tab === key ? '#4f46e5' : 'transparent', color: tab === key ? '#fff' : 'var(--text-muted)' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === 'practice' && (
          loading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><Loader2 size={28} className="spin" color="#4f46e5" /></div>
          ) : activeSession ? (
            <NegotiationChat session={activeSession} onEnd={() => setActiveSession(null)} />
          ) : (
            <ScenarioSelector scenarios={scenarios} onSelect={handleSelectScenario} />
          )
        )}
        {tab === 'history' && <PastSessions />}
      </div>
    </AppLayout>
  )
}
import { useState, useEffect } from 'react'
import {
  TrendingUp, Target, Loader2, Plus, Trash2,
  CheckCircle2, XCircle, Clock, Zap, BarChart3,
  AlertTriangle, RefreshCw
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import {
  logProposal, getWinRateInsights, predictWin,
  getProposals, deleteProposal
} from '../services/winrateService'
import { getClients } from '../services/clientService'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend
} from 'recharts'

const WIN_FACTORS = [
  "Strong portfolio shown", "Competitive pricing", "Quick response",
  "Personal referral", "Met before proposal", "Detailed scope",
  "Testimonials shared", "Had a discovery call",
]

const LOSS_REASONS = [
  "Price too high", "Chose another freelancer", "Client went in-house",
  "No response after sending", "Timeline didn't match", "Lost to agency",
  "Scope mismatch", "Client budget cut",
]

const SERVICE_TYPES = [
  'Web Development', 'Mobile App', 'Logo Design', 'Brand Identity',
  'UI/UX Design', 'Content Writing', 'SEO', 'Social Media',
  'Video Editing', 'Photography', 'Consulting', 'Data Analysis', 'Other',
]

const CLIENT_TYPES = [
  'Startup', 'Corporate', 'Individual', 'Agency',
  'NGO', 'Government', 'SME', 'Unknown',
]

function WinRateBar({ value, showLabel = true }) {
  const color = value >= 60 ? '#15803d' : value >= 40 ? '#d97706' : '#dc2626'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: 'var(--bg-elevated)', borderRadius: 99 }}>
        <div style={{ height: 8, borderRadius: 99, width: `${value}%`, background: color, transition: 'width 0.6s' }} />
      </div>
      {showLabel && <span style={{ fontSize: 13, fontWeight: 700, color, width: 40, textAlign: 'right' }}>{value}%</span>}
    </div>
  )
}

function ProbabilityGauge({ probability }) {
  const color = probability >= 60 ? '#15803d' : probability >= 40 ? '#d97706' : '#dc2626'
  const bg = probability >= 60 ? '#dcfce7' : probability >= 40 ? '#fef3c7' : '#fee2e2'
  const label = probability >= 60 ? 'High Chance' : probability >= 40 ? 'Moderate' : 'Low Chance'

  return (
    <div style={{ textAlign: 'center', padding: '24px', background: bg, borderRadius: 16 }}>
      <div style={{ fontSize: 56, fontWeight: 900, color, lineHeight: 1 }}>{probability}%</div>
      <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 4 }}>{label}</div>
      <div style={{ height: 10, background: 'rgba(255,255,255,0.6)', borderRadius: 99, marginTop: 12 }}>
        <div style={{ height: 10, borderRadius: 99, width: `${probability}%`, background: color, transition: 'width 1s' }} />
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Predicted win probability</p>
    </div>
  )
}

// ─── LOG PROPOSAL FORM ─────────────────────────────────────────
function LogProposalModal({ clients, onLogged, onClose }) {
  const [form, setForm] = useState({
    service_type: 'Web Development',
    amount: '',
    client_id: '',
    client_name: '',
    client_type: 'Unknown',
    outcome: 'won',
    days_to_close: '',
    win_factors: [],
    loss_reasons: [],
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function toggleFactor(list, item) {
    setForm(f => ({
      ...f,
      [list]: f[list].includes(item)
        ? f[list].filter(x => x !== item)
        : [...f[list], item],
    }))
  }

  function handleClientChange(clientId) {
    update('client_id', clientId)
    const c = clients.find(cl => cl.id === clientId)
    if (c) update('client_name', c.name)
  }

  async function handleSubmit() {
    if (!form.amount) { setError('Please enter the proposal amount.'); return }
    setLoading(true)
    setError('')
    try {
      await logProposal({
        ...form,
        amount: parseFloat(form.amount),
        days_to_close: form.days_to_close ? parseInt(form.days_to_close) : null,
      })
      onLogged()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to log proposal.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="card" style={{ width: 520, maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700 }}>Log Proposal Outcome</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Service Type</label>
            <select className="input-field" value={form.service_type} onChange={e => update('service_type', e.target.value)}>
              {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Proposal Amount (₹)</label>
            <input className="input-field" type="number" value={form.amount} onChange={e => update('amount', e.target.value)} placeholder="50000" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client</label>
            <select className="input-field" value={form.client_id} onChange={e => handleClientChange(e.target.value)}>
              <option value="">Select or type below</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client Type</label>
            <select className="input-field" value={form.client_type} onChange={e => update('client_type', e.target.value)}>
              {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Outcome</label>
            <select className="input-field" value={form.outcome} onChange={e => update('outcome', e.target.value)}>
              <option value="won">✅ Won</option>
              <option value="lost">❌ Lost</option>
              <option value="pending">⏳ Pending</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Days to close</label>
            <input className="input-field" type="number" value={form.days_to_close} onChange={e => update('days_to_close', e.target.value)} placeholder="e.g. 3" />
          </div>
        </div>

        {form.outcome === 'won' && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#15803d', display: 'block', marginBottom: 6 }}>Why did you win? (select all that apply)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {WIN_FACTORS.map(f => (
                <button key={f} onClick={() => toggleFactor('win_factors', f)}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', border: '1px solid', borderColor: form.win_factors.includes(f) ? '#15803d' : 'var(--border)', background: form.win_factors.includes(f) ? '#dcfce7' : 'var(--bg-card)', color: form.win_factors.includes(f) ? '#15803d' : 'var(--text-muted)' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {form.outcome === 'lost' && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#dc2626', display: 'block', marginBottom: 6 }}>Why did you lose? (select all that apply)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {LOSS_REASONS.map(r => (
                <button key={r} onClick={() => toggleFactor('loss_reasons', r)}
                  style={{ fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer', border: '1px solid', borderColor: form.loss_reasons.includes(r) ? '#dc2626' : 'var(--border)', background: form.loss_reasons.includes(r) ? '#fee2e2' : 'var(--bg-card)', color: form.loss_reasons.includes(r) ? '#dc2626' : 'var(--text-muted)' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Notes (optional)</label>
          <textarea className="input-field" rows={2} value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Any additional context..." style={{ resize: 'none' }} />
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 8 }}>{error}</p>}

        <button className="btn-primary" onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}>
          {loading ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
          {loading ? 'Saving...' : 'Save Proposal Outcome'}
        </button>
      </div>
    </div>
  )
}

// ─── PREDICT PANEL ────────────────────────────────────────────
function PredictPanel({ clients }) {
  const [form, setForm] = useState({
    service_type: 'Web Development',
    amount: '',
    client_id: '',
    client_type: 'Startup',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  function handleClientChange(id) {
    setForm(f => ({ ...f, client_id: id }))
  }

  async function handlePredict() {
    if (!form.amount) return
    setLoading(true)
    try {
      const res = await predictWin({
        service_type: form.service_type,
        amount: parseFloat(form.amount),
        client_type: form.client_type,
        client_id: form.client_id || null,
      })
      setResult(res)
    } catch (err) {
      console.error('Failed to predict:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Service Type</label>
          <select className="input-field" value={form.service_type} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}>
            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Proposal Amount (₹)</label>
          <input className="input-field" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="50000" />
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Select Client (optional)</label>
          <select className="input-field" value={form.client_id} onChange={e => handleClientChange(e.target.value)}>
            <option value="">Select for auto-detection</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client Type</label>
          <select className="input-field" value={form.client_type} onChange={e => setForm(f => ({ ...f, client_type: e.target.value }))}>
            {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <button className="btn-primary" onClick={handlePredict} disabled={loading || !form.amount}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', marginBottom: 16 }}>
        {loading ? <Loader2 size={16} className="spin" /> : <Zap size={16} />}
        {loading ? 'Predicting...' : 'Predict Win Probability'}
      </button>

      {result && (
        <div>
          <ProbabilityGauge probability={result.win_probability} />

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: result.confidence === 'HIGH' ? '#dcfce7' : result.confidence === 'MEDIUM' ? '#fef3c7' : 'var(--bg-elevated)', color: result.confidence === 'HIGH' ? '#15803d' : result.confidence === 'MEDIUM' ? '#92400e' : 'var(--text-muted)' }}>
              {result.confidence} confidence
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Client detected as: {result.client_type_used}</span>
          </div>

          {result.explanation?.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>BASED ON YOUR DATA</p>
              {result.explanation.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                  <BarChart3 size={13} color="#4f46e5" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{e}</p>
                </div>
              ))}
            </div>
          )}

          {result.recommendations?.length > 0 && (
            <div className="card">
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>RECOMMENDATIONS</p>
              {result.recommendations.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <CheckCircle2 size={13} color="#15803d" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── INSIGHTS PANEL ───────────────────────────────────────────
function InsightsPanel({ insights }) {
  if (!insights.has_data) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Target size={32} color="#9ca3af" />
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>{insights.message}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Log at least 3 proposals to see win rate patterns.</p>
      </div>
    )
  }

  const COLORS = ['#4f46e5', '#7c3aed', '#0891b2', '#15803d', '#d97706', '#dc2626']

  return (
    <div>
      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Proposals', value: insights.total_proposals, color: 'var(--brand)' },
          { label: 'Win Rate', value: `${insights.overall_win_rate}%`, color: '#15803d' },
          { label: 'Avg Won Deal', value: `₹${(insights.avg_deal_size_won || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#15803d' },
          { label: 'Avg Lost Deal', value: `₹${(insights.avg_deal_size_lost || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#dc2626' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card">
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {insights.best_performing_combo && (
        <div style={{ padding: '12px 16px', background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, marginBottom: 16, display: 'flex', gap: 8 }}>
          <Zap size={16} color="#4f46e5" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)', marginBottom: 2 }}>Your Sweet Spot</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{insights.best_performing_combo.combined_message}</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* By service type */}
        <div className="card">
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Win Rate by Service Type</h4>
          {insights.by_service_type.map((s, i) => (
            <div key={s.service_type} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{s.service_type}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.won}W / {s.lost}L</span>
              </div>
              <WinRateBar value={s.win_rate} />
            </div>
          ))}
        </div>

        {/* By client type */}
        <div className="card">
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Win Rate by Client Type</h4>
          {insights.by_client_type.map((c, i) => (
            <div key={c.client_type} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{c.client_type}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.won}W / {c.lost}L</span>
              </div>
              <WinRateBar value={c.win_rate} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* By price range */}
        <div className="card">
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Win Rate by Price Range</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={insights.by_price_range}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="win_rate" name="Win Rate" radius={[4, 4, 0, 0]}>
                {insights.by_price_range.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly trend */}
        <div className="card">
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Monthly Win Rate Trend</h4>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={insights.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="win_rate" stroke="#4f46e5" strokeWidth={2} name="Win Rate %" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Win/Loss factors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {insights.top_win_factors?.length > 0 && (
          <div className="card">
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#15803d' }}>
              <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 5 }} />
              Top Win Factors
            </h4>
            {insights.top_win_factors.map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{f.factor}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#15803d' }}>{f.count}×</span>
              </div>
            ))}
          </div>
        )}
        {insights.top_loss_factors?.length > 0 && (
          <div className="card">
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: '#dc2626' }}>
              <XCircle size={13} style={{ display: 'inline', marginRight: 5 }} />
              Top Loss Reasons
            </h4>
            {insights.top_loss_factors.map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{f.factor}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#dc2626' }}>{f.count}×</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PROPOSALS LIST ───────────────────────────────────────────
function ProposalsList({ proposals, onDelete }) {
  return (
    <div>
      {!proposals.length ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5, padding: 24 }}>No proposals logged yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {proposals.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{p.service_type}</p>
                  <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 999, background: p.outcome === 'won' ? '#dcfce7' : p.outcome === 'lost' ? '#fee2e2' : '#fef3c7', color: p.outcome === 'won' ? '#15803d' : p.outcome === 'lost' ? '#dc2626' : '#92400e', fontWeight: 700 }}>
                    {p.outcome === 'won' ? '✅ Won' : p.outcome === 'lost' ? '❌ Lost' : '⏳ Pending'}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {p.client_name} · {p.client_type} · ₹{p.amount?.toLocaleString('en-IN')}
                  {p.days_to_close ? ` · ${p.days_to_close} days` : ''}
                </p>
              </div>
              <button onClick={() => onDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <Trash2 size={14} color="#dc2626" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────
export default function WinRatePage() {
  const [tab, setTab] = useState('insights')
  const [insights, setInsights] = useState(null)
  const [proposals, setProposals] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLogModal, setShowLogModal] = useState(false)

  useEffect(() => {
    loadAll()
    getClients().then(setClients).catch(() => {})
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [ins, props] = await Promise.all([
        getWinRateInsights(),
        getProposals(),
      ])
      setInsights(ins)
      setProposals(props)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this proposal record?')) return
    try {
      await deleteProposal(id)
      setProposals(p => p.filter(x => x.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  async function handleLogged() {
    setShowLogModal(false)
    await loadAll()
  }

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Proposal Win Rate</h1>
          <p className="page-subtitle">ML-powered insights on which proposals win and why</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={loadAll} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowLogModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={15} /> Log Proposal
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg-elevated)', padding: 6, borderRadius: 10, width: 'fit-content' }}>
        {[
          { key: 'insights', label: 'Analytics', icon: BarChart3 },
          { key: 'predict', label: 'Win Predictor', icon: Zap },
          { key: 'proposals', label: 'All Proposals', icon: Target },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, background: tab === key ? '#4f46e5' : 'transparent', color: tab === key ? '#fff' : 'var(--text-muted)' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={28} className="spin" color="#4f46e5" />
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>Loading win rate data...</p>
          </div>
        ) : (
          <>
            {tab === 'insights' && insights && <InsightsPanel insights={insights} />}
            {tab === 'predict' && <PredictPanel clients={clients} />}
            {tab === 'proposals' && <ProposalsList proposals={proposals} onDelete={handleDelete} />}
          </>
        )}
      </div>

      {showLogModal && (
        <LogProposalModal
          clients={clients}
          onLogged={handleLogged}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </AppLayout>
  )
}
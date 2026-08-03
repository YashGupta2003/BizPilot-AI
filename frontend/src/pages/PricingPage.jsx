import { useState, useEffect } from 'react'
import {
  DollarSign, Loader2, Zap, TrendingUp, AlertTriangle,
  CheckCircle2, BarChart3, RefreshCw, Info
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { getPricingSuggestion, getPricingHistory } from '../services/pricingService'
import { getClients } from '../services/clientService'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const SERVICE_TYPES = [
  'Web Development', 'Mobile App', 'Logo Design', 'Brand Identity',
  'UI/UX Design', 'Content Writing', 'SEO', 'Social Media',
  'Video Editing', 'Photography', 'Consulting', 'Data Analysis', 'Other',
]
const CLIENT_TYPES = ['Corporate', 'Agency', 'SME', 'Startup', 'Individual', 'NGO', 'Government', 'Unknown']
const COMPLEXITIES = [
  { value: 'simple', label: 'Simple', desc: 'Basic, well-defined, few deliverables' },
  { value: 'standard', label: 'Standard', desc: 'Typical project scope' },
  { value: 'complex', label: 'Complex', desc: 'Multiple features, integrations' },
  { value: 'enterprise', label: 'Enterprise', desc: 'Large scale, long timeline' },
]

function fmt(n) {
  return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function ConfidenceBadge({ level }) {
  const colors = { HIGH: ['#dcfce7', '#15803d'], MEDIUM: ['#fef3c7', '#92400e'], LOW: ['#f3f4f6', '#6b7280'] }
  const [bg, text] = colors[level] || colors.LOW
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: bg, color: text }}>{level} confidence</span>
}

function PriceRangeVisual({ min, max, optimal, market }) {
  const globalMin = Math.min(min * 0.7, market.min)
  const globalMax = Math.max(max * 1.3, market.max)
  const range = globalMax - globalMin
  if (range <= 0) return null

  const toPercent = (v) => ((v - globalMin) / range) * 100

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ position: 'relative', height: 60, background: '#f3f4f6', borderRadius: 8, overflow: 'hidden' }}>
        {/* Market range */}
        <div style={{
          position: 'absolute', top: 4, height: 24, borderRadius: 4,
          background: '#e0e7ff', border: '1px solid #c7d2fe',
          left: `${toPercent(market.min)}%`,
          width: `${toPercent(market.max) - toPercent(market.min)}%`,
        }}>
          <span style={{ fontSize: 9, color: '#4f46e5', padding: '0 4px', lineHeight: '22px', display: 'block', overflow: 'hidden' }}>Market range</span>
        </div>
        {/* Your range */}
        <div style={{
          position: 'absolute', top: 32, height: 24, borderRadius: 4,
          background: '#dcfce7', border: '1px solid #86efac',
          left: `${toPercent(min)}%`,
          width: `${Math.max(1, toPercent(max) - toPercent(min))}%`,
        }}>
          <span style={{ fontSize: 9, color: '#15803d', padding: '0 4px', lineHeight: '22px', display: 'block', overflow: 'hidden' }}>Your range</span>
        </div>
        {/* Optimal marker */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, width: 3,
          background: '#4f46e5', borderRadius: 2,
          left: `${toPercent(optimal)}%`,
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(globalMin)}</span>
        <span style={{ fontSize: 11, color: '#4f46e5', fontWeight: 700 }}>Optimal: {fmt(optimal)}</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(globalMax)}</span>
      </div>
    </div>
  )
}

function SuggestionResult({ data }) {
  return (
    <div>
      {/* Main price card */}
      <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: 14, marginBottom: 16, color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 4 }}>RECOMMENDED RANGE</p>
            <p style={{ fontSize: 28, fontWeight: 900 }}>
              {fmt(data.recommended_min)} – {fmt(data.recommended_max)}
            </p>
            <p style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
              Optimal sweet spot: <strong>{fmt(data.optimal_price)}</strong>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <ConfidenceBadge level={data.confidence} />
            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>{data.data_points_used} data points</p>
          </div>
        </div>
      </div>

      <PriceRangeVisual
        min={data.recommended_min}
        max={data.recommended_max}
        optimal={data.optimal_price}
        market={data.market_range}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Market Typical', value: fmt(data.market_range.typical), color: '#6b7280' },
          { label: 'Your Win Range', value: data.your_win_range ? `${fmt(data.your_win_range.min)}–${fmt(data.your_win_range.max)}` : 'No data yet', color: '#15803d' },
          { label: 'Your Historical', value: data.historical_range ? fmt(data.historical_range.avg) : 'No data yet', color: '#1d4ed8' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center', background: '#f9fafb', borderRadius: 8, padding: '10px 8px' }}>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 3 }}>{label}</p>
            <p style={{ fontSize: 14, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Reasoning */}
      {data.reasoning?.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Why This Price</h4>
          {data.reasoning.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{r.icon}</span>
              <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{r.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Win rate analysis */}
      {data.win_rate_analysis?.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Win Rate by Price Range</h4>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={data.win_rate_analysis}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={v => `${v}%`} />
              <Bar dataKey="win_rate" name="Win Rate" radius={[4, 4, 0, 0]}>
                {data.win_rate_analysis.map((entry, i) => (
                  <Cell key={i} fill={entry.win_rate >= 60 ? '#15803d' : entry.win_rate >= 40 ? '#d97706' : '#dc2626'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Client signals */}
      {data.client_signals && (
        <div className="card">
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Client Signals Used</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { label: 'Past Projects', value: data.client_signals.past_projects },
              { label: 'Risk Score', value: `${data.client_signals.risk_score}/10` },
              { label: 'Disputes', value: data.client_signals.dispute_count },
              { label: 'LTV Score', value: `${data.client_signals.ltv_score}/100` },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f9fafb', borderRadius: 6, padding: '7px 10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PricingHistoryPanel({ history }) {
  if (!history?.has_data) {
    return <p style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No paid invoice data yet.</p>
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        <div className="card">
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Total Paid Projects</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#4f46e5' }}>{history.total_paid_projects}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Avg Project Value</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#15803d' }}>{fmt(history.avg_project_value)}</p>
        </div>
      </div>

      <div className="card">
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Your Pricing vs Market</h4>
        <table>
          <thead>
            <tr>
              <th>Service</th>
              <th>Your Avg</th>
              <th>Market</th>
              <th>vs Market</th>
              <th>Projects</th>
            </tr>
          </thead>
          <tbody>
            {history.by_service?.map((s, i) => (
              <tr key={i}>
                <td style={{ fontSize: 13 }}>{s.service_type}</td>
                <td style={{ fontWeight: 600 }}>{fmt(s.your_avg)}</td>
                <td style={{ color: '#6b7280' }}>{fmt(s.market_typical)}</td>
                <td>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.vs_market >= 0 ? '#15803d' : '#dc2626' }}>
                    {s.vs_market >= 0 ? '+' : ''}{s.vs_market}%
                  </span>
                </td>
                <td style={{ color: '#6b7280' }}>{s.project_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function PricingPage() {
  const [tab, setTab] = useState('suggest')
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({
    service_type: 'Web Development',
    client_type: 'Startup',
    complexity: 'standard',
    client_id: '',
    deliverable_count: 3,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState(null)

  useEffect(() => {
    getClients().then(setClients).catch(() => {})
    getPricingHistory().then(setHistory).catch(() => {})
  }, [])

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleClientChange(id) {
    update('client_id', id)
    const c = clients.find(cl => cl.id === id)
    if (c) update('client_name', c.name)
  }

  async function handleSuggest() {
    setLoading(true)
    setResult(null)
    try {
      const data = await getPricingSuggestion(form)
      setResult(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <h1 className="page-title">Smart Pricing Engine</h1>
      <p className="page-subtitle">AI-powered pricing based on your win rate, client type, and project complexity</p>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#f3f4f6', padding: 6, borderRadius: 10, width: 'fit-content' }}>
        {[
          { key: 'suggest', label: 'Get Price Suggestion', icon: Zap },
          { key: 'history', label: 'Pricing History', icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 8, fontSize: 14, border: 'none', cursor: 'pointer', fontWeight: tab === key ? 600 : 400, background: tab === key ? '#4f46e5' : 'transparent', color: tab === key ? '#fff' : '#6b7280' }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'suggest' && (
        <div style={{ display: 'grid', gridTemplateColumns: result ? '380px 1fr' : '480px', gap: 16, justifyContent: 'center' }}>
          <div className="card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Service Type</label>
                <select className="input-field" value={form.service_type} onChange={e => update('service_type', e.target.value)}>
                  {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Client</label>
                <select className="input-field" value={form.client_id} onChange={e => handleClientChange(e.target.value)}>
                  <option value="">Select client (optional)</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Client Type</label>
                <select className="input-field" value={form.client_type} onChange={e => update('client_type', e.target.value)}>
                  {CLIENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>Deliverables</label>
                <input className="input-field" type="number" min={1} max={20} value={form.deliverable_count} onChange={e => update('deliverable_count', parseInt(e.target.value))} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 6 }}>Project Complexity</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {COMPLEXITIES.map(c => (
                  <button key={c.value} onClick={() => update('complexity', c.value)}
                    style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', border: form.complexity === c.value ? '2px solid #4f46e5' : '1px solid #e5e7eb', background: form.complexity === c.value ? '#eef2ff' : 'white' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: form.complexity === c.value ? '#4f46e5' : '#374151' }}>{c.label}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af' }}>{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {form.client_id && (
              <div style={{ marginBottom: 12, padding: '8px 10px', background: '#eef2ff', borderRadius: 7, fontSize: 12.5, color: '#4338ca' }}>
                ✅ Client data loaded — risk profile, LTV, and dispute history will be used
              </div>
            )}

            <button className="btn-primary" onClick={handleSuggest} disabled={loading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}>
              {loading ? <Loader2 size={17} className="spin" /> : <Zap size={17} />}
              {loading ? 'Analyzing your data...' : 'Get Price Suggestion'}
            </button>
          </div>

          {result && <SuggestionResult data={result} />}
        </div>
      )}

      {tab === 'history' && <PricingHistoryPanel history={history} />}
    </AppLayout>
  )
}
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, Star, AlertTriangle, Users, DollarSign,
  Loader2, Crown, RefreshCw, ChevronRight, Zap, Clock
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { getLTVLeaderboard } from '../services/ltvService'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip
} from 'recharts'

const SEGMENT_STYLES = {
  Champion: { bg: '#dcfce7', text: '#15803d', border: '#86efac', icon: Crown },
  Loyal: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe', icon: Star },
  Promising: { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd', icon: TrendingUp },
  'At Risk': { bg: '#ffedd5', text: '#9a3412', border: '#fdba74', icon: AlertTriangle },
  'One-Time': { bg: 'var(--bg-elevated)', text: '#4b5563', border: 'var(--border-light)', icon: Users },
  New: { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd', icon: Clock },
}

const URGENCY_STYLES = {
  NOW: { bg: '#dcfce7', text: '#15803d', label: '🔥 Pitch Now' },
  SOON: { bg: '#dbeafe', text: '#1d4ed8', label: '💡 Pitch Soon' },
  'RE-ENGAGE': { bg: '#fef3c7', text: '#92400e', label: '📨 Re-engage First' },
  WAIT: { bg: 'var(--bg-elevated)', text: 'var(--text-muted)', label: '⏳ Build History' },
}

const CONFIDENCE_COLORS = {
  HIGH: '#15803d', MEDIUM: '#d97706', LOW: 'var(--text-muted)'
}

function formatCurrency(n) {
  return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function ScoreBar({ label, value, color = '#4f46e5' }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{value.toFixed(0)}</span>
      </div>
      <div style={{ height: 5, background: 'var(--bg-elevated)', borderRadius: 99 }}>
        <div style={{ height: 5, borderRadius: 99, width: `${Math.min(100, value)}%`, background: color }} />
      </div>
    </div>
  )
}

function ClientLTVCard({ client, rank }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const segStyle = SEGMENT_STYLES[client.segment] || SEGMENT_STYLES.New
  const SegIcon = segStyle.icon
  const retainer = client.retainer_tip
  const urgStyle = URGENCY_STYLES[retainer.urgency] || URGENCY_STYLES.WAIT

  const radarData = [
    { subject: 'Revenue', value: client.revenue_score },
    { subject: 'Frequency', value: client.frequency_score },
    { subject: 'Recency', value: client.recency_score },
    { subject: 'Payment', value: client.payment_score },
    { subject: 'Engagement', value: client.engagement_score },
  ]

  return (
    <div style={{ border: `1px solid ${segStyle.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
      {/* Main row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--bg-card)', cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        {/* Rank */}
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: rank <= 3 ? '#fef3c7' : 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: rank <= 3 ? '#92400e' : 'var(--text-muted)' }}>#{rank}</span>
        </div>

        {/* Name + segment */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <p style={{ fontSize: 15, fontWeight: 700 }}>{client.client_name}</p>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: segStyle.bg, color: segStyle.text, display: 'flex', alignItems: 'center', gap: 4 }}>
              <SegIcon size={11} />{client.segment}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {client.paid_count} project{client.paid_count !== 1 ? 's' : ''} · avg {formatCurrency(client.avg_project_value)} · every {client.avg_days_between_projects > 0 ? `${Math.round(client.avg_days_between_projects)}d` : 'N/A'}
          </p>
        </div>

        {/* Predicted value */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Predicted 12m</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{formatCurrency(client.predicted_12m_value)}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: CONFIDENCE_COLORS[client.confidence] }} />
            <p style={{ fontSize: 11, color: CONFIDENCE_COLORS[client.confidence] }}>{client.confidence} confidence</p>
          </div>
        </div>

        {/* LTV score circle */}
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: segStyle.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${segStyle.border}` }}>
          <span style={{ fontSize: 16, fontWeight: 900, color: segStyle.text, lineHeight: 1 }}>{Math.round(client.ltv_score)}</span>
          <span style={{ fontSize: 9, color: segStyle.text }}>LTV</span>
        </div>

        <ChevronRight size={16} color="#9ca3af" style={{ transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${segStyle.border}`, background: '#fafafa', padding: '14px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {/* Score breakdown */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>Score Breakdown</p>
              <ScoreBar label="Revenue" value={client.revenue_score} color="#4f46e5" />
              <ScoreBar label="Frequency" value={client.frequency_score} color="#7c3aed" />
              <ScoreBar label="Recency" value={client.recency_score} color="#0891b2" />
              <ScoreBar label="Payment" value={client.payment_score} color="#15803d" />
              <ScoreBar label="Engagement" value={client.engagement_score} color="#d97706" />
            </div>

            {/* Radar chart */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>Profile Radar</p>
              <ResponsiveContainer width="100%" height={150}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <Radar dataKey="value" stroke={segStyle.text} fill={segStyle.bg} fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Retainer recommendation */}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase' }}>Retainer Recommendation</p>
              <div style={{ padding: '10px 12px', borderRadius: 8, background: urgStyle.bg, marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: urgStyle.text }}>{urgStyle.label}</span>
                <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>{retainer.message}</p>
                {retainer.suggested_retainer_amount && (
                  <p style={{ fontSize: 13, fontWeight: 700, color: urgStyle.text, marginTop: 6 }}>
                    Suggested: {formatCurrency(retainer.suggested_retainer_amount)}/month
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Growth: <span style={{ fontWeight: 600, color: client.growth_trajectory === 'growing' ? '#15803d' : client.growth_trajectory === 'declining' ? '#dc2626' : 'var(--text-muted)' }}>
                    {client.growth_trajectory} ({client.growth_factor}×)
                  </span>
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Disputes: {client.dispute_count} · Reminders needed: {client.reminder_count}
                  {client.has_risk_profile && ' · Risk profile: ✅'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button onClick={() => navigate(`/clients/${client.client_id}`)}
                  className="btn-secondary"
                  style={{ flex: 1, fontSize: 11, padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  View 360°
                </button>
                <button onClick={() => navigate('/negotiate')}
                  className="btn-primary"
                  style={{ flex: 1, fontSize: 11, padding: '6px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Zap size={11} /> Practice Pitch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryBanner({ data }) {
  const { total_predicted_12m, champions, at_risk, retainer_candidates, total_clients } = data

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {[
        { label: 'Total Predicted Revenue (12m)', value: formatCurrency(total_predicted_12m), color: 'var(--brand)', icon: DollarSign },
        { label: 'Champion Clients', value: champions?.length || 0, color: '#15803d', icon: Crown },
        { label: 'At-Risk Clients', value: at_risk?.length || 0, color: '#dc2626', icon: AlertTriangle },
        { label: 'Retainer Candidates', value: retainer_candidates?.length || 0, color: '#d97706', icon: Zap },
      ].map(({ label, value, color, icon: Icon }) => (
        <div key={label} className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Icon size={14} color={color} />
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color }}>{value}</p>
        </div>
      ))}
    </div>
  )
}

export default function LTVPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await getLTVLeaderboard()
      setData(result)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load LTV predictions.')
    } finally {
      setLoading(false)
    }
  }

  const segments = ['all', 'Champion', 'Loyal', 'Promising', 'At Risk', 'One-Time', 'New']

  const filtered = data?.leaderboard?.filter(c =>
    filter === 'all' || c.segment === filter
  ) || []

  if (loading) return (
    <AppLayout>
      <h1 className="page-title">Client LTV Predictor</h1>
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Loader2 size={32} className="spin" color="#4f46e5" />
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>
          Analyzing all client data — invoices, contracts, meetings, disputes...
        </p>
      </div>
    </AppLayout>
  )

  if (error) return (
    <AppLayout>
      <h1 className="page-title">Client LTV Predictor</h1>
      <div className="card" style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: '#dc2626', fontSize: 14 }}>{error}</p>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Client LTV Predictor</h1>
          <p className="page-subtitle">
            AI-scored client leaderboard — ranked by predicted 12-month value, not just past revenue
          </p>
        </div>
        <button onClick={load} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {data && <SummaryBanner data={data} />}

      {/* Segment filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {segments.map((seg) => {
          const style = seg === 'all' ? null : SEGMENT_STYLES[seg]
          const count = seg === 'all'
            ? data?.leaderboard?.length || 0
            : data?.leaderboard?.filter(c => c.segment === seg).length || 0
          return (
            <button key={seg} onClick={() => setFilter(seg)}
              style={{
                padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                border: filter === seg ? `2px solid ${style?.text || '#4f46e5'}` : '1px solid #e5e7eb',
                background: filter === seg ? (style?.bg || '#eef2ff') : 'var(--bg-card)',
                color: filter === seg ? (style?.text || '#4f46e5') : 'var(--text-muted)',
                cursor: 'pointer',
              }}>
              {seg === 'all' ? 'All' : seg} ({count})
            </button>
          )
        })}
      </div>

      {/* Leaderboard */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Users size={32} color="#9ca3af" />
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>
            No clients in this segment yet.
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((client) => (
            <ClientLTVCard key={client.client_id} client={client} rank={client.rank} />
          ))}
        </div>
      )}
    </AppLayout>
  )
}
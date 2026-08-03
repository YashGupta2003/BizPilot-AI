import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity, Loader2, RefreshCw, ChevronRight,
  AlertTriangle, CheckCircle2, TrendingUp, Users
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import { getAllHealthScores } from '../services/healthService'

const HEALTH_STYLES = {
  Champion: { bg: '#dcfce7', border: '#86efac', text: '#15803d', bar: '#22c55e' },
  Healthy:  { bg: '#dbeafe', border: '#bfdbfe', text: '#1d4ed8', bar: '#3b82f6' },
  Caution:  { bg: '#fef3c7', border: '#fde68a', text: '#92400e', bar: '#eab308' },
  'At Risk':{ bg: '#ffedd5', border: '#fdba74', text: '#9a3412', bar: '#f97316' },
  Avoid:    { bg: '#fee2e2', border: '#fecaca', text: '#b91c1c', bar: '#ef4444' },
}

function fmt(n) {
  return `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function ScoreBar({ label, value, max, color }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 11, color: '#6b7280' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600 }}>{value}/{max}</span>
      </div>
      <div style={{ height: 4, background: '#f3f4f6', borderRadius: 99 }}>
        <div style={{ height: 4, borderRadius: 99, width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  )
}

function ClientHealthCard({ client, rank }) {
  const [expanded, setExpanded] = useState(false)
  const navigate = useNavigate()
  const style = HEALTH_STYLES[client.health_label] || HEALTH_STYLES.Caution

  return (
    <div style={{ border: `1px solid ${style.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ padding: '14px 16px', background: style.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
        onClick={() => setExpanded(!expanded)}>
        {/* Rank */}
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: style.text }}>#{rank}</span>
        </div>

        {/* Avatar */}
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: style.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>{client.client_name[0]}</span>
        </div>

        {/* Name + label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <p style={{ fontSize: 15, fontWeight: 700 }}>{client.client_name}</p>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'white', color: style.text }}>
              {client.health_emoji} {client.health_label}
            </span>
            {!client.should_take_new_work && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: '#fee2e2', color: '#b91c1c' }}>
                ⚠️ Decline new work
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: '#6b7280' }}>
            {client.paid_count} paid · {fmt(client.total_paid_amount)} total ·
            {client.overdue_count > 0 && <span style={{ color: '#dc2626' }}> {client.overdue_count} overdue ·</span>}
            {client.dispute_count > 0 && <span style={{ color: '#dc2626' }}> {client.dispute_count} dispute(s) ·</span>}
            {client.escalation_count > 0 && <span style={{ color: '#b91c1c' }}> escalated ·</span>}
          </p>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: style.text, lineHeight: 1 }}>{client.health_score}</div>
          <div style={{ fontSize: 10, color: style.text }}>/ 100</div>
        </div>

        <ChevronRight size={16} color={style.text} style={{ flexShrink: 0, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
      </div>

      {expanded && (
        <div style={{ background: 'white', padding: '14px 16px', borderTop: `1px solid ${style.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <h5 style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase' }}>Score Breakdown</h5>
              <ScoreBar label="Payment" value={client.payment_score} max={30} color={style.bar} />
              <ScoreBar label="Loyalty" value={client.loyalty_score} max={20} color={style.bar} />
              <ScoreBar label="Professional" value={client.professional_score} max={20} color={style.bar} />
              <ScoreBar label="Communication" value={client.communication_score} max={15} color={style.bar} />
              <ScoreBar label="Growth" value={client.growth_score} max={15} color={style.bar} />
              {client.risk_penalty > 0 && (
                <p style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Risk penalty: -{client.risk_penalty} pts</p>
              )}
            </div>

            <div>
              {client.red_flags?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <h5 style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', marginBottom: 6 }}>🚩 Red Flags</h5>
                  {client.red_flags.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 4 }}>
                      <AlertTriangle size={12} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 12, color: '#374151' }}>{f}</p>
                    </div>
                  ))}
                </div>
              )}

              {client.green_flags?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <h5 style={{ fontSize: 12, fontWeight: 700, color: '#15803d', marginBottom: 6 }}>✅ Green Flags</h5>
                  {client.green_flags.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 5, marginBottom: 4 }}>
                      <CheckCircle2 size={12} color="#15803d" style={{ flexShrink: 0, marginTop: 1 }} />
                      <p style={{ fontSize: 12, color: '#374151' }}>{f}</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ padding: '8px 10px', background: style.bg, borderRadius: 8, fontSize: 13, color: style.text, fontWeight: 500 }}>
                💡 {client.action_recommendation}
              </div>

              <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                <button onClick={() => navigate(`/clients/${client.client_id}`)}
                  className="btn-secondary" style={{ flex: 1, fontSize: 11, padding: '6px 8px' }}>
                  View 360°
                </button>
                <button onClick={() => navigate(`/ltv`)}
                  className="btn-secondary" style={{ flex: 1, fontSize: 11, padding: '6px 8px' }}>
                  LTV Analysis
                </button>
                {!client.should_take_new_work && (
                  <button onClick={() => navigate('/disputes')}
                    className="btn-primary" style={{ flex: 1, fontSize: 11, padding: '6px 8px', background: '#dc2626' }}>
                    Resolve Issues
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HealthDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const result = await getAllHealthScores()
      setData(result)
    } finally {
      setLoading(false)
    }
  }

  const segments = ['all', 'Champion', 'Healthy', 'Caution', 'At Risk', 'Avoid']
  const filtered = data?.scores?.filter(c => filter === 'all' || c.health_label === filter) || []

  return (
    <AppLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h1 className="page-title">Client Health Dashboard</h1>
          <p className="page-subtitle">Real-time health scores for every client — who to prioritize, who to avoid</p>
        </div>
        <button onClick={load} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={32} className="spin" color="#4f46e5" />
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 12 }}>
            Analyzing all client data — invoices, disputes, reminders, scope drift...
          </p>
        </div>
      ) : !data?.total_clients ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <Users size={32} color="#9ca3af" />
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 12 }}>Add clients to see their health scores.</p>
        </div>
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total Clients', value: data.total_clients, color: '#4f46e5', icon: Users },
              { label: 'Avg Health Score', value: `${data.avg_health}/100`, color: '#15803d', icon: Activity },
              { label: 'Champions', value: data.champions_count, color: '#15803d', icon: CheckCircle2 },
              { label: 'At Risk / Avoid', value: data.at_risk_count, color: '#dc2626', icon: AlertTriangle },
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

          {/* Segment filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {segments.map(seg => {
              const style = seg !== 'all' ? HEALTH_STYLES[seg] : null
              const count = seg === 'all'
                ? data.scores.length
                : data.scores.filter(c => c.health_label === seg).length
              return (
                <button key={seg} onClick={() => setFilter(seg)}
                  style={{ padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: filter === seg ? `2px solid ${style?.text || '#4f46e5'}` : '1px solid #e5e7eb', background: filter === seg ? (style?.bg || '#eef2ff') : 'white', color: filter === seg ? (style?.text || '#4f46e5') : '#6b7280' }}>
                  {seg === 'all' ? 'All' : seg} ({count})
                </button>
              )
            })}
          </div>

          <div>
            {filtered.map((client, i) => (
              <ClientHealthCard key={client.client_id} client={client} rank={i + 1} />
            ))}
          </div>
        </>
      )}
    </AppLayout>
  )
}